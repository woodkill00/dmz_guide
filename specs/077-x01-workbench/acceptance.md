# Local verification evidence

Date: 2026-11-12. Environment: Windows, Node 24, Chromium through Playwright.

| Command or check | Result |
| --- | --- |
| `npm --prefix tools/hajin-map test` | 239 tests passed after the X01 review fixes. |
| `npm --prefix tools/hajin-map run build` | TypeScript and Vite production build passed; `x01-workspace.html` is included. |
| `npm --prefix tools/hajin-map run test:browser` | Passed with zero runtime errors and zero external requests; included the X01 workbench flow. |
| Focused X01 Playwright rerun | Passed after the route, photo, update, stale async draft and 320px review fixes; includes backup/restore, source diff/apply/reject, crowded marker selection, local persistence, waypoint ordering, and automated WCAG scan. |
| `npm run check` | 994 guide tests passed; 1,866 independent HTML routes and 404 page built. The first attempt exposed a stale reviewed feature-registry fixture; it was reconciled and the full check then passed. |
| Desktop/mobile visual inspection | Desktop and mobile screenshots inspected locally; the long default review panel was corrected. Screenshots remain in ignored `.local` storage. |
| `node tests/browser/measured-scale-runner.mjs --engines` | Firefox and WebKit functional, pagination and measured-scale checks passed after adapting disclosures to the current inventory UI. |
| `py -3 scripts/package-release.py` and `py -3 scripts/verify-release.py` | 2,093-file static archive packaged; clean extraction, hashes, native links and owned Node server verified. Optional local-only art and audit routes are explicitly scoped. |

Independent source and test-evidence review completed on 2026-11-12; FR-002 and FR-003 remain open for owner touch and backup/photo checks. The physical phone, screen reader and 200% text zoom acceptance checks in [the verification matrix](../../docs/x01-workbench-verification.md) remain for the owner. No gameplay observation was available. This file records implementer test evidence; the independent review is separately recorded in the reviewer-owned checklist.
