# Independent requirements gate
Reviewer-owned. Unchecked criteria block production edits.
- [x] CHK001 Equality scope fixes captured inputs, Git identity and tool/compressor versions and distinguishes payload from archive equality.
- [x] CHK002 Canonical metadata/order policy includes every member and is compatible with016 regular-file verifier.
- [x] CHK003 Baseline proves actual clock variance and mtime-only control avoids false causal claims.
- [x] CHK004 Two independent clean builds, changed-input sensitivity and retained versioned evidence are concrete.
- [x] CHK005 Existing bounds/inventory/source identity/security and honest acceptance limitations remain intact.

Independent reviewer requirements gate, 2026-10-22: CHK001–005 approved. Canonical writer is bounded to final ZIP serialization; two real clean committed-worktree builds and exact archive/member/manifest comparisons remain required acceptance evidence. Production source review, actual platform/runtime evidence and parent merge/main gates remain pending.
