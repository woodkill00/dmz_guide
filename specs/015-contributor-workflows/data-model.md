# Data model
Recovery envelope exact keys: format='dmz-repository-draft-recovery', version=1, warning (bounded string), packKey (safe catalog key), expectedRevision (64 lowercase hex), pack (published validated catalog), uploads (array of exact assetId/base64/category). Historical revision is displayed, never assigned to active revision. Category uses the existing upload categories; no paths accepted in uploads.

State: empty → validating → preview (candidate plus generation/destination) → explicit apply → dirty draft → fresh save review → existing repository save. Cancellation or any mutation increments generation and aborts decode. No parser writes. Rights checkbox starts unchecked for each preview. Incomplete/rejected import retains current draft and original local file.

Existing destination requires current key and catalog ID match. New destination rejects existing key/ID collisions and generates a safe new key rather than trusting arbitrary paths. Every asset must be uploaded/decoded or match current repository source and corresponding metadata; rights are required for all images. Preview normalization then validates final pack and aggregate normalized bytes.

Normalization must re-check the 2 MiB per-image and 8 MiB aggregate byte limits after decoding/re-encoding. Check signal/generation after every asynchronous operation and before assigning a preview. Destination must still match the selected catalog at apply; changing destination or switching catalogs invalidates the review.
