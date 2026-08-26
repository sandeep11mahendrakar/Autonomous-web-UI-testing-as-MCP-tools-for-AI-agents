# POST 2 - Tier 1: sites 1-10, where everything broke

Tier 1 was ten purpose-built practice sites - SauceDemo, Demoblaze, OWASP
Juice Shop, and friends. The point was never the sites; it was forcing the
pipeline through enough variety that its own defects would surface before
real websites had a chance to break it. The plan worked better than expected:
site diversity surfaced 19 pipeline defects, every one fixed with before-and-
after evidence. Zero of them were discoverable on the reference site alone.

Three defect stories stand out.

First, reference-site overfitting. The original DemoQA prompt carried
hard-coded assumptions from that one site's structure. It worked perfectly -
on DemoQA. The moment exploration moved to bstackdemo or CURA, those
assumptions produced confidently wrong actions. The fix was to make prompts
structure-agnostic and let observed state drive decisions.

Second, OCR placeholder blindness. The vision explorer reads labels with
Tesseract, and input placeholders are its favorite food - except placeholders
vanish the moment a user types. Early replays filled fields by "reading" text
that would not exist at replay time. The cure was treating OCR text as a
perception hint, not a grounding guarantee, and re-detecting targets live
before acting.

Third, selector-versus-coordinate grounding. Architecture A emits CSS
selectors; Architecture B emits screen coordinates. A coordinate click on a
re-rendered page lands on nothing. B's answer was live target re-detection -
find the element again by appearance, then click where it is NOW. Meanwhile
the fusion validator learned to reject any composed test referencing an
element neither architecture actually observed.

Tier 1 also produced our honest failure taxonomy: every FAIL gets classified,
no exceptions. Final live pass rate was 77% (10 of 13 executed fused tests),
but the more useful number is that failures like `label_mismatch` and
`selector_readonly` were later proven correct site behavior - the system
refused to click things it should not click. OpenCart was Cloudflare-blocked
and recorded as an honest BLOCKED row rather than quietly dropped.

Eleven runnable sites out of eleven attempted, one blocked, nineteen defects
retired.

Lesson learned: friendly environments are for finding YOUR bugs, not for
collecting green checkmarks - run the pipeline somewhere forgiving first,
and classify every failure before you celebrate any pass.
