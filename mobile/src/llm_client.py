"""
llm_client.py
Mobile equivalent of web/src/llmClient.js

Responsibility:
  - call_llm(prompt, response_format="action") → dict | str
        response_format="action" -> normalised action dict (exploration steps)
        response_format="raw"    -> raw text response, untouched (test-case JSON arrays)
  - parse_action(response)        → dict   safe parse with fallback
  - execute_action(driver, action, elements) → performs tap/type on device

Environment variables:
  STUB_LLM=true          — run without real LLM (returns done action / [] for raw)
  LLM_PROVIDER=openai     — which LLM backend to use (openai | gemini)
  OPENAI_API_KEY=...      — required when LLM_PROVIDER=openai
  OPENAI_MODEL=...        — optional, defaults to gpt-4o-mini
  GEMINI_API_KEY=...      — required when LLM_PROVIDER=gemini
  GEMINI_MODEL=...        — optional, defaults to gemini-2.0-flash
"""

import json
import os
import time

# .env loading (if present) happens once in explore_mobile.py's entrypoint —
# by the time this module runs, os.environ already has the values.

STUB_MODE = os.environ.get("STUB_LLM", "false").lower() == "true"
LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "openai").lower()


# ── Public API ────────────────────────────────────────────────────────────────

def call_llm(prompt: str, response_format: str = "action"):
    """
    Sends prompt to the configured LLM.

    Args:
        prompt: Exploration or test-case prompt string
        response_format:
            "action" -> returns a normalised action dict (used by explore_mobile.py)
            "raw"    -> returns the raw text response, untouched
                        (used by test_generator.py, which expects a JSON array)

    Returns:
        dict (response_format="action") or str (response_format="raw")

    Raises:
        RuntimeError: if LLM call fails and STUB_MODE is off, or provider unknown
    """
    if STUB_MODE:
        if response_format == "raw":
            print("[llm_client] STUB MODE — returning empty test-case array")
            return "[]"
        print("[llm_client] STUB MODE — returning dummy done action")
        return {
            "action": "done",
            "elementId": None,
            "resource_id": "",
            "value": "",
            "reason": "Stub mode active — LLM not wired yet",
        }

    if LLM_PROVIDER == "openai":
        raw_text = _call_openai_raw(prompt)
    elif LLM_PROVIDER == "gemini":
        raw_text = _call_gemini_raw(prompt)
    else:
        raise RuntimeError(
            f"[llm_client] Unknown LLM_PROVIDER='{LLM_PROVIDER}'. "
            "Set STUB_LLM=true, or LLM_PROVIDER=openai / gemini."
        )

    if response_format == "raw":
        return raw_text

    return parse_action(raw_text)


def parse_action(response) -> dict:
    """
    Safely parses raw LLM response (string or dict) into an action dict.
    Returns a safe fallback on parse failure.
    Mirrors parseAction() in llmClient.js.

    Args:
        response: Raw LLM response (dict or JSON string)

    Returns:
        Action dict with keys: action, elementId, resource_id, value, reason
    """
    if STUB_MODE:
        return {
            "action": "done",
            "elementId": None,
            "resource_id": "",
            "value": "",
            "reason": "stub",
        }

    if isinstance(response, dict):
        return _normalise_action(response)

    # Try direct parse
    try:
        parsed = json.loads(response)
        return _normalise_action(parsed)
    except (json.JSONDecodeError, TypeError):
        pass

    # Strip markdown fences and retry
    cleaned = str(response)
    for fence in ["```json", "```"]:
        cleaned = cleaned.replace(fence, "")
    cleaned = cleaned.strip()

    try:
        parsed = json.loads(cleaned)
        return _normalise_action(parsed)
    except (json.JSONDecodeError, TypeError) as e:
        print(f"[llm_client] parse_action failed: {e} — returning done fallback")
        return {
            "action": "done",
            "elementId": None,
            "resource_id": "",
            "value": "",
            "reason": "parse_error",
        }


def execute_action(driver, action: dict, elements: list) -> None:
    """
    Executes a parsed action on the Android device via Appium.
    Mirrors executeAction() in llmClient.js.

    Supported actions:
      tap   — find element by resource_id or elementId, tap it
      type  — find element, clear it, type value
      swipe — simple upward swipe (for scrolling)
      done  — no-op

    Args:
        driver:   Appium WebDriver instance
        action:   Parsed action dict from parse_action()
        elements: Current preprocessed element list (for elementId lookup)

    Raises:
        RuntimeError: if element cannot be found
    """
    action_type = action.get("action", "done")

    if action_type == "done":
        return

    if action_type == "swipe":
        _do_swipe(driver)
        return

    # Resolve element — prefer resource_id, fall back to elementId lookup
    element = _find_element(driver, action, elements)
    if element is None:
        raise RuntimeError(
            f"[llm_client] Could not find element for action: {action}"
        )

    if action_type == "tap":
        element.click()

    elif action_type == "type":
        value = action.get("value", "")
        element.clear()
        element.send_keys(value)

    else:
        print(f"[llm_client] Unknown action type '{action_type}' — skipping")


# ── Private helpers ───────────────────────────────────────────────────────────

def _call_openai_raw(prompt: str) -> str:
    """Calls OpenAI chat completions API and returns the raw text content."""
    try:
        import openai  # lazy import — only needed when LLM_PROVIDER=openai
    except ImportError:
        raise RuntimeError(
            "[llm_client] openai package not installed. Run: pip install openai"
        )

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "[llm_client] OPENAI_API_KEY environment variable not set."
        )

    model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
    client = openai.OpenAI(api_key=api_key)

    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )

    return response.choices[0].message.content


def _call_gemini_raw(prompt: str) -> str:
    """Calls Gemini generateContent API and returns the raw text content.

    NOTE: the old `google-generativeai` package and `gemini-2.0-flash` model
    are both fully retired (as of mid-2026). This uses the current unified
    `google-genai` SDK instead: pip install google-genai

    Retries a few times on transient 503 UNAVAILABLE ("high demand") errors
    before giving up, since those are Google-side blips, not real failures -
    without this, a single overload spike burns an entire exploration step.
    """
    try:
        from google import genai
    except ImportError:
        raise RuntimeError(
            "[llm_client] google-genai package not installed. "
            "Run: pip install google-genai\n"
            "(Note: the old `google-generativeai` package is retired — "
            "uninstall it with `pip uninstall google-generativeai` if present.)"
        )

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "[llm_client] GEMINI_API_KEY environment variable not set."
        )

    # "gemini-flash-latest" is a Google-maintained alias that always points
    # at the current live flash model, so this survives future retirements
    # without needing a code change. Override with GEMINI_MODEL if you want
    # to pin a specific version instead.
    model_name = os.environ.get("GEMINI_MODEL", "gemini-flash-latest")
    client = genai.Client(api_key=api_key)

    max_retries = 3
    backoff_seconds = 5

    for attempt in range(1, max_retries + 1):
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config={"temperature": 0.2},
            )
            return response.text
        except Exception as e:
            is_transient = "503" in str(e) or "UNAVAILABLE" in str(e)
            if is_transient and attempt < max_retries:
                print(
                    f"[llm_client] Gemini overloaded (attempt {attempt}/{max_retries}), "
                    f"retrying in {backoff_seconds}s..."
                )
                time.sleep(backoff_seconds)
                backoff_seconds *= 2
                continue
            raise


def _normalise_action(d: dict) -> dict:
    """Ensures all expected keys exist with safe defaults."""
    return {
        "action":      d.get("action", "done"),
        "elementId":   d.get("elementId"),
        "resource_id": d.get("resource_id", ""),
        "value":       d.get("value", ""),
        "reason":      d.get("reason", ""),
    }


def _find_element(driver, action: dict, elements: list):
    """
    Tries to locate an Appium WebElement using resource_id first,
    then falls back to elementId-based bounds tap.

    Returns WebElement or None.
    """
    from appium.webdriver.common.appiumby import AppiumBy

    resource_id = (action.get("resource_id") or "").strip()
    if resource_id:
        try:
            return driver.find_element(AppiumBy.ID, resource_id)
        except Exception:
            pass

    # Fallback: look up element in our list by elementId and use bounds
    element_id = action.get("elementId")
    if element_id is not None:
        match = next((el for el in elements if el["elementId"] == element_id), None)
        if match and match.get("resource_id"):
            try:
                return driver.find_element(AppiumBy.ID, match["resource_id"])
            except Exception:
                pass
        if match and match.get("text"):
            try:
                return driver.find_element(AppiumBy.ANDROID_UIAUTOMATOR,
                    f'new UiSelector().text("{match["text"]}")')
            except Exception:
                pass

    return None


def _do_swipe(driver) -> None:
    """Performs a simple upward swipe to scroll down."""
    size = driver.get_window_size()
    w, h = size["width"], size["height"]
    driver.swipe(
        start_x=w // 2, start_y=int(h * 0.75),
        end_x=w // 2,   end_y=int(h * 0.25),
        duration=500,
    )
    time.sleep(0.5)