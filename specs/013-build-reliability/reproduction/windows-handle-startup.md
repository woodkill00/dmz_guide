# Native Windows handle-fixture recurrence

## Assessment

The previously approved source head b54b2312e27a008b75bad04ab7f342ae4ef68ba6 passed real Windows exclusive-open rename denial in run 39764754220. The later documentation-only head 2f3d47a5e3fc6ba04d0ba67f42cc3e25255901cc failed that unchanged fixture in [Windows job 119785900460](https://github.com/woodkill00/dmz_guide/actions/runs/39767321546/job/119785900460): `Windows handle fixture did not become ready`, empty stderr, 7027.6382 ms including cleanup; 274 tests, 273 passed, one failed, zero skipped. Later build/browser/package steps were skipped. There was no native rename assertion on that attempt. A matching failure was reported by the separate 014 integration owner; it is not counted here as an independently inspected reproduction.

The old fixture launches powershell.exe and waits five seconds for its sole READY marker. On timeout it waits another two seconds, kills, and returns without observing exit. Its failure diagnostics omit stdout, spawn/exit state and script-start timing. Therefore the log demonstrates a fixture setup failure but does **not** prove cold startup, failed acquisition, or a product promotion defect.

The actual failed job repeatedly logs its shell as C:\Program Files\PowerShell\7\pwsh.EXE. Prefer that already present host when available, preserving the exact FileShare.None operation, deadlines and OLD assertions. Add a script-start marker before acquiring the handle, retain READY only after acquisition, and report bounded timing/output diagnostics plus confirmed cleanup. Do not retry, extend the five-second deadline or silently skip a startup failure.

## Review and verification boundary

The independent reviewer approved this bounded direction before implementation. The exact test-only source diff was subsequently independently approved before local commit. Linux can check syntax and unaffected runtime regressions, but cannot exercise Windows sharing behavior. The next hosted Windows run must prove native denial and record helper timings and normal exit. The separate WebKit Studio theme-wait failure in the same overall run remains outside this repair and with its own review owner.
