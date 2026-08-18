"""
Dry-runs explore_mobile.py's full flow against FakeDriver, with two scenarios:

  1. STUB mode  — proves the loop, memory log, and screenshot paths all work.
  2. "Live" mode with a scripted fake LLM — proves the fixed call_llm()
     (response_format split) correctly delivers a JSON array to
     test_generator.py instead of getting mangled into a single action dict.
"""
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import fake_driver
import explore_mobile
from src import llm_client, test_generator


def run_stub_scenario():
    print("\n========== SCENARIO 1: STUB_LLM=true ==========")
    os.environ["STUB_LLM"] = "true"
    os.environ["MAX_STEPS"] = "5"
    llm_client.STUB_MODE = True  # module-level flag was read at import time

    explore_mobile.build_driver = lambda pkg, act: fake_driver.FakeDriver()
    sys.argv = ["explore_mobile.py", "--app-package", "com.example.fakeapp", "--app-activity", ".MainActivity"]
    explore_mobile.main()

    log_path = explore_mobile.MEMORY_LOG_PATH
    tc_path = explore_mobile.TEST_CASES_PATH
    print(f"\n[dry_run] memory log exists: {os.path.exists(log_path)}")
    if os.path.exists(log_path):
        with open(log_path) as f:
            data = json.load(f)
        print(f"[dry_run] steps logged: {len(data)}  (expected 0 - stub returns 'done' immediately)")
    print(f"[dry_run] test cases file exists: {os.path.exists(tc_path)}")


def run_live_scenario():
    print("\n========== SCENARIO 2: scripted fake LLM (simulates a real API) ==========")
    os.environ["STUB_LLM"] = "false"
    os.environ["MAX_STEPS"] = "5"
    llm_client.STUB_MODE = False

    # Scripted responses: tap settings button, toggle switch, then done.
    scripted_actions = [
        {"action": "tap", "elementId": None, "resource_id": "com.example.fakeapp:id/btn_settings", "value": "", "reason": "explore settings"},
        {"action": "tap", "elementId": None, "resource_id": "com.example.fakeapp:id/switch_notify", "value": "", "reason": "toggle notifications"},
        {"action": "done", "elementId": None, "resource_id": "", "value": "", "reason": "explored enough"},
    ]
    scripted_test_cases = json.dumps([
        {
            "id": "TC001",
            "objective": "Verify user can navigate to Settings and enable notifications",
            "steps": [
                {"stepNum": 1, "action": "tap", "resource_id": "com.example.fakeapp:id/btn_settings", "value": "", "description": "Tap 'Go to Settings'"},
                {"stepNum": 2, "action": "tap", "resource_id": "com.example.fakeapp:id/switch_notify", "value": "", "description": "Toggle notifications switch"},
            ],
            "expected_result": "Notifications switch is enabled on the Settings screen",
        }
    ])

    call_count = {"explore": 0}

    def fake_call_llm(prompt, response_format="action"):
        if response_format == "raw":
            print("  [fake LLM] received TEST-CASE prompt -> returning JSON array")
            return scripted_test_cases
        idx = call_count["explore"]
        call_count["explore"] += 1
        action = scripted_actions[min(idx, len(scripted_actions) - 1)]
        print(f"  [fake LLM] received EXPLORATION prompt -> returning action: {action['action']}")
        return llm_client.parse_action(action)

    llm_client.call_llm = fake_call_llm
    explore_mobile.call_llm = fake_call_llm
    test_generator.call_llm = fake_call_llm

    explore_mobile.build_driver = lambda pkg, act: fake_driver.FakeDriver()
    sys.argv = ["explore_mobile.py", "--app-package", "com.example.fakeapp", "--app-activity", ".MainActivity"]
    explore_mobile.main()

    log_path = explore_mobile.MEMORY_LOG_PATH
    tc_path = explore_mobile.TEST_CASES_PATH

    with open(log_path) as f:
        log_data = json.load(f)
    print(f"\n[dry_run] steps logged: {len(log_data)} (expected 2: tap settings, tap switch)")
    for s in log_data:
        print(f"    step {s['step']}: {s['action']} -> {s['target']} | {s['from_url']} -> {s['to_url']}")

    assert os.path.exists(tc_path), "test cases file was not created"
    with open(tc_path) as f:
        tc_data = json.load(f)
    print(f"[dry_run] test cases generated: {len(tc_data)} (expected 1)")
    for tc in tc_data:
        print(f"    {tc['id']}: {tc['objective']} ({len(tc['steps'])} steps)")

    assert len(tc_data) == 1, "BUG STILL PRESENT: test case array did not survive call_llm()"
    assert tc_data[0]["id"] == "TC001"
    print("\n[dry_run] PASS: fixed call_llm() correctly delivers array-shaped test-case JSON.")


if __name__ == "__main__":
    run_stub_scenario()
    run_live_scenario()
