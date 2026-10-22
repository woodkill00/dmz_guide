# Acceptance evidence

These entries preserve historical checkpoints. Later dated receipts supersede earlier pending or failed verdicts without erasing their chronology. Final combined closeout is a separate gate.

Initial source is 011 candidate e4a689ca7baf3615a7b8b68784240f862c639cdd. Independent requirements gate passed. No 012 production edits in initial test-only candidate.

C5 controlled Node24 failed-open, versionchange and closed-transaction regression tests all failed against unchanged source, as recorded in evidence/storage-baseline.txt. This is failure-first evidence, not acceptance. Browser baseline probes for C2/C4/C6/C7 are pending actual hosted execution; baseline mode asserts existing defects and must be replaced by fixed acceptance before release. Strict browser health remains enabled. Local sandbox-enabled Chromium cannot create its process socket; no sandbox/security bypass was attempted.

Final runtime, Windows/Linux Chromium, Firefox/WebKit, Studio, full-page/tiled and actual 200% visual gates, source review, convergence and exact-main CI remain pending.

Hosted failure-first evidence: Linux Chromium artifact12418017359 from run39760798515 at62effb076442820cb858b16b62670b18b415737e independently verified all four C2/C4/C6/C7 baseline probes. C6 invoked the real nested handler directly with caller catch, not a full live click. No Windows/other-engine baseline claim. Corresponding repairs began only after this proof. Six C5 local mocked lifecycle tests and four safe-preview tests now pass; real-engine lifecycle and both-host live limit acceptance added, still pending execution.

## Hosted Studio binding correction

Exact candidate 6ce2b1d1f43fba63a0acd34d712fe9a58d45f450, run 39763340620, passed the reader recovery journeys but failed the new actual Studio max-eight-limit journey in Linux Chrome and Firefox (jobs 119772836826 and 119772837016). The helper correctly waited for the existing focused `#error` surface. Studio accidentally supplied `onError: error` (a named DOM global), not its `fail` callback. Independent validator and source reviewer confirmed this production defect. Correct only the host callback to `fail`; retain all error/focus/draft assertions and strict health. New exact-head hosted evidence remains required; the failed candidate is not accepted.

## Exact source candidate accepted, delivery still gated

Candidate `1ac4116283207e118f984e320276cd2eeb7b3f98`, tree `5b61cc9fe9a1b02600f2a9e43ffd49d94620e3b1`, run [39764420837](https://github.com/woodkill00/dmz_guide/actions/runs/39764420837) has all five latest jobs successful. Independent validator confirmed Windows rerun119779452134 reader/Studio strict health; Linux and Firefox/WebKit also passed. Initial Windows attempt failed because theme.mjs returned ERR_NO_BUFFER_SPACE, not a relaxed assertion or disabled health check. One exact-head failed-job rerun succeeded with no source/test changes. Windows artifact12420835951 digest matched and all12 recovery PNGs matched its first attempt.

Independent source reviewer restored exact approval after the real Studio callback correction. Independent functional/visual validator accepted012 on2026-10-22. All36 normal/actual200% screenshot coverage records span Linux Chrome, Windows Chrome and Firefox, dark/light and320/390/1280. Representative native-pixel tiled inspection covered the full320dark200 Linux summary,320dark normal Windows,390light200 Firefox and desktop light normal. Named sections and apply/cancel controls are complete; narrow enlarged text can wrap mid-word without clipping. This is sampled manual visual inspection plus complete automated coverage, not a claim that every image was manually inspected. WebKit functional/health only.

FR001/002: exact before/after quantities, goals, completion, routes, catalog/version and spoiler preference; inert/masked unknown IDs and metadata; non-mutating preview, explicit apply/reload. FR003/004: content warning does not invent unavailable healthy storage; later real IndexedDB close/versionchange/open reconnection, fake lifecycle edge cases and zero uncertain write replay. FR005: actual both-host eighth-limit boundary preserves draft and focuses visible error. FR006: settled-save Tab/ShiftTab/pointer focus, successful remove/reorder and failed add/remove/reorder model rollback, including later unrelated save. Existing platform, portable media, Studio and strict health gates remain intact.

This documentation-only closeout needs its own exact-head CI. Parent approval, merge and exact-main CI remain pending; no completion of SC004's delivery clause is claimed.

## Later verified delivery receipt, 2026-10-22

The authoritative integration ledger records accepted candidate `ef0048df2857c1970069422006fc7cb533e43b75` and [run 39771125738](https://github.com/woodkill00/dmz_guide/actions/runs/39771125738), then PR 12 merge at main `63277e16a7c086a5e750ea184eb55783aa18f6ff` with successful exact-main [run 39780102716](https://github.com/woodkill00/dmz_guide/actions/runs/39780102716). These receipts supersede the earlier pending delivery snapshot for that revision without erasing the callback failure or retry chronology. Scope remains readable spoiler-safe replacement, warning taxonomy, independent storage reconnection without uncertain-write replay, guided-limit handling and planner focus/rollback. The 36 coverage variants and representative full-document/tiled native-pixel inspection are not exhaustive manual image inspection. C6 baseline was direct invocation of the real handler, not a full click; C5 unit evidence remains distinct from actual browser IndexedDB acceptance. Later combined-closeout/current-main claims require their own receipts.
