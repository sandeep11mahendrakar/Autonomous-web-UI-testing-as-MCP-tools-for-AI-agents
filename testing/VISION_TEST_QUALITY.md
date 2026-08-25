# Vision Test-Case Quality Report

Generated: 2026-08-25T09:16:53.858Z — deterministic aggregation over ALL
campaign runs with B replay results. Every number traces to artifacts.

## Rubric summary

```text
Total B test cases executed:   76
Passed:                        57 (75%)
Verification strength:
  STRONG (value-level asserts): 36
  MEDIUM (state-change):        33
  WEAK   (body-text fallback):  7
Total steps executed:          343
  fill actions (value writes): 107
Targets re-detected on state:  307
Stale coordinates prevented:   10
Unresolved targets (honest):   16
```

Interpretation: STRONG = the test asserted a VALUE (field contents, dropdown
selection, checked state) and matched it — the highest quality class.
WEAK = pass rested on page-body heuristics; counted honestly against us.

## Per-test ledger

| Run | Test | Class | Status | Steps | Fills | Re-detected | Objective |
|---|---|---|---|---|---|---|---|
| 143010 | TC01 | MEDIUM | FAIL | 2 | 0 | 0 | Verify clicking the TOOLS logo navigates to home page |
| 143010 | TC02 | MEDIUM | FAIL | 2 | 0 | 0 | Verify clicking the 'practice.' link navigates to practice section |
| 143010 | TC03 | MEDIUM | PASS | 2 | 0 | 0 | Verify footer links 'RIGHTS' and 'RESERVED.' do not cause navigation |
| 143010 | TC04 | MEDIUM | PASS | 2 | 0 | 0 | Verify scrolling then clicking 'RIGHTS' stays on same page |
| 143010 | TC05 | MEDIUM | PASS | 2 | 0 | 0 | Verify scrolling then clicking 'RESERVED.' stays on same page |
| 145821 | TC01 | MEDIUM | PASS | 2 | 0 | 0 | Verify that clicking the Elements link navigates to the Elements section |
| 145821 | TC02 | MEDIUM | PASS | 2 | 0 | 0 | Verify that clicking JOIN N button shows in‑page confirmation without navigation |
| 145821 | TC03 | MEDIUM | PASS | 2 | 0 | 0 | Navigate via Forms link then trigger JOIN N button |
| 145821 | TC04 | MEDIUM | PASS | 2 | 0 | 0 | Verify Alerts, Frame & Windows link scrolls page without navigation |
| 145821 | TC05 | MEDIUM | PASS | 2 | 0 | 0 | Test navigation from Widgets to Reserved link |
| 193916 | TC01 | MEDIUM | PASS | 2 | 0 | 2 | Verify navigation to Elements section |
| 193916 | TC02 | MEDIUM | FAIL | 2 | 0 | 1 | Verify navigation to Forms and ability to join |
| 193916 | TC03 | MEDIUM | PASS | 2 | 0 | 2 | Verify JOIN N button triggers in‑page action without navigation |
| 193916 | TC04 | MEDIUM | PASS | 2 | 0 | 2 | Verify navigation to Alerts, Frame & Windows section |
| 193916 | TC05 | MEDIUM | FAIL | 2 | 0 | 1 | Verify sequential navigation between Interactions and Widgets |
| 124436 | TC01 | WEAK | FAIL | 1 | 0 | 0 | Replays an autonomously discovered visual workflow: click(Elements) -> click(Radio Button) -> click( |
| 131308 | TC01 | MEDIUM | PASS | 2 | 0 | 2 | Replays an autonomously discovered visual workflow: click(Elements) -> click(Upload and Download) |
| 224921 | TC01 | WEAK | FAIL | 1 | 1 | 0 | Replays an autonomously discovered visual workflow: fill -> fill -> click(Login) |
| 225513 | TC01 | WEAK | FAIL | 1 | 1 | 0 | Replays an autonomously discovered visual workflow: fill -> fill -> click(Login) |
| 225906 | TC01 | STRONG | PASS | 4 | 3 | 4 | Replays an autonomously discovered visual workflow: fill -> fill -> click(Login) -> fill(standard_us |
| 001108 | TC01 | WEAK | FAIL | 1 | 0 | 0 | Replays an autonomously discovered visual workflow: click(iPhone 12 Pro Max) -> click(Sign In) -> fi |
| 001544 | TC01 | STRONG | PASS | 8 | 2 | 8 | Replays an autonomously discovered visual workflow: click(Samsung galaxy) -> click(Login) -> fill -> |
| 002017 | TC01 | STRONG | PASS | 8 | 6 | 8 | Replays an autonomously discovered visual workflow: click(Make Appointment) -> fill(Username) -> fil |
| 002709 | TC01 | STRONG | PASS | 8 | 6 | 8 | Replays an autonomously discovered visual workflow: click(Make Appointment) -> fill(Username) -> fil |
| 011551 | TC01 | WEAK | FAIL | 1 | 0 | 0 | Replays an autonomously discovered visual workflow: click(iPhone 12 Pro Max) -> click(Sign In) -> fi |
| 012019 | TC01 | WEAK | FAIL | 1 | 0 | 0 | Replays an autonomously discovered visual workflow: click(iPhone 12 Pro Max) -> click(Sign In) -> fi |
| 012649 | TC01 | WEAK | FAIL | 1 | 0 | 0 | Replays an autonomously discovered visual workflow: click(iPhone 12 Pro Max) -> click(Sign In) -> fi |
| 015222 | TC01 | STRONG | PASS | 8 | 5 | 8 | Replays an autonomously discovered visual workflow: fill -> click(services) -> fill(Co) -> fill -> f |
| 093124 | TC01 | STRONG | PASS | 8 | 6 | 8 | Replays an autonomously discovered visual workflow: click(Make Appointment) -> fill(Username) -> fil |
| 094432 | TC01 | MEDIUM | FAIL | 2 | 0 | 1 | Replays an autonomously discovered visual workflow: click(products) -> click(View Product) -> click( |
| 095411 | TC01 | MEDIUM | PASS | 8 | 0 | 8 | Replays an autonomously discovered visual workflow: click(Cloudflare) -> click(Cloudflare) -> click( |
| 095724 | TC01 | MEDIUM | PASS | 5 | 0 | 5 | Replays an autonomously discovered visual workflow: click(PRACTICE WEBSITE) -> click(Tabs) -> click( |
| 101451 | TC01 | MEDIUM | FAIL | 4 | 0 | 3 | Replays an autonomously discovered visual workflow: click(Checkboxes:) -> click(E ementa Selenium) - |
| 101812 | TC01 | MEDIUM | PASS | 5 | 0 | 5 | Replays an autonomously discovered visual workflow: click(Me want it!) -> click(Me want it!) -> clic |
| 102041 | TC01 | MEDIUM | PASS | 5 | 0 | 5 | Replays an autonomously discovered visual workflow: click(Me want it!) -> click(Me want it!) -> clic |
| 171450 | TC01 | STRONG | PASS | 8 | 4 | 8 | Replays an autonomously discovered visual workflow: fill -> fill -> fill(standard_user) -> click(Log |
| 171828 | TC01 | STRONG | PASS | 8 | 4 | 8 | Replays an autonomously discovered visual workflow: fill -> fill -> fill(standard_user) -> click(Log |
| 172248 | TC01 | STRONG | PASS | 8 | 3 | 8 | Replays an autonomously discovered visual workflow: fill -> fill -> fill(standard_user) -> click(Log |
| 172642 | TC01 | STRONG | PASS | 8 | 3 | 8 | Replays an autonomously discovered visual workflow: fill -> fill -> fill(standard_user) -> click(Log |
| 172950 | TC01 | STRONG | PASS | 8 | 3 | 8 | Replays an autonomously discovered visual workflow: fill -> fill -> fill(standard_user) -> click(Log |
| 173308 | TC01 | STRONG | PASS | 8 | 3 | 8 | Replays an autonomously discovered visual workflow: fill -> fill -> fill(standard_user) -> click(Log |
| 174052 | TC01 | STRONG | PASS | 8 | 2 | 8 | Replays an autonomously discovered visual workflow: fill(Jsemam) -> click(Login) -> click -> fill(cr |
| 174511 | TC01 | STRONG | PASS | 8 | 2 | 8 | Replays an autonomously discovered visual workflow: fill -> fill(ane) -> click(Login) -> click(Conta |
| 174913 | TC01 | STRONG | PASS | 8 | 1 | 8 | Replays an autonomously discovered visual workflow: fill(Jsemam) -> click(Login) -> click(Conta) ->  |
| 175303 | TC01 | STRONG | PASS | 8 | 2 | 8 | Replays an autonomously discovered visual workflow: fill -> fill(ane) -> click(Login) -> click(Cart) |
| 175535 | TC01 | STRONG | PASS | 8 | 3 | 8 | Replays an autonomously discovered visual workflow: fill(Jsemam) -> click(Login) -> click(/ cart / A |
| 175902 | TC01 | STRONG | PASS | 8 | 2 | 8 | Replays an autonomously discovered visual workflow: click([can) -> fill(Jsemane) -> fill -> click(Lo |
| 180921 | TC01 | STRONG | PASS | 8 | 3 | 8 | Replays an autonomously discovered visual workflow: click(Cart) -> click(/ Proceed to checkout) -> f |
| 181531 | TC01 | STRONG | PASS | 7 | 3 | 7 | Replays an autonomously discovered visual workflow: fill(Jsemam) -> click(Login) -> click(Cart) -> c |
| 182158 | TC01 | STRONG | PASS | 8 | 2 | 8 | Replays an autonomously discovered visual workflow: click([can) -> fill(Jsemane) -> fill -> click(Lo |
| 182652 | TC01 | STRONG | PASS | 8 | 3 | 8 | Replays an autonomously discovered visual workflow: fill -> fill(ane) -> click(Login) -> click(Cart) |
| 195622 | TC01 | STRONG | PASS | 8 | 3 | 8 | Replays an autonomously discovered visual workflow: click(Conta) -> fill -> fill -> fill -> click(Sh |
| 210626 | TC01 | STRONG | PASS | 2 | 1 | 2 | Replays an autonomously discovered visual workflow: fill(Jsemam) -> click(Login) |
| 211105 | TC01 | STRONG | PASS | 2 | 2 | 2 | Replays an autonomously discovered visual workflow: fill(Jsemam) -> fill |
| 211548 | TC01 | STRONG | PASS | 6 | 2 | 6 | Replays an autonomously discovered visual workflow: fill(Jsemam) -> click(Login) -> click(Conta) ->  |
| 224912 | TC01 | STRONG | PASS | 5 | 4 | 5 | Replays an autonomously discovered visual workflow: fill(Jsemam) -> click(Login) -> fill -> fill ->  |
| 225716 | TC01 | STRONG | PASS | 8 | 5 | 8 | Replays an autonomously discovered visual workflow: click(Conta) -> fill(Your) -> click(Send message |
| 232647 | TC01 | STRONG | PASS | 2 | 1 | 2 | Replays an autonomously discovered visual workflow: fill -> click(Login) |
| 234407 | TC01 | STRONG | PASS | 5 | 2 | 5 | Replays an autonomously discovered visual workflow: fill -> fill -> click(Login) -> click(Sauce Labs |
| 000126 | TC01 | STRONG | PASS | 3 | 2 | 3 | Replays an autonomously discovered visual workflow: fill -> fill -> click(Login) |
| 001846 | TC01 | MEDIUM | FAIL | 3 | 0 | 2 | Replays an autonomously discovered visual workflow: click(Phones) -> click(Samsung galaxy sé) -> cli |
| 003358 | TC01 | MEDIUM | PASS | 6 | 0 | 6 | Replays an autonomously discovered visual workflow: click(Phones) -> click(Phones) -> click(Phones)  |
| 005117 | TC01 | MEDIUM | FAIL | 3 | 0 | 2 | Replays an autonomously discovered visual workflow: click(Phones) -> click(Samsung galaxy sé) -> cli |
| 025619 | TC01 | MEDIUM | PASS | 3 | 0 | 3 | Replays an autonomously discovered visual workflow: click(Fiction) -> click(Womens Fiction) -> click |
| 035039 | TC01 | STRONG | PASS | 2 | 1 | 2 | Replays an autonomously discovered visual workflow: click(Login) -> fill |
| 055110 | TC01 | STRONG | PASS | 5 | 2 | 5 | Replays an autonomously discovered visual workflow: fill(Jsemam) -> fill -> click(Login) -> click(/  |
| 060644 | TC01 | STRONG | PASS | 3 | 2 | 3 | Replays an autonomously discovered visual workflow: fill(Jsemam) -> fill -> click(Login) |
| 063220 | TC01 | MEDIUM | FAIL | 5 | 0 | 5 | Replays an autonomously discovered visual workflow: click(Clicks Page) -> click -> click -> click -> |
| 063920 | TC01 | STRONG | PASS | 4 | 3 | 4 | Replays an autonomously discovered visual workflow: fill -> fill -> fill -> click(Login) |
| 063932 | TC01 | STRONG | PASS | 4 | 3 | 4 | Replays an autonomously discovered visual workflow: fill -> fill -> fill -> click(Login) |
| 064941 | TC01 | MEDIUM | FAIL | 3 | 0 | 2 | Replays an autonomously discovered visual workflow: click(Phones) -> click(Samsung galaxy sé) -> cli |
| 070445 | TC01 | MEDIUM | FAIL | 2 | 1 | 1 | Replays an autonomously discovered visual workflow: fill(Search Q) -> click(Classic Books) -> click( |
| 072257 | TC01 | MEDIUM | PASS | 2 | 0 | 2 | Replays an autonomously discovered visual workflow: click(PRACTICE WEBSITE) -> click(Second Step) |
| 073812 | TC01 | MEDIUM | FAIL | 2 | 0 | 1 | Replays an autonomously discovered visual workflow: click(PRACTICE WEBSITE) -> click -> click |
| 131135 | TC01 | MEDIUM | PASS | 8 | 0 | 8 | Replays an autonomously discovered visual workflow: click(Fiction) -> click(History) -> click(Scienc |
| 134803 | TC01 | MEDIUM | PASS | 8 | 0 | 8 | Replays an autonomously discovered visual workflow: click(alt "What's new" documents since Python )  |

## Exemplar STRONG test cases (verbatim from artifacts)

### TC01 (run_20260823_225906) — PASS

- **Objective:** Replays an autonomously discovered visual workflow: fill -> fill -> click(Login) -> fill(standard_user)
- **Expected:** All recorded actions execute without errors and the final page renders non-trivially.
- **Steps:**
  1. `fill` on "text_input" -> OK [input_value: field now holds "standard_user"] (resolved via proximity)
  2. `fill` on "text_input" -> OK [input_value: field now holds "standard_user"] (resolved via proximity)
  3. `click` on "Login" -> OK (resolved via text_match)
  4. `fill` on "standard_user" -> OK (resolved via text_match)

### TC01 (run_20260824_001544) — PASS

- **Objective:** Replays an autonomously discovered visual workflow: click(Samsung galaxy) -> click(Login) -> fill -> fill -> click(us About) -> click(lo) -> click(Login) -> click
- **Expected:** All recorded actions execute without errors and the final page renders non-trivially.
- **Steps:**
  1. `click` on "Samsung galaxy" -> OK (resolved via text_match)
  2. `click` on "Login" -> OK (resolved via text_match)
  3. `fill` on "text_input" -> OK [input_value: field now holds "testuser"] (resolved via proximity)
  4. `fill` on "button" -> OK (resolved via proximity)
  5. `click` on "us About" -> OK (resolved via text_match)
  6. `click` on "lo" -> OK (resolved via text_match)
  7. `click` on "Login" -> OK (resolved via text_match)
  8. `click` on "button" -> OK (resolved via proximity)

### TC01 (run_20260824_002017) — PASS

- **Objective:** Replays an autonomously discovered visual workflow: click(Make Appointment) -> fill(Username) -> fill(John Dae) -> fill(John Dee) -> fill -> fill(Password) -> fill(a) -> click(Login)
- **Expected:** All recorded actions execute without errors and the final page renders non-trivially.
- **Steps:**
  1. `click` on "Make Appointment" -> OK (resolved via proximity)
  2. `fill` on "Username" -> OK [input_value: field now holds "John Doe"] (resolved via text_match)
  3. `fill` on "John Dae" -> OK (resolved via text_match)
  4. `fill` on "John Dee" -> OK [input_value: field now holds "John Doe"] (resolved via text_match)
  5. `fill` on "text_input" -> OK [input_value: field now holds "ThisIsNotAPassword"] (resolved via proximity)
  6. `fill` on "Password" -> OK [input_value: field now holds "ThisIsNotAPassword"] (resolved via text_match)
  7. `fill` on "a" -> OK [input_value: field now holds "John Doe"] (resolved via text_match)
  8. `click` on "Login" -> OK (resolved via text_match)

### TC01 (run_20260824_002709) — PASS

- **Objective:** Replays an autonomously discovered visual workflow: click(Make Appointment) -> fill(Username) -> fill(John Dae) -> fill -> fill(John Dee) -> fill(a) -> click(Login) -> fill(Username)
- **Expected:** All recorded actions execute without errors and the final page renders non-trivially.
- **Steps:**
  1. `click` on "Make Appointment" -> OK (resolved via proximity)
  2. `fill` on "Username" -> OK [input_value: field now holds "John Doe"] (resolved via text_match)
  3. `fill` on "John Dae" -> OK (resolved via text_match)
  4. `fill` on "text_input" -> OK [input_value: field now holds "ThisIsNotAPassword"] (resolved via proximity)
  5. `fill` on "John Dee" -> OK [input_value: field now holds "John Doe"] (resolved via text_match)
  6. `fill` on "a" -> OK [input_value: field now holds "John Doe"] (resolved via text_match)
  7. `click` on "Login" -> OK (resolved via text_match)
  8. `fill` on "Username" -> OK [input_value: field now holds "John Doe"] (resolved via text_match)

### TC01 (run_20260824_015222) — PASS

- **Objective:** Replays an autonomously discovered visual workflow: fill -> click(services) -> fill(Co) -> fill -> fill(Username) -> click(Bookstore Web service secured using WS-S) -> fill(john) -> click(Register)
- **Expected:** All recorded actions execute without errors and the final page renders non-trivially.
- **Steps:**
  1. `fill` on "text_input" -> OK [input_value: field now holds "john"] (resolved via proximity)
  2. `click` on "services" -> OK (resolved via text_match)
  3. `fill` on "Co" -> OK [input_value: field now holds "john"] (resolved via text_match)
  4. `fill` on "text_input" -> OK [input_value: field now holds "john"] (resolved via proximity)
  5. `fill` on "Username" -> OK (resolved via text_match)
  6. `click` on "Bookstore Web service secured using WS-S" -> OK (resolved via text_match)
  7. `fill` on "john" -> OK [input_value: field now holds "john"] (resolved via text_match)
  8. `click` on "Register" -> OK (resolved via text_match)

### TC01 (run_20260824_093124) — PASS

- **Objective:** Replays an autonomously discovered visual workflow: click(Make Appointment) -> fill(Username) -> fill(John Dae) -> fill(John Dee) -> fill -> fill(Password) -> fill(a) -> click(Login)
- **Expected:** All recorded actions execute without errors and the final page renders non-trivially.
- **Steps:**
  1. `click` on "Make Appointment" -> OK (resolved via proximity)
  2. `fill` on "Username" -> OK [input_value: field now holds "John Doe"] (resolved via text_match)
  3. `fill` on "John Dae" -> OK (resolved via text_match)
  4. `fill` on "John Dee" -> OK [input_value: field now holds "John Doe"] (resolved via text_match)
  5. `fill` on "text_input" -> OK [input_value: field now holds "ThisIsNotAPassword"] (resolved via proximity)
  6. `fill` on "Password" -> OK [input_value: field now holds "ThisIsNotAPassword"] (resolved via text_match)
  7. `fill` on "a" -> OK [input_value: field now holds "John Doe"] (resolved via text_match)
  8. `click` on "Login" -> OK (resolved via text_match)

### TC01 (run_20260824_171450) — PASS

- **Objective:** Replays an autonomously discovered visual workflow: fill -> fill -> fill(standard_user) -> click(Login) -> click(Abo) -> click(Contact) -> fill(Your) -> click(Shop)
- **Expected:** All recorded actions execute without errors and the final page renders non-trivially.
- **Steps:**
  1. `fill` on "text_input" -> OK [input_value: field now holds "standard_user"] (resolved via proximity)
  2. `fill` on "text_input" -> OK [input_value: field now holds "secret_sauce"] (resolved via proximity)
  3. `fill` on "standard_user" -> OK [input_value: field now holds "standard_user"] (resolved via text_match)
  4. `click` on "Login" -> OK (resolved via text_match)
  5. `click` on "Abo" -> OK (resolved via text_match)
  6. `click` on "Contact" -> OK (resolved via text_match)
  7. `fill` on "Your" -> OK [input_value: field now holds "Hello, I have a question about your prod"] (resolved via text_match)
  8. `click` on "Shop" -> OK (resolved via text_match)

### TC01 (run_20260824_171828) — PASS

- **Objective:** Replays an autonomously discovered visual workflow: fill -> fill -> fill(standard_user) -> click(Login) -> click -> click(Abo) -> click(Contact) -> fill(Your)
- **Expected:** All recorded actions execute without errors and the final page renders non-trivially.
- **Steps:**
  1. `fill` on "text_input" -> OK [input_value: field now holds "standard_user"] (resolved via proximity)
  2. `fill` on "text_input" -> OK [input_value: field now holds "secret_sauce"] (resolved via proximity)
  3. `fill` on "standard_user" -> OK [input_value: field now holds "standard_user"] (resolved via text_match)
  4. `click` on "Login" -> OK (resolved via text_match)
  5. `click` on "button" -> OK (resolved via proximity)
  6. `click` on "Abo" -> OK (resolved via text_match)
  7. `click` on "Contact" -> OK (resolved via text_match)
  8. `fill` on "Your" -> OK [input_value: field now holds "Hello, I have a question about your prod"] (resolved via text_match)

## Quarantine note

8 runs from the Tier-2 night chain (run_20260825_053921 ... run_20260825_070918)
are EXCLUDED: a concurrency collision made their B-sides explore wrong/fixturesites (see testing/QUARANTINE_TIER2.md). Including them would overstate quality.
The 76 tests above are from verified on-target runs only.

