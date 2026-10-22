# Independent evidence safety requirements gate

Reviewed 2026-10-22. Checked boxes approve requirement clarity only, not implementation/runtime evidence.

- [x] CHK001 Usage-specific meaning, explicit decorative empty text and legacy fallback are mutually clear; rights remain separate. [FR001–003; Plan image contract]
- [x] CHK002 Metadata has numeric limits, unique attached identities and shared schema/import/recovery/editor semantics with spoiler-safe escaped rendering. [FR002–003; T005–007]
- [x] CHK003 Retention counts and bytes distinguish complete/partial state and require verified receipts/backups; uncertainty/pending/locks/races prevent positive eligibility. [FR004–005; bounded inspection contract; T008–009]
- [x] CHK004 Inspection has numeric scan/read/depth bounds and explicit no-follow/no-write/no-delete behavior, with archival review not deletion authorization. [FR004–005; Plan bounded contract]
- [x] CHK005 Full payload/self-exclusion, exact archive inventory, duplicate/normalization/path/type/size rejection before execution are explicit. [FR006–007; Plan archive contract]
- [x] CHK006 Captured source/schema/build inputs, snapshot timing, stale-output handling, no-Git/dirty behavior and lock-order guarantees are concrete and approved. [FR008; T010–012]
- [x] CHK007 Cross-owner renderer/Studio integration, legacy compatibility and platform/health/actual200% gates remain explicit. [FR009; T013–014]

Decision: partial requirements approval permits T005–009 only after red-first/analyze and ownership gates. T010–012 production remains blocked pending CHK006 and integrator approval. Whole-feature source/runtime acceptance remains pending.

Identity gate resolved: exact staged output digest inventory excludes identity self-hash and is checked against complete dist before packaging; static source provenance is honestly observed-stable rather than pre-execution/authenticated. Captured catalog/media hashes remain inside existing repository snapshot; later saves remain valid. CHK006 approved after independent review; T010–012 production may proceed under integrator ownership and required baseline/analyze gates. Runtime/source acceptance remains separate.
