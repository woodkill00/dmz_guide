# US2: Main Map and Safe runs — scoped implementation evidence

Status: implemented presentation with automated slice evidence; **not default promotion acceptance**.

Actual48-entry activation per engine;21 intrinsic-layout/camera/hit-test cases;12 real suspended-write acknowledgement cases; held/denied/unconfirmed persistence and exact receipt checks; original selection controls with functional route actions. Full legacy map aggregate114 checks passed; original Safe runs full legacy and modern suites passed all three engines. Main/Safe real reload rollback passed all three engines.

Owning checks: ui-layout-browser.mjs, ui-lifecycle-browser.mjs, ui-bfcache-write-browser.mjs, ui-selection-integration-browser.mjs, safe-run-browser.mjs, ui-rollback-browser.mjs. Local receipts belong to their source/build identities and are retained under `.local/` and `tools/hajin-map/.local/`. They are not remote published artifacts or player data.

Pending: Simultaneous-state matrix completion, manual/device and final promotion gates. The final15-suite modern Map serial run passes all three engines (.local/071-map-modern-final-candidate.log); scoped ownership and pane-mode source reviews are recorded separately.

All five repository rollout records remain legacy. Explicit modern process configuration requires deliberate build/start/reload. Presentation rollback never restores or rewrites domain records. See implementation-status.md, preservation-ledger.md and manual-acceptance.md for scope and limitations.
