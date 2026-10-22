# Research
- Decision: exact raw field checkpoints, not JSON profile equality. Rationale: NaN serializes to null, and raw empty fields must survive. Alternative whole-profile comparison fails invalid-entry distinctions.
- Decision: native unload plus custom in-app decision. Browsers prohibit reliable asynchronous saving from unload. No claim that killed processes preserve drafts.
- Decision: shared validated export function. Two baseline code paths disagree; unify without changing profile schema.
- Decision: hosted baseline reproduction. Local sandbox-enabled Chromium failed before page creation with socket Operation not permitted; do not bypass sandbox.
- Source findings at db8a6e2: profile input directly mutates state; common change replaces it; settings export downloads null unconditionally; init locks controls only after fetches. These remain source findings until executed reproduction.
