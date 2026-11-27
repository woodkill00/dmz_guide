# Data model

No persistent model migration. Existing quality index v1 fields and review bindings remain authoritative. Additional findings use stable IDs scoped to weapon/camo/field, a fingerprint including relevant source context, finite same-site reader/editor routes, plain messages and existing caps/spoiler guards. Quality findings remain editorial, not player completion. Coverage reports count only admitted public records and disclose omissions/truncation.

CI result is one of success/failure/cancelled/skipped; only every dependency success passes the aggregate. Private backup uses local manifest/hashes and separate owner bundle; never loaded by builds or tests.
