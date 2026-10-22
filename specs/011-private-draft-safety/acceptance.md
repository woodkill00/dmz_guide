# Acceptance evidence — not yet complete

## Reproduction before production repair
Baseline main db8a6e237aa822205ed346b178a3c7dc8fafea5c; test-only b341322978b9b88fd26aa84319ea61e08db8781b (tree e87134972bbe309749c1554aaf7a2e2a28d56d0e). [PR11](https://github.com/woodkill00/dmz_guide/pull/11), [run39758738204](https://github.com/woodkill00/dmz_guide/actions/runs/39758738204), Linux Chrome job119757285691 test:browser success. Logs 2026-10-22 09:53:32 UTC explicitly report C3 delayed startup null profile download and C1 silent loss of owned17/reserve4. Baseline assertions record defects; they are not fixed-behavior acceptance. Existing strict health passed. Production repair started only after completed browser step and independent requirements approval.

## Local verification
Node24.19.0; npm ci with writable /tmp cache succeeded. npm run check (repository contracts, runtime tests, 154-route build) and npm run format:check passed after implementation. Local sandbox-enabled Chromium cannot launch: socket Operation not permitted. No sandbox bypass attempted; hosted real browsers remain required.

## Outstanding release gates
Candidate hosted Chrome Windows/Linux, Firefox/WebKit, Studio, full visual inspection, source review, convergence, exact-head CI, parent merge approval and exact-main CI are pending. No completion or merge-readiness claim.
