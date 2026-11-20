# Dynamic local link repair

Assessment: current maps return 200 at the unified origin, but reader help, audit tooling and companion navigation still contain old fixed local addresses. Relative map routes alone did not complete the navigation migration. Repair scope: route all controlled site navigation through shared map/service helpers; keep internal guide/map links relative, and resolve optional author/manager/standalone-to-reader links through a finite local service directory on the current server. A single service-port configuration owns companion defaults. No arbitrary host/URL forwarding or account/storage migration.

The directory accepts GET/HEAD only, loopback Host/remote/same-origin requests, exact known service names and bounded relative destination paths. It creates navigation redirects only, never fetches remote data or invokes a service. Portable guide-only servers give explicit local setup help. Existing API origin/token rules and historical backup provenance remain separate from navigation.

Verification: source guard against embedded loopback navigation literals; route/helper tests preserving query/hash and refusing untrusted destinations; HTTP directory guards; emitted-link audit on current built pages; browser journeys on an alternate port for guide/map/keys/selection, no port5175 dependency; affected navigation/editor tests, map typecheck/build and independent review. Rebuild and restart the normal local service after verification. Existing acceptance is historical until this repair's evidence is recorded.

## Executed repair checks

- `095-dynamic-browser.log`: 2,117 generated guide/map pages and 112,992 map/companion links audited; no fixed loopback navigation. Chromium, Firefox and WebKit passed actual Home→Map/new-tab→all four maps→Home navigation on port53111. Bad Host99999 refused with400 and subsequent status remained200. Editor-directory redirects and query isolation checked.
- `095-all-page-links.log`: all three engines passed saved item/recipe/objective/guide/map/location/weapon editor identity links, private-copy separation, maintenance, weapon/key/camo entrypoints. Tests parse and verify the directory's relative destination instead of expecting a fixed host.
- Focused runtime: 29 navigation/registry/preview/target checks, 25 author/adapter/manifest/topology checks, 13 generator/preview/item/directory checks and 17 final navigation/source/guard checks passed in their respective links logs; sets overlap and are not a summed unique denominator.
- Map244/244 and typecheck passed. Guide2,108 routes and eight-entry namespaced map build passed. Current run-plan accept/decline handshake passed on the updated live service. Source guard covers page generators as well as UI/client/map modules; this caught additional composed weapon/mission edit links missed by the initial source scan.
- UNIFY07 invalid Host source fix was independently reviewed; raw request/liveness proof is included in the alternate-port journey.

- Final post-format verification: 36 focused runtime tests passed; full formatting and structural checks passed. The latest dynamic navigation run passed all three engines on alternate port52743 with the same 2,117-page/112,992-link audit. Earlier focused sets overlap.
- Actual mission editor navigation, notes/layout save and reload passed in all three engines. Classic Studio loaded its catalog and map menu successfully; public module MIME coverage verifies the shared navigation dependencies. Existing author write-lock protection was retained during service refresh.
- Required formatting also normalized earlier feature095 code mechanically; UI inventory hashes were regenerated before the final builds. No additional product feature was introduced by those formatting changes.
- Independent bounded final review passed with no remaining actionable blocker; see final-review.md. Release packaging and delivery are recorded below when their terminal receipts complete.

The original feature acceptance is historical, not substituted for this repair's evidence. No saved player data, account access or source collection was changed.

Final delivery checks: current formatted build packaged 2,417 inventoried payload files; clean extraction verified all hashes, native routes, owned Node startup and exact served content (095-links-package.log and 095-links-release.log, exit0). Live unified status reports ready; home and all four map entries return200 on4173. Optional editor dependencies and real Studio readiness were checked without editing owner content. T012 is complete under this bounded scope.
