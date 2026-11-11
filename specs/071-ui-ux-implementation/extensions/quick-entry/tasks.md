# Traced tasks

Planning completed: live reference and current local views reviewed; code ownership inspected; QE1–QE10 and page layouts recorded; consistency findings resolved in analysis.md. Implementation is authorized; evidence and limits are tracked in implementation.md and verification.md.

- [x] T1 QE1/2/8/9: baseline viewport/action measurements; shared compact shell/toolbar; expose all moved actions; measure first useful rows and scrolling.
- [x] T2 QE3/4/10: inventory draft/commit ownership audit; stable rows, quantity stepper, keyboard entry, Save/Discard, invalid recovery and full existing controls.
- [x] T3 QE5/10: class-grouped weapon acquisition roster using existing armory identity/revision storage; preserve workbench tabs and detailed weapon pages.
- [x] T4 QE6: compact upgrade families and global-stock delegation with explicit draft resolution; retain completion versus spending distinction.
- [x] T5 QE7/8: compact Needed rows and complete arithmetic/print alternatives; saved-only forecast/status clarity.
- [x] T6 QE1–10: regression/domain/browser/visual/error-state/performance matrix and exact evidence. Include previous cash, inventory grouping, upgrades/colors and X01 journeys.
- [ ] T7 QE1–10: consistency analysis → owning task/code repair → repeated verification → convergence; independent review and remaining manual evidence recorded without self-approval.

Dependencies: T1 before T2–T5; T2's stock editing adapter before T4's exact-item stock delegation; T3 preserves its separate armory store; T6 follows each slice and the final integrated build; T7 closes gaps. Existing profile semantics remain unchanged. Any necessary schema change creates an explicit migration design task before implementation.
