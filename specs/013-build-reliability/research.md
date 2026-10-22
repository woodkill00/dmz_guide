# Research and decisions

## Staged output
Decision: sibling candidate + retained previous tree with explicit rollback, serialized by a build-only lock. Rationale: existing build deletes dist before writes; the second-write EIO reproduction loses OLD bytes. Alternatives: replace files in place (partial mixed output), delete dist then rename (loses old), claim atomic directory swap (not portable and false on Windows). Controlled failure evidence is required; hard-crash availability is not guaranteed.

## Readiness identity
Decision: child successful-bind stdout marker + live child + exact expected response bytes. Rationale: current serve.mjs emits its address only in the listen callback, so successful unrelated HTTP is insufficient. No need to add a test token to the public server. Port reservation race fails safely through bind identity. A2/C12 share behavior, not necessarily language implementation.

## Runtime support
Decision: explicitly test documented Node 22/24 majors, full Linux/Windows browser coverage on 22, one Node24 Linux compatibility job. Rationale: avoids dependence on runner defaults and unnecessary matrix multiplication. Official setup-node SHA was verified before writing CI; provenance is below. This is selection of runtime, not installation of speculative dependencies.

## Concurrent source save
Decision: investigate actual catalog guards and controlled interleaving; do not add locks based on source suspicion alone. Rationale: catalog.mjs already checks pending author journals and revalidates metadata/inventory. The repeated-save ABA defect is now established by a deterministic actual-build harness; see reproduction/a4-analysis.md. The narrow existing-mutex repair passed separate independent requirements review and integration-owner path approval, while the tested single-save protections remain acknowledged.

## Process record
Manual full feature-cycle repair fallback, following the actual pinned Spec Kit v1.2.2 skill instructions and explicit SPECIFY_FEATURE_DIRECTORY. The optional bug extension and workflow runner are not installed or claimed run. No .specify/extensions.yml exists, so there are no before/after hooks. Constitution reviewed unchanged. Specify template resolution, feature context and setup-plan scripts executed. Clarification found no blocking product question; implementation ownership/review remain explicit gates.

A3/C12/A2/A1 requirements checklist was independently approved; integration owner approved production paths, with browser entrypoint integration preserving concurrent 011/012 additions. Initial read-only analysis covered 8 FR and 4 SC with 18 mapped tasks and no contradiction; the subsequent FR-009 amendment requires its own analysis/review.

## Verified CI action provenance

Official actions/setup-node v7.1.0 was resolved on 2026-10-22 through GitHub's release/ref APIs to commit `949feb2413d6458794dcd2491c4babbbce0c15c1`; the tag is a commit, not an unpeeled annotated tag. Official action.yml confirms node-version input and Node24 action runtime. References: https://github.com/actions/setup-node/releases/tag/v7.1.0 and https://github.com/actions/setup-node/blob/949feb2413d6458794dcd2491c4babbbce0c15c1/action.yml . No registry auth, token customization or package cache is configured. Repository Python checks now also explicitly select Node22 because the new extracted-release regression invokes Node; this does not add another platform-major combination.

## Amended read-only consistency analysis

The approved FR-009 amendment and source-review corrections were checked against 9 FR, 4 SC, four user stories, the ten constitution principles and 25 mapped tasks. Every requirement has a test/implementation task; no unmapped production work, critical ambiguity or remaining blocking contradiction found. Narrow author-store permission supersedes only the originally excluded export; author.mjs/catalog.mjs and recovery schemas remain unchanged. Runtime promise wording in README and packaged START-HERE received a literal-only integration-owner grant and is aligned; this is not a new runtime expansion. Final acceptance still requires source review and actual Linux/Windows CI; these are not inferred from requirements approval.
