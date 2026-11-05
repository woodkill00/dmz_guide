# Independent assessment: Armory initial DOM delta

Reviewed 2026-11-05. Scope: the measured Armory **initial element count only**, against the plan's written-independent-review exception path. I did not author the Guide/weapon production renderer. This is not a timing, content-limit, accessibility or release waiver. No browser, build or benchmark was started for this assessment.

## Evidence

The existing receipts in `.local/worktrees/071-performance/.local/ui-layout-baseline-measured.json` and `ui-layout-modern.json` identify the same source HEAD `5fab8eeb4c8e1d6cb752ddc86fa83c41a752fbdb`, fixture digest `76f187fce1425025213bfba75480181cefd2f8c8596f52f850a8efb7ec10b6ad`, Node `v24.15.0`, Windows platform and Chromium `145.0.7632.6`.

All 20 Armory observations at **each** desktop, compact and compact-with-200%-root-text fixture have exactly 12,126 legacy elements and 12,133 modern elements. This is a deterministic **+7**, approximately 0.058%, rather than a varying count or missing-data measurement.

I independently read the receipt-matched production sources and evaluated only the existing server-side navigation string renderer; no browser DOM was fabricated. Counting known SSR opening tags, including the root navigation element, gives:

| Navigation element        | Legacy | Modern |  Delta | Purpose                                                        |
| ------------------------- | -----: | -----: | -----: | -------------------------------------------------------------- |
| Native anchors            |     77 |     77 |      0 | Same exact feature identities; both sets are unique and equal. |
| `details`                 |      1 |      2 |     +1 | Native mobile primary Sections disclosure.                     |
| `summary`                 |      1 |      2 |     +1 | Operable/native label for that disclosure.                     |
| `div`                     |      1 |      2 |     +1 | Primary-link group used by the current responsive layout.      |
| `button`                  |      0 |      1 |     +1 | Explicit compact/comfortable spacing control.                  |
| Other navigation elements |     12 |     12 |      0 | Root nav, filter and five source-independent groups/labels.    |
| **Total navigation**      | **92** | **96** | **+4** | Counting convention includes the root nav.                     |

`renderLayout()` adds exactly two modern stylesheet links (`workspace-shell.css`, `directory-view.css`) and one modern module script (`client/workspace-shell.mjs`): **+3 head elements**. Together these fully account for **+7**.

The performance owner's static HTML comparison independently reports unchanged Armory `main` content with 12,000 elements, head descendants 13→16 and navigation descendants 91→95. The one-element difference from my navigation totals is the explicitly included/excluded root nav, not an unexplained node. Receipt-matched `armory-page.mjs` and `gunsmith-view.mjs` have no presentation-variant branch adding weapon/attachment rows, and the shared-shell accounting exhausts the measured total delta.

## Recommendation: accept a narrowly bounded structural exception

Accept **at most +7 initial Armory elements relative to the matched legacy rendering of the same fixture**, solely for the seven identified modern shell/adapter elements above. This is justified by the approved native mobile navigation, density control and opted-in presentation adapter; it does not duplicate weapon facts, create parallel editable views, add a per-record multiplier or hide rows from the measurement.

Conditions of this recommendation:

1. Retain the original full element-count receipts and all three viewport comparisons. Count hidden/disclosed elements too; do not change the measurement boundary or offset the increase by deleting unrelated content.
2. Preserve all 77 unique native feature links and the complete Armory data body. The exception does not allow seven extra weapon rows, seven nodes per weapon, or an arbitrary fixed 12,133-node allowance for unrelated catalogs/pages.
3. Any increase beyond this documented constant seven, or a different fixture/data body, needs fresh admission evidence and review. Domain record, import, catalog completeness and storage limits are unchanged.
4. Keep the performance investigation separate. Seven structural elements do not prove that loading/parsing the two stylesheets and module is latency-free. Original timing regressions and diagnostic results must remain visible; this review does not turn a timing `investigate` result into a pass.

## Reduction alternatives considered

Removing the native disclosure/summary or spacing action would remove approved behavior. The primary-group wrapper could potentially be eliminated by a separately tested markup/CSS/controller refactor, but removing it now is not demonstrably no-loss because responsive layout and disclosure handling use that owner.

Asset bundling or integrating modern startup into an existing module could reduce head nodes and possibly requests. That is a legitimate future optimization, but it needs separate cascade, static/no-JS, adapter-readiness and timing validation. The recently reproduced Manager cascade defect demonstrates why moving stylesheet order simply to satisfy a count is not automatically safe. Shifting CSS into imports while increasing the legacy loading cost would not be an acceptable cosmetic node offset.

The written exception is therefore more transparent than an unverified late packaging change. It is deliberately limited to the deterministic initial-DOM gate; matched performance, real-device/manual acceptance and default promotion retain their own decisions.
