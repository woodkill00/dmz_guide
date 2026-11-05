# Scoped review of T032 named Map pane modes

Reviewed 2026-11-05: integration commits `71197c9`, `0c1fee5` and `a57499d`. Scope is the new `tools/hajin-map/src/map/workspace-layout.ts` implementation and its named-mode CSS, plus inspection of the existing caller/disposal boundary and mode test definitions. I did not author this new allocation implementation. This does not independently approve my earlier Map helpers or the whole application.

## Method and evidence limits

This review was deliberately source-only plus existing illustrative images while the owner reserved a quiet performance window. **No browser, build, benchmark or test workload was started.** I inspected `071-pane-peek.png`, `071-pane-half.png` and `071-pane-full.png` under `.local/worktrees/071-pane-modes/tools/hajin-map/.local/`. These are early frames, not settled camera evidence. Their black synthetic terrain is not a missing-production-asset finding.

The owning agent reports the existing 21 layout cases and new three-engine mode suite passing, including settled exact center/zoom and image projection within one CSS pixel. I read the new test definitions but did not independently rerun those results. No physical-device, native zoom, screen-reader, real virtual-keyboard or manual acceptance claim is made here.

## Scoped assessment

No confirmed runtime blocker was found in this inspection. The following behavior is supported by source inspection:

- There is one task aside, one original body, one terrain region and one route slot. The layout moves original nodes and does not clone forms, serialize editor values, issue workspace writes or set the map camera.
- Peek leaves the task name and explicit Expand/Close controls available and makes the original body both `hidden` and `inert`. Restoring removes both restrictions. Map-only and Full use ancestor visibility rather than creating a second editing owner.
- Mode changes move focus out of a subtree before hiding or inerting it. An unsuccessful Peek request moves focus from the soon-hidden Expand control to the visible title. Explicit Full/Half and restoration retain the same controller/form nodes.
- Half admission accounts for the route slot and header before reserving map and task space. Unfit Half/Peek requests become the full task with an explicit explanation. Short task headers can flow with the document instead of remaining sticky. This supports an explicit fallback rather than forcing two unreadable panes.
- The native transactional dialog/dirty guard remains controller-owned. The layout does not replace its forms or call `showModal`, Save, Discard or commit APIs.
- Disposal cancels its animation frame, disconnects resize/mutation observers, removes window/visual-viewport/control listeners and neutralizes the new body's inert/hidden state. The current HMR caller then disposes the other owners and replaces `#app`. The layout does **not** by itself remove every generated structural node, reset every root dataset or return every moved node to its original parent; standalone detachable/unmount reuse is not established by this review.

The illustrative desktop images communicate distinct states: Peek retains a named compact strip and two actions; Half separates terrain and a single scrolling task; Full gives the original editor the workspace. They do not establish the correctness of intermediate resize frames or every narrow layout.

## Conditional follow-up

**REV-PANE-01 — low-priority source measurement concern, not a reproduced failure.** In `paint()`, the fallback feedback paragraph is hidden before `headerHeight` is measured, then made visible again for an unfit Half/Peek request. For Half-to-Full fallback near the readable-height threshold, a still-sticky header and its `--ui-task-header-height` scroll padding can therefore exclude the visible feedback paragraph. Peek's tighter threshold generally forces the header into flow; the borderline Half case needs the focused check.

After the quiet measurement window, target a viewport where Half fails but the collapsed-header Full budget only just fits; include wrapped feedback and an enlarged/long task heading. Measure the final visible header, scroll padding and task body, then scroll/focus the first and final editor actions and verify actual hit tests. If the header stays sticky, include the visible feedback in its measured budget; otherwise put the whole header in flow. The current tests check Half minimums and the 320×400 flow fallback, but the inspected assertions do not settle this specific borderline header/last-action case.

This concern is recorded for bounded verification, not as an assertion that data, focus or camera behavior failed. No production changes or acceptance checklist approvals were made in this review.


## Subsequent owning repair and verification

The implementation owner subsequently reproduced REV-PANE-01 against the previous code: visible94px header, stale69px padding. The fix measures final feedback/control visibility before deriving padding and flow (root commit b813c59). Existing21 geometry checks and focused boundary/guard checks pass in Chromium, Firefox and WebKit, including native last-field focus/hit and retained original form/camera/domain state. This addendum records the owning executed evidence; it does not retroactively turn the original read-only inspection into a browser run by its reviewer.
