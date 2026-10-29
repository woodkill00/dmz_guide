# Feature023 acceptance

Date2026-10-28. Local branch feat/023-map-coordinate-grid on feature022 commitd20a5c7. This feature changes only the local viewer, original grid geometry/rendering/tests and documentation; no source/private data modifications or public deployment.

- `npm run map:test`:77 passed,0 failed;3 new grid tests cover all90centers, forward/inverse calibration, known G6 control, inset margins, exact internal/outer edges and invalid input. Independent domain reviewer also ran all3 successfully.
- `npm run map:build`: strict TypeScript and production build passed; index-_3frYr12.js.
- `npm run map:test:browser`:52 groups passed,0runtime errors/0unexpected external requests.3 new grid groups verify21boundaries/90labels, canonical-to-screen projection drift<=1pixel, constant screen text size, pointer/center G6, keyboard pan/fullscreen/reset/mobile resize, right-click POI passthrough, mask independence, keyboard toggle, persistence, storage-failure tolerance and no horizontal overflow at360px. Existing basemap comparison/source-update/private authoring flows passed.
- `py -3 scripts/check.py`:0failures; `git diff --check` included in final hygiene checks.
- Private actual-terrain smoke at127.0.0.1:5175 in an isolated fresh browser context: referenceG6 at canonical2485/2522,90labels,0runtime errors/0external requests. No provider fetching was triggered. Screenshot retained only under ignored provider-research, never CI artifacts or Git.
- `npm run map:test:capacity`:passed. Toggle first-paint p95:244.1ms (250ms budget), search p95:151.3ms (250ms budget); five20000-record production worker runs:396.7–541.9ms (2000ms budget). Windows/Node24.15.0/Chromium156.0.8078.4, enforced4core affinity/512MiB renderer heap on64GiB host; not physical8GiB-device certification.0runtime errors/0external requests.

Independent requirements/domain/numeric/UI/visual review: clean. Read-only analyze/converge:7requirements/4tasks,100%coverage, no remaining actionable findings/gaps. Source drawn geometry is aligned through the reviewed calibration (RMS0.266/max4.337canonicalpixels); this is not an independent in-game survey, physical-device test or formal WCAG certification. Unknown margins remain unknown and conflicting source marker grid strings are not rewritten. Third-party images/raw captures and all private authoring data remain untouched/ignored.
