# Vision Test-Case Quality Report

<!-- Regenerated 2026-08-25T13:15:45.996Z by regen_ledger.js; boundary definition: a test is STRONG iff any step used input_value/checked_state/dropdown_option_selected/select_option/scroll_position verification; excluded runs: run_20260825_055129, run_20260825_060707, run_20260825_062152, run_20260825_063248, run_20260825_064713, run_20260825_065652, run_20260825_070918 -->

Boundary definition (single source of truth): **a test is STRONG iff any step used input_value/checked_state/dropdown_option_selected/select_option/scroll_position verification**.

## Rubric summary

```text
Total B test cases executed:   58
Passed:                        46 (79%)
Verification strength:
  STRONG (value-level asserts): 33
  MEDIUM (state-change):        22
  WEAK   (body-text fallback):  3
```

## Per-test ledger

| Run | Test | Class | Status | Steps | Objective |
|---|---|---|---|---|---|
| 193916 | TC01 | MEDIUM | PASS | 2 | Verify navigation to Elements section |
| 193916 | TC02 | MEDIUM | FAIL | 2 | Verify navigation to Forms and ability to join |
| 193916 | TC03 | MEDIUM | PASS | 2 | Verify JOIN N button triggers in‑page action without navigation |
| 193916 | TC04 | MEDIUM | PASS | 2 | Verify navigation to Alerts, Frame & Windows section |
| 193916 | TC05 | MEDIUM | FAIL | 2 | Verify sequential navigation between Interactions and Widgets |
| 124436 | TC01 | WEAK | FAIL | 1 | Replays an autonomously discovered visual workflow: click(Elements) -> click(Radio Button) -> click( |
| 131308 | TC01 | MEDIUM | PASS | 2 | Replays an autonomously discovered visual workflow: click(Elements) -> click(Upload and Download) |
| 225906 | TC01 | STRONG | PASS | 4 | Replays an autonomously discovered visual workflow: fill -> fill -> click(Login) -> fill(standard_us |
| 001108 | TC01 | WEAK | FAIL | 1 | Replays an autonomously discovered visual workflow: click(iPhone 12 Pro Max) -> click(Sign In) -> fi |
| 001544 | TC01 | STRONG | PASS | 8 | Replays an autonomously discovered visual workflow: click(Samsung galaxy) -> click(Login) -> fill -> |
| 002017 | TC01 | STRONG | PASS | 8 | Replays an autonomously discovered visual workflow: click(Make Appointment) -> fill(Username) -> fil |
| 002709 | TC01 | STRONG | PASS | 8 | Replays an autonomously discovered visual workflow: click(Make Appointment) -> fill(Username) -> fil |
| 012649 | TC01 | WEAK | FAIL | 1 | Replays an autonomously discovered visual workflow: click(iPhone 12 Pro Max) -> click(Sign In) -> fi |
| 015222 | TC01 | STRONG | PASS | 8 | Replays an autonomously discovered visual workflow: fill -> click(services) -> fill(Co) -> fill -> f |
| 093124 | TC01 | STRONG | PASS | 8 | Replays an autonomously discovered visual workflow: click(Make Appointment) -> fill(Username) -> fil |
| 094432 | TC01 | MEDIUM | FAIL | 2 | Replays an autonomously discovered visual workflow: click(products) -> click(View Product) -> click( |
| 101451 | TC01 | MEDIUM | FAIL | 4 | Replays an autonomously discovered visual workflow: click(Checkboxes:) -> click(E ementa Selenium) - |
| 102041 | TC01 | MEDIUM | PASS | 5 | Replays an autonomously discovered visual workflow: click(Me want it!) -> click(Me want it!) -> clic |
| 171450 | TC01 | STRONG | PASS | 8 | Replays an autonomously discovered visual workflow: fill -> fill -> fill(standard_user) -> click(Log |
| 171828 | TC01 | STRONG | PASS | 8 | Replays an autonomously discovered visual workflow: fill -> fill -> fill(standard_user) -> click(Log |
| 172248 | TC01 | STRONG | PASS | 8 | Replays an autonomously discovered visual workflow: fill -> fill -> fill(standard_user) -> click(Log |
| 172642 | TC01 | STRONG | PASS | 8 | Replays an autonomously discovered visual workflow: fill -> fill -> fill(standard_user) -> click(Log |
| 172950 | TC01 | STRONG | PASS | 8 | Replays an autonomously discovered visual workflow: fill -> fill -> fill(standard_user) -> click(Log |
| 173308 | TC01 | STRONG | PASS | 8 | Replays an autonomously discovered visual workflow: fill -> fill -> fill(standard_user) -> click(Log |
| 174052 | TC01 | STRONG | PASS | 8 | Replays an autonomously discovered visual workflow: fill(Jsemam) -> click(Login) -> click -> fill(cr |
| 174511 | TC01 | STRONG | PASS | 8 | Replays an autonomously discovered visual workflow: fill -> fill(ane) -> click(Login) -> click(Conta |
| 174913 | TC01 | STRONG | PASS | 8 | Replays an autonomously discovered visual workflow: fill(Jsemam) -> click(Login) -> click(Conta) ->  |
| 175303 | TC01 | STRONG | PASS | 8 | Replays an autonomously discovered visual workflow: fill -> fill(ane) -> click(Login) -> click(Cart) |
| 175535 | TC01 | STRONG | PASS | 8 | Replays an autonomously discovered visual workflow: fill(Jsemam) -> click(Login) -> click(/ cart / A |
| 175902 | TC01 | STRONG | PASS | 8 | Replays an autonomously discovered visual workflow: click([can) -> fill(Jsemane) -> fill -> click(Lo |
| 180921 | TC01 | STRONG | PASS | 8 | Replays an autonomously discovered visual workflow: click(Cart) -> click(/ Proceed to checkout) -> f |
| 181531 | TC01 | STRONG | PASS | 7 | Replays an autonomously discovered visual workflow: fill(Jsemam) -> click(Login) -> click(Cart) -> c |
| 182158 | TC01 | STRONG | PASS | 8 | Replays an autonomously discovered visual workflow: click([can) -> fill(Jsemane) -> fill -> click(Lo |
| 182652 | TC01 | STRONG | PASS | 8 | Replays an autonomously discovered visual workflow: fill -> fill(ane) -> click(Login) -> click(Cart) |
| 195622 | TC01 | STRONG | PASS | 8 | Replays an autonomously discovered visual workflow: click(Conta) -> fill -> fill -> fill -> click(Sh |
| 210626 | TC01 | STRONG | PASS | 2 | Replays an autonomously discovered visual workflow: fill(Jsemam) -> click(Login) |
| 211105 | TC01 | STRONG | PASS | 2 | Replays an autonomously discovered visual workflow: fill(Jsemam) -> fill |
| 211548 | TC01 | STRONG | PASS | 6 | Replays an autonomously discovered visual workflow: fill(Jsemam) -> click(Login) -> click(Conta) ->  |
| 224912 | TC01 | STRONG | PASS | 5 | Replays an autonomously discovered visual workflow: fill(Jsemam) -> click(Login) -> fill -> fill ->  |
| 225716 | TC01 | STRONG | PASS | 8 | Replays an autonomously discovered visual workflow: click(Conta) -> fill(Your) -> click(Send message |
| 232647 | TC01 | STRONG | PASS | 2 | Replays an autonomously discovered visual workflow: fill -> click(Login) |
| 234407 | TC01 | STRONG | PASS | 5 | Replays an autonomously discovered visual workflow: fill -> fill -> click(Login) -> click(Sauce Labs |
| 000126 | TC01 | STRONG | PASS | 3 | Replays an autonomously discovered visual workflow: fill -> fill -> click(Login) |
| 001846 | TC01 | MEDIUM | FAIL | 3 | Replays an autonomously discovered visual workflow: click(Phones) -> click(Samsung galaxy sé) -> cli |
| 003358 | TC01 | MEDIUM | PASS | 6 | Replays an autonomously discovered visual workflow: click(Phones) -> click(Phones) -> click(Phones)  |
| 005117 | TC01 | MEDIUM | FAIL | 3 | Replays an autonomously discovered visual workflow: click(Phones) -> click(Samsung galaxy sé) -> cli |
| 025619 | TC01 | MEDIUM | PASS | 3 | Replays an autonomously discovered visual workflow: click(Fiction) -> click(Womens Fiction) -> click |
| 035039 | TC01 | STRONG | PASS | 2 | Replays an autonomously discovered visual workflow: click(Login) -> fill |
| 072257 | TC01 | MEDIUM | PASS | 2 | Replays an autonomously discovered visual workflow: click(PRACTICE WEBSITE) -> click(Second Step) |
| 073812 | TC01 | MEDIUM | FAIL | 2 | Replays an autonomously discovered visual workflow: click(PRACTICE WEBSITE) -> click -> click |
| 131135 | TC01 | MEDIUM | PASS | 8 | Replays an autonomously discovered visual workflow: click(Fiction) -> click(History) -> click(Scienc |
| 134803 | TC01 | MEDIUM | PASS | 8 | Replays an autonomously discovered visual workflow: click(alt "What's new" documents since Python )  |
| 143443 | TC01 | MEDIUM | PASS | 8 | Replays an autonomously discovered visual workflow: click(load testing.) -> click(Performance testin |
| 150625 | TC01 | STRONG | PASS | 6 | Replays an autonomously discovered visual workflow: click(Alishahryar1 / free-claude-code) -> click( |
| 153024 | TC01 | MEDIUM | PASS | 8 | Replays an autonomously discovered visual workflow: click(Lockerbie bombing trial postponed days b)  |
| 154120 | TC01 | MEDIUM | FAIL | 5 | Replays an autonomously discovered visual workflow: fill -> fill(Search) -> fill -> fill(Search) ->  |
| 163448 | TC01 | MEDIUM | FAIL | 4 | Replays an autonomously discovered visual workflow: click(alt "What's new" documents since Python )  |
| 165819 | TC01 | MEDIUM | PASS | 3 | Replays an autonomously discovered visual workflow: click(Frequently Downloaded) -> click(Pride and  |
