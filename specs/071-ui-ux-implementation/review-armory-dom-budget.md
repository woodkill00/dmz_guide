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

## Additional independent assessments: Inventory and Upgrades

The Armory recommendation above was **not** applied automatically to these pages. The same receipt-matched source/fixture was independently checked for each additional measured increase; no new browser or build measurement was run.

| Matched fixture | Legacy initial elements | Modern initial elements | Delta | Initial native content in every sample             |
| --------------- | ----------------------: | ----------------------: | ----: | -------------------------------------------------- |
| Inventory       |                   4,921 |                   4,928 |    +7 | 48 of 48 visible catalog items; 48 rendered rows.  |
| Upgrades        |                     961 |                     968 |    +7 | 9 of 9 matching upgrade groups; 9 rendered groups. |

Each count and positive content signature is constant across all 20 observations at all three declared viewports in both receipts. These are the owners' exact matching totals, not a completeness claim for the game or a count of verified upgrade tiers.

### Content and node accounting

I evaluated the actual `private-pages.mjs` and `progression-page.mjs` SSR body factories against the four pack descriptors from the measured catalog manifest, using each descriptor's real `pack.id` and `pack.title`, under both process variants. The complete returned body strings were byte-identical:

| Body factory | Opening elements in static body | UTF-8 bytes | SHA-256, identical legacy/modern                                   |
| ------------ | ------------------------------: | ----------: | ------------------------------------------------------------------ |
| Inventory    |                              70 |       4,970 | `04816442e62f7d7a31fdea7e70a1cde82b4604e193ceaef04ad1e07daa1b3945` |
| Upgrades     |                             127 |       7,346 | `d60682ce27f5e4f1a6536fc5d2d82988fd669a555e12065d08c19b2b737c573a` |

These SSR body counts deliberately exclude the later native client-generated item/group rows; they are not substituted for the measured ready DOM counts. `profile.mjs` and `progression.mjs` do not branch on modern/legacy presentation. Their renderer and calculator inputs are identical in the matched fixture. The generic modern directory module requires an owned descendant `[data-ui-directory-rows]`; these native live owner hosts do not supply that alternate row body, so it returns before creating its optional status/pagination elements. It does not duplicate or replace these native rows.

I also separately rendered the Inventory and Upgrades navigation variants: **each** has 92→96 navigation elements including the root nav, and the same equal set of 77 feature identities. Each page receives the same two modern stylesheet links and one shell module from `renderLayout()`. Thus each measured +7 is fully accounted for by its own +4 navigation/+3 head structure, not merely inferred from the Armory result.

This is source-level byte equality for the SSR bodies, shared-code inspection for hydration, and exact ready-DOM/content-count receipt evidence. A raw hydrated `main.innerHTML` byte comparison was not stored and is not claimed. The inspected sources and complete seven-node accounting provide no evidence of different native data rows or an offsetting content deletion.

### Separate bounded recommendations

- **Inventory:** accept at most **+7** initial elements versus the matched legacy Inventory fixture, solely for those four navigation and three head elements, with all 48 native items and owner controls retained.
- **Upgrades:** accept at most **+7** initial elements versus the matched legacy Upgrades fixture, solely for those four navigation and three head elements, with all nine matching native groups and their original tier/progress behavior retained.

These are two explicit additional recommendations, with the same restrictions as Armory: no generic fixed-count allowance, per-record growth, hidden-row discount, relaxed completeness/storage/import limit, unrelated node offset, changed measurement boundary or timing waiver. Changed catalog inputs require fresh matching evidence; extra modern structural elements require further review. Original sequential timing results remain `investigate` pending the owning performance assessment; the independent DOM recommendations do not alter that status.
