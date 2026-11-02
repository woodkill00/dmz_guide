# Plan / tasks / analysis

Use a lazily imported guarded report reader in scripts/serve.mjs, following existing optional local-image paths. Parse only bounded local JSON; validate known target identities/URLs and render with the trusted site renderer, never read/serve the saved HTML. Keep loopback and method/path checks before read. HTTP page uses ordinary external site CSS and original CSP. Sitemap link and runtime node document generated-versus-runtime coverage. No new dependency, migration, data collection or public deployment.

- [x] T001 define/independent review.
- [x] T002 guarded reader/validation/trusted rendering and server route.
- [x] T003 sitemap link/runtime inventory/docs.
- [x] T004 pure/HTTP/browser regression and build/check/format.
- [x] T005 independent final gate/local preview.

Original cause is delivery through a source-file viewer, not incorrect HTML MIME for existing static routes. New route must avoid broadly exposing ignored local artifacts or trusting executable HTML. Existing asset-reader helper supplies path/symlink/byte protections. Tests use disposable reports; current ownerreport only read.
