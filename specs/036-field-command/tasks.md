# Tasks

- [x] T001 Research sources, specify journeys and clarify collection permission; spec.md and research.md. FR001–009.
- [x] T002 Independent definition review, exact model, contracts and consistency analysis. FR009.
- [x] T003 Strict optional command state, pure helpers, unit tests and source dependency pins; command.ts and field-guide.ts. FR002–008.
- [x] T004 Match controls, presets, accuracy, relationships and playback; command-ui.ts and field-guide-ui.ts. FR001/002/004/005/006.
- [x] T005 Suggested ordering preview and graph-bound road/connector exclusions across routing workers; command.ts and worker/UI bridges. FR003.
- [x] T006 Researched registry, bounded collector, actual collection receipts, read-only local bridge and reference import/search/progress; collect-references.py, reference-plugin.mjs and command-ui.ts. FR007/008.
- [x] T007 Help, usability worksheet, keyboard/mobile/axe, failure tests, full regressions, three engines, builds/checks and isolated capacity gate. FR009.
- [x] T008 Independent final review, analyze/fix/converge, acceptance receipt and local commit. SC001–003.
- [x] T009 Convergence: cancellable, bounded previews; total collector deadline; bounded bridge; backup digest verification; receipt management and preset edge bounds. Focused unit, collector and browser evidence. FR005/006/007/008/009.
- [x] T010 Convergence: preserve unchanged waypoint/popup DOM during line updates and reconcile changed markers synchronously. Original Firefox insertion reproduction and deterministic held-worker tests in all three engines pass; full regression gate remains T007. field-guide-ui.ts and marker-cache.browser.cjs. FR003/009.

Dependencies: T001 → T002 → T003 → T004/T005/T006 (shared writes serialized) → T007 → T008. Review findings T009/T010 feed back into implementation and verification. Actual gameplay, physical device and screen reader observations remain external, explicitly not-tested.
