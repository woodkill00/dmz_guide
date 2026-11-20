# Feature Specification: Friendly and recoverable page editing

Feature branch feat/094-editor-experience · 2026-11-19 · implementation authorized by owner. Depends on reviewed093, retained staged in this checkout; no commit/merge/publication implied.

## User Scenarios & Testing

### US1 / P1: Edit what I can see

Open the same visible Edit page action on a supported detail. Select a section or block in the preview, see the selection in the outline and focused controls, and edit readable fields for that page type. Separate Content, Layout and Photos controls, with advanced version/source fields collapsed. Verify an Order and item first, then every registered adapter. Private-copy editing stays distinct.

### US2 / P1: Understand and safely save changes

See a readable before/after review and affected relationships. Invalid fields show linked explanatory errors. Save explicitly; optionally refresh the local reader. A successful save followed by a failed rebuild remains saved, with an independent refresh retry. Existing version-rebind rules and unknown factual values remain intact.

### US3 / P1: Recover and restore deliberately

Browser recovery and bounded local disk checkpoints protect unfinished canonical fields, layouts and prepared pictures across browser changes. Show timestamps, exact destination and source conflicts; never silently overwrite another browser's checkpoint. Saved revision history supports comparison and restoration into a draft followed by normal review/save. Cancellation and lost acknowledgement never create duplicate writes or discard operation identity.

### US4 / P2: Compose bigger pages quickly

Search/multi-select outline sections; move/duplicate/remove with keyboard/click alternatives. Add ready-made task, location/photo, requirements and tips layouts and reuse named custom layouts without copying another page's canonical facts/IDs. Resize/collapse panels and retain preferences. Add pictures via file picker/drop, visually crop, reuse eligible library images, edit captions and see resolution/quality warnings.

## Requirements

- FR01 Discovery: one visible consistent Edit page action on supported repository detail pages; private editing and source-only restrictions remain explicit. No arbitrary homepage/data editor or public write API is invented.
- FR02 Context: preview selection, outline selection and inspector stay synchronized without accidental navigation; Content/Layout/Photos controls use page-specific readable fields and searchable reference selectors. Advanced identities/version/source controls retain exact validation and immutable constraints.
- FR03 Workspace: resizable/collapsible preview/outline/inspector with remembered bounded preferences; keyboard resizing, mobile tabs and320–1920px/200% text usability. No lost focus on typing/reordering.
- FR04 Composition: section templates, outline search/multi-selection/batch move/duplicate/remove and reusable custom layouts preserve uniqueness, anchor retirement, required managed facts, existing block/depth/media budgets and inert content.
- FR05 Pictures: picker/drop, visual crop preview, thumbnails/eligible-library reuse, placement descriptions/captions and image quality warnings; preserve permission review, normalization, bytes/pixel bounds, cancellation and stale-callback ownership.
- FR06 Validation: inline text errors and linked focusable summary open the correct tab/disclosure; explain fixes, retain all edits and use non-color error labels. Server validation stays authoritative; unknowns are not zero or invented.
- FR07 Review: readable before/after canonical and layout changes with source ownership, planner/version implications and affected relationships; scope limits/truncation explicit. A new edit expires old review/import/restore decisions.
- FR08 Save/refresh: explicit Save and optional Save & refresh use existing idempotent transactions. Refresh runs only the fixed local build, owns one job, returns job status across navigation, and cannot accept shell commands, paths or ports. Last good reader survives failed build. Saved outcome and refreshed outcome are independently visible; retry does not repeat Save.
- FR09 History: bounded local saved revision snapshots retain exact target, canonical fields, layout and eligible custom picture bytes; preview/compare then restore as draft against current source. Restore requires fresh review/version binding and never changes private inventory/completion. Original source imagery outside transfer eligibility remains referenced, with missing/unsupported media blocking unsafe restoration explicitly.
- FR10 Checkpoints: local disk checkpoint separate from repository publication and browser recovery, with checkout/target ownership, validated bounded data and generation/sequence admission. Cross-tab/browser changes cause conflict and preserve previous bytes; recovery/operations remain explicit. No background canonical save or Git commit.
- FR11 Consistency: existing record schemas, source provenance, profile version rebind, source/join constraints, operation recovery and asset rights remain unchanged. No use of display names as identity.
- FR12 Verification: meaningful runtime/adverse/storage/build tests and Chromium/Firefox/WebKit journeys on Orders/items first and all adapters; keyboard/mobile/light/dark, focus, interruption, revision restore, failed build and cross-browser checkpoint conflicts; independent analysis/fix and implementation review.

## Success Criteria

- SC01 An Order and item can be opened, selected in preview, edited with a picture, reviewed, saved, refreshed and reopened without losing facts, pixels or selection context.
- SC02 Every supported adapter retains its exact Edit destination and source validation; no player stock/progress changes through content editing.
- SC03 Failed save, checkpoint conflict, browser switch and failed refresh preserve recoverable work and show the correct saved/unsaved/refreshed state.
- SC04 A saved revision and a reusable layout can each be compared and applied as a draft, with stable links and fresh review before canonical save.
- SC05 No viewport-level horizontal overflow or unreachable primary actions across320–1920px and200% text; keyboard alternatives exist for all drag operations.

## Key Entities

### US5 / FR13: Read actual mission objectives from the Orders lists

2026-11-19 owner follow-up: chapter rosters (including Hajin Page1 / Gear Up) must show canonical mission objectives instead of generic instructions to open another page. The main Orders directory also shows each mission's objectives in its own initially collapsed native disclosure under its linked name. Chapter disclosures start expanded; opening/closing one never closes another. Apply to all24 Hajin and5 X01 chapter rosters, respecting existing spoiler boundaries. Use current canonical `steps` exactly, escape all imported text, retain individual guide/Edit links, and never invent missing tasks or change private progress. SC06: all recorded roster entries expose every saved step; Gear Up and X01 can be expanded/collapsed by keyboard/click on320–1920px without navigation or progress changes. Honest missing-data notices remain for future empty records.

Existing canonical target, page document and recovery record; workspace preferences; reusable custom layout; checkpoint revision; saved revision snapshot; fixed reader-refresh job; human-readable change/error model.

## Assumptions and Edge Cases

Local owner remains the only author. All proposed improvements from the prior review are authorized. Disk recovery/history stay ignored local state; public approved accounts remain later work. Retain the093 transaction and renderer. Missing source assets, corrupt/future checkpoints, old source versions, duplicate tabs, capacity limits, interrupted builds and late asynchronous callbacks fail visibly and preserve original data. Existing093 changes remain staged and are not automatically published or merged.
