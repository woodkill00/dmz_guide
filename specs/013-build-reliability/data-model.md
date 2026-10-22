# Build and readiness state

- Build attempt: unique controlled id, candidate path, previous path, exclusive build-only lock, phase (`preparing`, `candidate-complete`, `previous-retained`, `promoted`). Control paths are local and ignored; no private profile data.
- OLD output: last successful complete tree. During normal preparation it remains dist. During failed promotion it is restored if possible, otherwise retained at the exact reported previous path. It is never labelled fresh.
- Candidate output: unpublished complete tree. Only a successful promotion becomes current. Validation failure or ordinary write failure cannot replace current output.
- Readiness result: child identity and exit state, successful-bind marker, expected route body hash, monotonic deadline, bounded stdout/stderr tails. Success requires all identity/content conditions; cleanup affects only that process.
- Repository snapshot: validated catalog objects and referenced bundled-asset byte arrays captured together under the existing normalized-root owner-token mutex. Released before rendering/output; pending author recovery remains untouched. Synthetic before/after fixtures prove consistency. No public data format or author transaction schema changes.
