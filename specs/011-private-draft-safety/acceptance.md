# Acceptance evidence — candidate accepted, merge verification pending

## Reproduction before production repair
Baseline main db8a6e237aa822205ed346b178a3c7dc8fafea5c; test-only b341322978b9b88fd26aa84319ea61e08db8781b (tree e87134972bbe309749c1554aaf7a2e2a28d56d0e). [PR11](https://github.com/woodkill00/dmz_guide/pull/11), [run39758738204](https://github.com/woodkill00/dmz_guide/actions/runs/39758738204), Linux Chrome job119757285691 test:browser success. Logs 2026-10-22 09:53:32 UTC explicitly report C3 delayed startup null profile download and C1 silent loss of owned17/reserve4. Baseline assertions record defects; they are not fixed-behavior acceptance. Existing strict health passed. Production repair started only after completed browser step and independent requirements approval.

## Local verification
Node24.19.0; npm ci with writable /tmp cache succeeded. npm run check (repository contracts, runtime tests, 154-route build) and npm run format:check passed after implementation. Local sandbox-enabled Chromium cannot launch: socket Operation not permitted. No sandbox bypass attempted; hosted real browsers remain required.

## Exact candidate acceptance
Production/test candidate `3779ac0b020e57e1342054265a9858a49457386b`, [run 39762441195](https://github.com/woodkill00/dmz_guide/actions/runs/39762441195), passed all five required jobs: repository and runtime checks on Windows/Linux, plus Firefox/WebKit. Browser and Studio strict health remained enabled and passed. Independent source review approved the exact candidate, including the explicit modal max-width correction.

Independent visual review inspected all 36 dialog variants across Linux Chrome, Windows Chrome and Firefox: dark/light × 320/390/1280 CSS pixels × normal/actual 200% text. Full-page/tiled evidence and title geometry checks confirm complete dialog context/actions with no clipping. WebKit passed functional checks; no WebKit screenshot claim. Windows artifact 12419351207 matched its published SHA256 and its terminal browser/Studio strict-health logs were independently checked.

Earlier candidates were not accepted: the self-link test initially selected the fragment skip link and was corrected to the exact Inventory navigation link; scripted onward navigation was made to await completed initialization without suppressing health failures. Real 320px/200% title clipping was then measured and repaired by overriding the user-agent dialog max-width. The final geometric assertions and all prior checks remain intact.

## Convergence and remaining delivery gate
Explicit-feature prerequisite scan and append-only convergence checked seven functional requirements, four success criteria, seven story acceptance scenarios, the raw-value/successful-save checkpoint, shared export, first-intent departure, native unload, startup-lock and semantic dialog contracts, and all ten constitutional principles. No remaining product gap was found. One partial external delivery gate was appended as T011: parent approval, exact-candidate merge and exact-main CI. T009 is complete; T010/T011 remain open until that evidence exists. No merge or deployed-state claim is made.
