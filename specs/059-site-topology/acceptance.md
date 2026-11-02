# Acceptance — 059 site topology

Local feature branch `feat/059-site-topology`, based on058commit338044c. Manual pinned full Spec Kit cycle; no automated skill execution, provider collection, external publishing or private-state migration claimed. Independent final local review PASS is recorded in the reviewer-owned checklist.

## Delivered inventory

Current build:896 independent guide routes plus404.html,73registered feature destinations,946graph nodes,6,586typed connections and6,725named static controls. Four service boundaries remain explicit: guide, interactive map, Content Studio and weapon update manager. The162captured public source hashes match the tested build identity `f75c887fd946f5d8f3140dd570419ed26f4814a19f8fa0800c4e2a332465ee47`.

All generated guide routes, including key/weapon details and contribution guidance, appear in both the visual inventory and full readable directory. Existing sitemap/catalog links and no-JS behavior remain. Search and filter by branch/service/family, inspect incoming/outgoing page/menu/directory links, show a connection neighborhood, page through nodes/connections, reset display and download the JSON inventory. Static sections, tabs, labeled fields and controls carry public labels/IDs only; field values and nested spoiler-reveal labels are excluded.

## Executed evidence

| Check | Result | Local receipt |
|---|---|---|
| Guide build |896routes plus404; atomic build-owned topology output |`.local/topology059-build-final.log`|
| Topology runtime tests |8passed; current emitted-route completeness, controls/privacy/spoilers, hostile targets, UTF8 caps, missing target fixtures |`.local/topology059-runtime-focused.log`; reviewer independently repeated8/8|
| Interactive browser/regression |Chromium, Firefox and WebKit pass; search/branches/neighbors/actual links/pagination/export/keyboard/noJS and existing navigation-directory journeys |`.local/topology059-browser-final.log`|
| Responsive and accessibility |24layout/theme/text cases and24axe scans, zero violations; strict functional browser health independent from axe helpers |same browser receipt|
| Static route/fragment audit |0missing targets; directory membership separated from contextual incoming links; sole contextual orphan is404utilitypage |build topology JSON and audit report|
| Companion runtime audit |49/49registered targets passed;0failed/unavailable; fresh contexts, remote requests blocked, no mutation clicks |`.local/topology059-companion-accepted.log`; `.local/site-topology-audit/audit.json` and `report.html`|
| Source equivalence |162source hashes match current built identity |`.local/topology059-source-equivalence.log`; `.local/topology059-tested-identity.json`|
| Formatting / repository |Prettier pass;0repository failures; git whitespace check pass |`.local/topology059-format-final.log`; `.local/topology059-check-final.log`|
| Full standalone runtime aggregate |776passed;0failures,skips or cancellations; original build-cli30second deadlines unchanged |`.local/topology059-runtime-accepted.log`|

The earlier concurrent runtime attempt passed775/776: its unchanged build-cli30second child deadline expired while browser/axe/audit workloads ran. No deadline/assertion was changed. That failed attempt is superseded by the standalone776/776receipt above. Earlier contrast, premature-build test, mobile letter-stacking and omitted-control/UTF8/404/deadline findings are documented in analysis.md and repaired in their owning source/artifacts.

## Limits

The map is a public build snapshot, not a live graph of saved user records. Dynamic companion controls are observed separately in the ignored local runtime report; different private state can expose different controls. Runtime control labels are bounded to400per target (the duplicate-review view reports414total, with400control rows retained); tab labels are captured separately. This does not truncate the page/feature topology or static control inventory. No every-action, current-game accuracy or external-provider availability certification is made. Non-page resources/external links are inventoried, not remotely verified. No real mission catalog is populated by this feature.

Native buttons/readable lists provide keyboard and no-JS alternatives. Chromium/Firefox screenshots include desktop and320px200%light/dark views; actual screenshots passed independent visual review. WebKit functional/layout/axe checks run, while screenshots follow the repository’s existing CSP-safe capture policy. Axe SVGmeasurement uses its own browser so tool-injected styles do not weaken server CSP or functional health checks. No physical-device or formal WCAG certification is claimed.

Original user screenshots, credentials, private values and source captures are not committed. Runtime audit files and screenshots stay ignored/local. Guide/map/Studio/manager previews remain local; no remote merge, push or deployment is authorized or performed.
