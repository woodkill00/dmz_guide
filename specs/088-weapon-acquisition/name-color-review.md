# T017 weapon-name progress colors — independent scoped review

2026-11-19. Read absolute canonical MW4 spec/plan/tasks after amendment landed. Planning READY: explicit recorded0 plus unchecked manual is red; recorded1–2 yellow;3+ green; absent/null counts and owned-manual+0 stay neutral. Existing ownership/count text remains non-color evidence. Styling is derived in client sync and restricted to weapon-name text, with no schema/load writes/automatic ownership inference. T017 owns real counter/checkbox/reverse/reload/dark-light/mobile/axe and build/check verification. No actionable planning blocker; preserve readable4.5:1 name-text contrast in each theme.

- [x] T017 implementation and final focused evidence accepted.

Production not reviewed or executed at this planning gate. Earlier088/093/094 receipts remain historical, not execution of this amendment. Only this reviewer-owned note written; no implementation/merge/publication approval.

## Scoped implementation disposition — 2026-11-19

PASS; no actionable blocker. Current sync derives transient state only from canonical projected count/ownership: null unrecorded, count>=3 complete, positive1–2 progress, owned-zero neutral, otherwise explicit unchecked-zero missing. data.reached is count>=3, independent of manual checkbox. CSS affects only summary weapon-name strong; text/count/ownership remain available. No domain/schema/storage mutation introduced for color.

Inspected real browser test transitions and computed-color assertions in both themes, neutral unknown/owned-zero, manual checkbox flip,0→1→2→3→4→3→2 and saved reload; seeded missing/progress/complete rows are included in existing themed axe checks. Directly read088-name-colors-browser.log Chromium/Firefox/WebKit roster/counter and quota/stale/corrupt/denied-storage PASS terminals,5/5 runtime, current build2108+404, formatPASS and repository0. Parent-executed evidence independently read, not reviewer-run browser tests. No weakened existing assertions found in this delta.

Earlier broad088/093/094 results remain historical; this bounded derived text-color amendment has the targeted current proof above. No new full aggregate/package/remote CI claim and no merge/publication approval. Only reviewer-owned note edited.

## T018 owned-zero correction — 2026-11-20 source review

Owner clarification supersedes only the earlier T017 owned-zero-neutral interpretation: owned manual plus explicit0 is now yellow. Current source/spec/T018 agree: null first remains neutral regardless of ownership,>=3 green, positive1–2 or owned-zero yellow, unchecked-zero red. No stored value, schema, CSS palette or automatic count/ownership inference changed. Existing real test keeps unknown/red false-zero/counter/reload checks and changes the two owned-zero expectations plus matching wait to progress; no assertions removed. No source blocker found. T017 remains historically valid under its original scope; it is not current proof of the changed interpretation.

- [x] T018 final focused verification accepted.

Only reviewer-owned note edited; no production edits or final acceptance yet.

## T018 final disposition — 2026-11-20

PASS; no remaining actionable blocker. Directly read088-owned-zero-browser.log all Chromium/Firefox/WebKit journey and quota/stale/corrupt/denied terminals,5/5 runtime,2108+404 build, formatPASS and repository0. Existing test executes owned explicit0 yellow→unchecked0 red→owned0 yellow computed colors in both themes while retaining unknown/count/reverse/reload and accessibility safeguards. Parent-run receipts independently inspected, not reviewer-executed tests.

Current acceptance section clearly supersedes only historical T017 owned-zero neutrality and preserves prior evidence as history. No CSS/schema/source fact/private data change or fabricated count from ownership. No new broad aggregate/package/remote CI or merge/publication claim. Only reviewer-owned note edited.
