# Independent scoped planning review

2026-11-22. Reviewed spec, plan, tasks and analysis. Manual bounded repair is appropriate to reproduced layout behavior; no external research or broader shared-table redesign is necessary.

Planning READY with the following explicit implementation acceptance conditions (no additional feature scope):

- Scope overrides to Keys directory and intended key-trip panels; retain shared armory/inventory scroll behavior. Test both presentation variants so a more-specific modern table rule cannot reinstate nested scrolling.
- Collapse areas must not leave focus in hidden content. If activeElement is inside an area being closed (including engines where pointer clicking does not focus the bulk button), move focus to the initiating visible bulk control before closing; preserve original input nodes/values. Operate only location details, not private notes/backups/source disclosures. JS-dependent bulk controls should be disabled/hidden until wired; no-JS native summaries remain operable.
- Removing table-wrapper tabindex is correct only after it is no longer an independent overflow scroller. Preserve table header semantics/data labels; responsive display rules must not override hidden rows or filtered-empty areas.
- Demonstrate real wheel movement of the document over former X01/source/trip regions, no inner vertical offsets and no horizontal page overflow at narrow/text-zoom widths; verify the last stock control can be reached and used. Expanded source/trip content must remain reachable, not clipped by ancestor overflow.
- Retain80canonical keys/89uses, exact map destinations, stock/trip draft identity and saved reload behavior. Area toggles must not write storage or rerender rows; source uncertainty remains available in disclosure.

FR01–06 map to T001–005 without missing scope. No confirmed blocking planning gap; focus behavior above follows FR03/04 and should be included explicitly in T003/T004 verification. Implementation and executed evidence review remains future. Only review.md written; no production edits or tests executed by reviewer.

- [x] Scoped planning ready.
- [x] Final implementation/evidence accepted within the documented scoped repair.

## Interim source review — 2026-11-22

P2 FLOW-01: src/client/keys.mjs bulk Collapse currently closes every group without checking activeElement. In pointer-focus models that retain focus in the prior stock/notes input, this hides the focused control. Before closing, move focus to the initiating visible bulk button if a closing group contains activeElement; retain input identity/value. Add actual focused-input→pointer Collapse test (no force/synthetic click), with visible focus and preserved stock/draft. This implements the previously stated planning acceptance condition.

Other inspected paths: directory-only CSS overrides both shared and modern overflow owners, trips alone use key-workspace scope, mobile hidden-row override is explicit, table headers/data-labels retained, bulk controls start hidden until handlers attach, and source notice remains native. Fixed table layout and scoped source-comparison labels are proportionate; no shared inventory/armory override observed. Finite CSS asset allowlists added for author/manager rather than arbitrary asset serving. Browser computed overflow/geometry/keyboard/mobile/stock and both-variant proof remain pending; no final acceptance or production edits.

## Focus and refresh source recheck — 2026-11-22

FLOW-01 closed by current-source inspection: Collapse checks whether any closing area contains activeElement and focuses the initiating visible button before changing open state. Existing nodes/values are retained. Private workspace refresh and row focusout now call filter(true), which updates matching/counts without reopening collapsed areas; explicit filter changes retain their intended expand behavior. No new confirmed source blocker in these repairs. Reviewer did not author the production focus guard: all reviewer mutation commands for107 targeted only this absolute review.md path; production ownership remains implementer responsibility.

Directly inspected107-runtime.log now ends19/19 PASS (the earlier parent12 count is historical). Actual pointer-focus, wheel/geometry/stock and both-presentation browser receipts remain pending; no final acceptance yet.

## Final independent scoped acceptance — 2026-11-22

PASS. Directly inspected107-flow-final.log all-three-engine terminals for real document wheel scroll/no nested scrolling, static filters, pointer collapse visible focus/original node/value, save/reload and expanded source/trip content across narrow/desktop/themes/200%/modern CSS cascade. Final Collapse source explicitly focuses its initiating button before closing, addressing the documented initial WebKit focus failure. Inspected retained-key all-engine terminals and owner-runtime19/19 PASS; formatter PASS and structure0. Accessibility log records36 empty violation arrays across three engines/directory/two details/themes/390–1440; zoom belongs to separate flow tests.

Inspected actual107-chromium-mobile.png: readable single-column X01 cards, labelled facts, visible stock/actions and no apparent horizontal clipping. Source uncertainty/map fallback remains visible. Delivery accurately limits modern proof to activated CSS cascade rather than a separate modern build, and does not reuse feature106's1163 aggregate as a107 full-suite claim. Parent-recorded2275+404/map build/live readiness remain scoped delivery receipts; reviewer independently inspected source/logs/image rather than rerunning suites.

FLOW-01 closed; no remaining confirmed P1/P2. Only review.md edited. This accepts the local layout repair and reviewer prerequisite for local commit, not push/merge/deployment.
