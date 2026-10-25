# Research Decisions

- Decision: additive `tools/hajin-map` package. Rationale: destination already ships a different native map/list application; replacing its root package/source would discard accepted behavior. Alternative rejected: unrelated-history merge/overwrite.
- Decision: preserve the existing viewer's pinned dependencies within the tool lock. Rationale: source parity without changing root native runtime dependencies. Alternative: porting the renderer now would expand a commit/integration request into a redesign.
- Decision: no downloaded map/icon/point snapshots in public history or release artifacts. Rationale: existing rights review is unresolved and destination rules forbid unlicensed redistribution. Alternative: bundling retrieved resources is not acceptable.
- Decision: source snapshot and image failures are valid local startup states; owner assets can be copied locally. Exclude the original research acquisition helpers from public integration rather than introduce a remote import/writer surface. Future acquisition tooling needs a separate transactional, bounded design/review. The viewer itself never downloads source-site resources.
- Decision: clean-checkout tests generate original pixels and clearly synthetic locations and route them locally. Rationale: no game asset access/network dependency in CI. Manual source-reference checks remain separate and are not relabeled synthetic CI evidence.
- Decision: port 5175 and test-owned server. Rationale: do not interrupt the user's existing port-5173 preview or guide/Studio services.

No unresolved research questions. Hook configuration is absent; no extension hooks ran.
