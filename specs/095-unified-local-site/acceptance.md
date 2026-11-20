# 095 execution evidence

Windows 11, Node 24.15.0, Python 3.14.4. Local provider resources remain ignored/private and outside the guide artifact/archive. No user browser profile or inventory was read, cleared or restored for testing.

| Scope | Executed result | Receipt under ignored test-results/ |
| --- | --- | --- |
| Guide build | 2,108 HTML routes and 404 page | 095-guide-build.log |
| Namespaced code-only map build | Eight entries, hashed manifest, successful publication | 095-map-build.log |
| Guide runtime suite | 1,113 passed, zero failures | 095-runtime-final.log |
| Map runtime suite | 244 passed, zero failures | 095-map-runtime.log |
| 095 route/server/preference contracts | 10 passed, zero failures; includes junction ancestor, shared dependency mutation, invalid settings, conflicts and conditional rollback | 095-contracts.log |
| TypeScript | Passed | 095-typecheck.log |
| Real browser smoke | Chromium, Firefox and WebKit passed; guide/inventory/upgrades/orders, all map entries, real pointer selection and persistent popup, X01 second-floor refresh, mobile screenshots, preference apply/reload and unchanged synthetic guide sentinel | 095-browser.log; 095-browser/report.json and PNGs |
| Startup | Non-HTTP occupied listener refused and retained; fresh startup and duplicate invocation passed; one service left on 4173, no 5175 listener | 095-startup-integration.log |
| Windows launcher | start-local.cmd -SkipBuild recognized existing service | 095-powershell.log |
| Guide-only distributable | 2,415 payload files packaged; clean extraction verified hashes, native links and owned Node server | 095-package.log; 095-release-verify.log |
| Structural checks | Zero failures | 095-structure.log |
| Python aggregate and repair verification | 78/79 passed during development; the sole reproducibility failure was rerun with frozen source and passed (434.516s). All 79 Python cases now have passing execution evidence; no claim that the earlier aggregate run passed. | 095-python.log; 095-repro-recheck.log |

The first aggregate JavaScript run caught outdated separate-port expectations and relative-URL topology resolution. Both were repaired, registry hashes deliberately recaptured with historical 071 identities preserved, and the complete suite rerun successfully. A browser check caught X01 switching back to an old selected marker's floor on refresh; changing floors now removes an incompatible selection from the URL. Browser tests use exposed real pointer targets instead of forced clicks through overlapping markers, and await visible markers before interacting.

Independent source review closed UNIFY-03–05 (shared build inputs, linked ancestors, owner-specific preference shapes). See final-review.md. Planning approval is not substituted for implementation evidence. Public deployment, physical devices, live gameplay accuracy and a real user's private cross-browser restore are not claimed. Main/X01 restoration remains with existing validated backup owners; supplemental settings transfer never copies their IndexedDB stores.

User authorized commit and merge after verification, overriding the earlier planning-only Git boundary. Delivery status will be recorded after remaining verification and review.

Final scope boundary: the guide source identity was compared with its verified build/release inputs after the late X01 repair: zero changed guide source files (`095-source-match.log`). The 1,113 guide runtime and 2,415-file archive/extraction receipts remain applicable to those unchanged inputs. Map-only late changes were independently rebuilt/typechecked, passed 244 map tests and the complete X01 owner workflow in all three engines. `git diff --check` and the structural gate passed; private map assets/exports and `.playwright-mcp/` are excluded from staging.

Integrated owner proof: 095-workspace.log passes all three engines with an actual saved Guide quantity (7 Detonators), unchanged inventory/completion after map operations, Hajin backup preview/backup-before-replace/restore/re-export, and real valid/invalid collection origin/window/nonce handoffs. 095-run-handoff.log verifies run-plan accept/decline on the unified origin. 095-x01-owner.log passes the existing full X01 owner workflow in all three engines, including photo upload/reload/export/restore and its adverse cases.

T011: Windows WebKit rejected IndexedDB Blob/File persistence. A bounded internal photo-byte envelope now supports portable storage, synchronous legacy/portable decoding and the existing atomic revision CAS. The existing exported backup/state formats and database name stay unchanged. Older implementations refuse the internal wrapper; keep exports before downgrading. The codec regression tests photo hash/backup identity, legacy reads, isolated async input and invalid/future/oversized state.

Final independent review: bounded PASS, UNIFY-03–06 closed. T001–T011 complete. The unified service is ready at 4173; user-authorized commit/merge follows this verified state. Historical predecessor implementation preserved as a separate commit before 095.
