# Research decisions
- Self-contained JSON envelope instead of ZIP: no archive decompression/path/symlink attack surface or dependency; 20 MiB envelope covers 8 MiB pack plus 8 MiB raster expanded to base64 with bounded overhead.
- Strict v1 only: no genuine legacy format exists; guessed migration risks silent data loss. Clear recovery preserves original.
- Browser decode plus new-upload canvas reencoding: signature/header/hash alone cannot prove valid raster; reencoding removes screenshot metadata, but human attestation still needed for visible personal information.
- Schema-driven recursive native controls instead of JSON-only: all modeled fields remain accessible with targeted help; final canonical validator enforces semantic references.
- Atomic pack+payload snapshot: prevents dangling metadata or images after interrupted apply. Parent explicitly approved overlay extension on 2026-10-21.
- Private pack-qualified reader: avoids conflating private corrections with published factual claims.
