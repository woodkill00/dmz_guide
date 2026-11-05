# Layout and interaction-space contract

## Owned regions and geometry

The shell allocates global header, contextual navigation, one task/detail region, canvas/content, route/status slot and optional issue summary. Use Grid/Flex/intrinsic allocation and same semantic tokens across local bundles. No independent panels reserve the same corner. Canvas camera controls occupy one declared inset region; marker-to-marker overlaps use existing accessible list/overlap alternatives, not duplicated chrome. Nested elements of the same labeled control are not collision pairs. A real modal over inert background is intentional overlap; visible sibling task/route/toolbar intersections are not.

All rectangle intersection assertions use one declared coordinate space, with layout and visual viewport offset/size/scale and shell/context/task/route/summary/terrain rectangles recorded. Fail unintended visible control intersections. Document overflow is a separate diagnostic: document.documentElement.scrollWidth must be <=document.documentElement.clientWidth+1CSSpx, never compared to visualViewport.width. A pointer hit-test and keyboard focus/reveal test supplements rectangles (clipped/offscreen controls are scrolled into their intended owner first). Never call disjoint columns overlapping merely because their y-ranges intersect.

Width docking is permitted only when both task readability and usable canvas fit. Height is reevaluated on intrinsic label/error changes, font/theme/density changes, keyboard/visualViewport resize and orientation. Do not hardcode simultaneous min-heights that sum beyond available space. Initial diagnostic minima: task body14rem and terrain12rem block, terrain15rem inline; these trigger fallback, not forced CSS min-heights. Route/status actual intrinsic height is included before the fit decision. Existing user-selected explicit Map view may be smaller; default must not reduce terrain to a hidden sliver.65%usable-workspace width/70%exploration height remain diagnostic targets; they cannot override reachability or font size.

If docked or Half cannot fit, switch structural allocation to explicit Map/Task views. Keep the currently active editing task; never auto-switch away from its focused field when a keyboard appears. Read-only mode keeps current chosen context where possible, otherwise shows Task/list with an explicit Map return. Map-only has a compact task restore control and route status minimized by default under height pressure. If even a useful Map view cannot fit, keep task/list usable and offer explicit map access rather than forcing an unusable simultaneous layout. This does not recenter or change domain state.

## Modes

| Mode | Visible / scroll ownership | Focus and modality |
|---|---|---|
| Closed / Map-only | map + one task restore entry, optional minimized route control | Hidden task controls unmounted/hidden; focus moves to initiating restore/control or map heading |
| Docked desktop | one task header, one scrolling body, essential footer; map beside it; route slot below canvas | nonmodal; task/map keyboard access; pane Back restores originating context |
| Peek | task title/Expand/Close only; all body actions hidden | nonmodal; hidden controls not tabbable; Expand opens same task/selection |
| Half inspection | map and one task region only when intrinsic heights fit | nonmodal; explicit Minimize/Expand/Task view controls; no required swipe |
| Full details / Task-only | one task fills available workspace; body or document scrolls as declared | read-only details nonmodal region/page; preserve Back to map/context |
| Editing | full task page or genuinely modal editor chosen by owning workflow | actual modal backgrounds inert; one live form; Save/Cancel stay reachable, normal scroll fallback if sticky bars cannot fit |
| Confirmation / recovery | one modal step or owning recovery task, not another stacked window | declared initial focus, Escape safety and return; error text not hidden behind earlier modal |

Mode changes preserve existing values and stable control identity, do not submit forms or alter filters/progress. Breakpoints are allocation inputs, not promises tied only to device type. Inactive representations have no duplicate IDs/forms/tab stops; remove focus from a subtree before setting inert/hidden. No aria-hidden ancestor contains focus.

## Scroll, status and validation

One primary body scroller per task/directory. Table's intentional2Dregion is named/focusable, cells wrap; long details/uses expand in normal flow, not a new scroller per row. Sticky headings/identity column/action bars share measured offsets; at a small viewport they become in-flow when necessary. Focus scrolling uses scroll-padding/margin and a real pointer/keyboard reachability assertion, not simply isVisible.

One visible aggregate issue summary per active workspace, using foundation issue-summary primitive and distinct source/route/editor owner references: issue count, highest relevant severity and View issues/field links. No raw long strings stack in shell/route headers. Full messages remain in the task body or a deliberate details view; Save failure/recovery remains visible/actionable until resolved. A source error does not erase a route error, nor success erase an unresolved failed write. Routine status is one polite update, not repeated full-body live text. Long labels wrap; controls can reflow without sibling overlap.

## Stress fixture matrix

Mandatory sizes:320×400,320×568,390×844,667×375,844×390,768×1024,1024×768,1280×800,1440×900,1920×1080; both themes/densities and reduced-motion. Pairwise expanded states supplement mandatory corner cases: active route+selection+source failure, route task+validation+keyboard, read-only+unavailable service, long scope labels+public/private search, both sticky axes+rightmost control. Test root text200%, real browser200%zoom, reflow-equivalent400%/320CSSpx and real keyboard/visualViewport observations separately. Synthetic resize/Emulation.setPageScaleFactor is not proof of actual zoom or an on-screen keyboard.

Expose diagnostics in local test receipts only, without private text. Hard manual gates require recorded machine/browser/viewport/observations and may remain pending; unexecuted manual gates prevent default production promotion and are never marked pass. Existing070demo failures are planning evidence, not silently corrected as part of this turn.


## Coordinate normalization and zoom evidence

Keep document overflow, control intersection and visual-viewport reachability separate. getBoundingClientRect plus window.scrollX/scrollY yields document CSS-pixel rectangles; visualViewport.pageLeft/pageTop and width/height define the visible document rectangle. Normalize a document rect to visual origin by subtracting pageLeft/pageTop (fallback scrollX/scrollY and layout clientWidth/clientHeight if API absent). Record offsetLeft/offsetTop/scale too; do not multiply CSS rectangles by pinch scale or mix device-pixel screenshots with CSS assertions. Validate an anchor/camera-control observation on each tested browser. Hit-testing uses the same original client coordinate system expected by document.elementFromPoint, not a visual-normalized number passed blindly into that API.

A pinch/focus zoom legitimately narrows/moves the visual viewport without changing layout width. Offscreen content is tested for reveal through appropriate scroll/pan/focus, not assumed simultaneously visible or mislabeled body overflow. Use real browser zoom/keyboard sampling for conversion/reveal validation; do not disable user zoom. References checked2026-11-05: [MDN VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport), [offsetLeft](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport/offsetLeft), [getBoundingClientRect](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect).
