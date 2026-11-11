# Local verification evidence

Date: 2026-11-11. Environment: Windows, Node 24, Chromium through Playwright.

| Command or check | Result |
| --- | --- |
| `npm --prefix tools/hajin-map test` | 236 tests passed after the final X01 cases. |
| `npm --prefix tools/hajin-map run build` | TypeScript and Vite production build passed; `x01-workspace.html` is included. |
| `npm --prefix tools/hajin-map run test:browser` | Passed with zero runtime errors and zero external requests; included the X01 workbench flow. |
| Focused X01 Playwright rerun | Passed after the final route, photo, update and 320px changes; includes backup/restore, source diff/apply/reject, crowded marker selection, local persistence, waypoint ordering, and automated WCAG scan. |
| `npm run check` | 994 guide tests passed; 1,866 independent HTML routes and 404 page built. The first attempt exposed a stale reviewed feature-registry fixture; it was reconciled and the full check then passed. |
| Desktop/mobile visual inspection | Desktop and mobile screenshots inspected locally; the long default review panel was corrected. Screenshots remain in ignored `.local` storage. |

The physical phone, screen reader and 200% text zoom acceptance checks in [the verification matrix](../../docs/x01-workbench-verification.md) remain for the owner. No gameplay observation was available. This file records implementer test evidence; it is not an independent review approval.
