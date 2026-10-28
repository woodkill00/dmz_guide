# Real-world verification — PENDING
No checkbox below is passed by code generation, a raster trace, an emulated viewport or automated accessibility.

- [ ] Sample all11starter road segments against actual gameplay; record date/game build, road-network file digest, screenshots and observer. Check at least one route bend/junction per segment, including roads near map margins.
- [ ] Check bridge levels, tunnels, gates, blocked roads, vehicle clearance and one-way access. Geometric crossings without a shared node must not become junctions. Record unknowns; do not infer access from the raster.
- [ ] Extend disconnected/missing road coverage by explicit endpoint/junction tracing or an authorized topology import. Keep partial coverage/unverified status until evidence supports changes. A successful graph solve alone is not proof of a drivable route.
- [ ] Compare distributed POI positions/names/floors to owned observations, attach evidence/date, inspect stale source changes and uncertain duplicate pairs. Keep possible spawn separate from currently active observations.
- [ ] Verify off-road connectors visually.160image pixels are not160game meters; inspect whether access is possible rather than treating straight connectors as roads.
- [ ] Actual touch device: choose locations, pinch/pan, Up/Down waypoint controls, scrolling, file picker/download, orientation and recovery. Desktop native drag and emulated360px do not prove touch behavior.
- [ ] Actual screenreader: navigation, location selection, numbered stop order/reordering focus, calculation/errors/status, evidence/date forms, public preview/apply, duplicate queue and road import confirmation. Automated axe is not certification.
- [ ] Retain private backup plus separate local road file/background/captures, restore on the intended separate device/profile and resolve missing/stale stops explicitly. Do not discard originals until inspected.

Evidence log: checkID | observer/date | device/browser/game build | network/capture digest | private evidence path | actual pass/fail/unknown | follow-up.
