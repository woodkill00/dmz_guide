# Feature022 acceptance

Date:2026-10-28. Local feature branch `feat/022-map-source-updates`, stacked on feature021. Native guide behavior was outside this change. Source artwork, raw captures, authorization declarations and original/private screenshots remain ignored; no public redistribution or deployment is claimed.

## Implemented behavior

FR001/T003: website-name links in master website rows, source icon keys, Layers headers and workspace snapshot legends open the registered map in a new tab without toggling the master checkbox.

FR002/003/006/T001/T002: owner-enabled local Vite plugin checks exactly four allowlisted source sites; bounded HTTPS/DNS/redirect/streaming budgets, inert literal/HTML parsing with denied egress, exact reviewed map-image/frame checks, safe inline icon sanitation or reported local/fallback icon reuse. Source failures retain previous data. Public/static/preview builds cannot update source files.

FR004/005/T002/T004: staged previews show per-source stable-ID added/changed/missing/category results. Semantic identity includes exact icon hashes and canonical record data; capture times/order/paths do not create new semantic versions. Workspace reuse also covers failed activation followed by a fresh check. Existing name+position/floor/category duplicate rules remain unchanged. Shared file transitions, baseline CAS, immutable generation assets and a previous pointer preserve recovery. Browser commit precedes pointer activation; durable reserved jobs/receipts support retry across restart. Superseded pointers are explicit conflicts; no silent overwrite. Private points/icons/flags/views and history remain separate.

FR007/T004/T005: whole Apply/retry/dismiss transitions lock competing drafts, with keyboard/360px controls, explicit damaged-receipt recovery and truthful provider controls after official-only startup. Quota failure never reaches server activation.

## Executed evidence

- `npm run map:test`:74 passed,0 failed, including18 feature022 synthetic security/collector/service/workspace tests. Independent domain reviewer also ran all18 new tests successfully.
- `npm run map:build`: strict TypeScript and production build passed. Final bundle:`index-CXoLLXk0.js`; no downloaded assets are committed.
- Full `npm run map:test:browser`: final49 groups passed,0 runtime errors and0 unexpected external requests, including all9 source-update groups and quota transaction recovery.
- `npm run map:test:capacity`: passed production build on Windows/Node24.15.0/Chromium156.0.8078.4. Four-core affinity and512MiB renderer heap;64GiB host, not a physical8GiB-device certification. Toggle first-paint p95:225.8ms (250ms budget); search p95:158.8ms (250ms budget); five20000-record production worker runs:400.5–450.6ms (2000ms budget).0 runtime errors,0 external requests.
- `py -3 scripts/check.py`:0 failures. `git diff --check` included in final verification.
- Authorized live browser smoke, isolated fresh browser context at127.0.0.1:5175: four sources validated/applied, then a second explicit check returned all four unchanged; retained workspace snapshots stayed4 and contents stayed identical,0 runtime errors. Counts: official138, CODMunity103, WZStats108, CODCentral201 (550 source records before display deduplication). Private screenshots/raw results remain only in ignored provider-research storage. No existing user browser profile was opened or edited by this smoke.

## Independent reviews and cycle

Requirements checklist independently approved by source_research. Initial analysis:10 FR/SC requirements,6 tasks,100% coverage. Definition and implementation findings were repaired with synthetic regressions. CI installs the tool's Chromium before the new inert-parser unit test; the parser launches with the Chromium sandbox enabled. Final security/domain review: all UPD-I findings resolved, no remaining actionable findings. Final UI/visual review: UPD-R1–R3 resolved, no remaining findings; synthetic mobile focus/layout reviewed. Read-only analysis/convergence found no remaining implementation gaps; task closure/evidence is maintained by the parent.

## Limits and recovery

This is an explicit local update tool, not live match telemetry or a public synchronization service. A provider may block collection or change its schema/artwork; it then stays on its previous capture until an adapter/alignment review. Reused icons are identified in expandable notes. No account/bypass or remote code execution is used. Two waiting previews and64 local jobs bound staging. Existing20-snapshot/20000-record/20MiB workspace caps still apply; there is no silent pruning. Reserved stages survive until activation/dismissal. All servers must be stopped before manual stale-lock maintenance. The durable receipt is local metadata, not a backup of private work. Physical devices/formal WCAG certification and fresh native-guide browser coverage are not claimed.
