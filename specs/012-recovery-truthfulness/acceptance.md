# Acceptance evidence

Initial source is 011 candidate e4a689ca7baf3615a7b8b68784240f862c639cdd. Independent requirements gate passed. No 012 production edits in initial test-only candidate.

C5 controlled Node24 failed-open, versionchange and closed-transaction regression tests all failed against unchanged source, as recorded in evidence/storage-baseline.txt. This is failure-first evidence, not acceptance. Browser baseline probes for C2/C4/C6/C7 are pending actual hosted execution; baseline mode asserts existing defects and must be replaced by fixed acceptance before release. Strict browser health remains enabled. Local sandbox-enabled Chromium cannot create its process socket; no sandbox/security bypass was attempted.

Final runtime, Windows/Linux Chromium, Firefox/WebKit, Studio, full-page/tiled and actual 200% visual gates, source review, convergence and exact-main CI remain pending.

Hosted failure-first evidence: Linux Chromium artifact12418017359 from run39760798515 at62effb076442820cb858b16b62670b18b415737e independently verified all four C2/C4/C6/C7 baseline probes. C6 invoked the real nested handler directly with caller catch, not a full live click. No Windows/other-engine baseline claim. Corresponding repairs began only after this proof. Six C5 local mocked lifecycle tests and four safe-preview tests now pass; real-engine lifecycle and both-host live limit acceptance added, still pending execution.
