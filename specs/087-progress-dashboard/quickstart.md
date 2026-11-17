# Quickstart and verification journeys

Implementation has not begun. After T001–T016, build with `npm run build`, start with `npm start`, open `http://127.0.0.1:4173/`. Use synthetic test state only for committed evidence; never overwrite the owner's real browser data for testing.

1. Existing saved profile: compare dashboard ingredient/other-need counts with Quick collect and Inventory under the same pack/options. Builds request additional output even if output is already owned. Show shared totals separately.
2. Add found from a tile: verify exact quantity/history update after save, retain panel/focus/scroll, then open Inventory and return. Simulate quota/conflict: no success totals, draft remains, retry is guarded.
3. Complete an upgrade or Order on its owning page and return: current tier/count changes. Verify Hajin and X01 separation and protected stories. Audit status does not count as player completion.
4. Recipe/weapon ownership: toggle item blueprint in Inventory and update recorded acquisition in Armory; verify each section refreshes without invented missing-weapon-blueprint totals or cross-ID joins.
5. Storage absent/blocked/stale: opening home makes no new player DB/profile. Show setup/review/recovery, not fake zero stock. Armory failure leaves profile sections available.
6. Switch catalogs rapidly, return using bfcache, edit in another tab then focus home, and switch catalog with an unsaved amount draft. Stale results never repaint a different context; drafts are never silently rebased.
7. Review both presentation variants at 320/390/768/1280/1920px and 200% zoom. Use keyboard and touch to open/close panels and groups independently. Verify safe missing-image fallback and no horizontal overflow or focus/scroll jumps.
8. Large catalog: initial 12 tiles/section, five progress rows, explicit total/View all, 50-row collection pagination. No private armory images or full weapon art preload.

Required evidence: focused domain tests, browser journey in Chromium plus applicable Firefox/WebKit and configured axe gates, repository checker, full runtime/build, format/diff checks, independent review and convergence record. Existing home test expectations must be updated for intentional hierarchy changes while retaining meaningful navigation/storage assertions.

Additional required journeys: successful stock commit followed by failed reread exposes Verify saved update and cannot add the delta again; held commit across departure and late acknowledgements preserve context. Compare Needed with crafting=false and true; retain Not entered/assumed-zero versus explicit zero. With 100 targets, assert initial and expanded global DOM caps; navigate replacement pages without accumulating nodes. Hold IndexedDB reads beyond 1500ms and return late-open connections to prove abort/close behavior.

Deterministic count options: Needed starts with crafting=false; test both alternatives toggle states against Quick collect. Unknown held stock must read Not entered/assumed-zero estimate; explicit zero remains a recorded zero. For 100 build targets with many ingredients verify <=3 initial group headers, <=12 initial build tiles, <=5 expanded headers, <=50 expanded build tiles, <=50 Needed tiles, and <=2 open detail panels across both sections; paging replaces nodes. Hold reads past 1500ms and across pagehide/pack switches, assert transaction cancellation/late connection closure and no stale paint. Hold a write across departure, and separately fail its post-commit reread: no duplicate stock delta or retryable Add button for unresolved outcomes.
