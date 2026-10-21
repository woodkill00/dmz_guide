# Bundled raster requirements quality

Reviewer-owned extension of F008-07, created 2026-10-21. A checked marker means the requirement is clear and complete, not that implementation or release passed.

- [x] BR001 Is the published no-JavaScript/no-storage picture journey specified separately from private portable bytes? [F008-07]
- [x] BR002 Are repository paths, injective pack isolation, canonical output URLs, extension/MIME and collision rules explicit? [Bundled raster API]
- [x] BR003 Are every-ancestor symlink rejection and public copying allowlists specified to prevent private/raw file publication? [Bundled raster API]
- [x] BR004 Are file, aggregate, pixel, manifest, depth, node, string and timeout limits numerical? [Bundled raster API]
- [x] BR005 Are build structural/integrity checks distinguished from actual bounded browser decode and readable codec-failure fallback? [F008-07; reviewer clarification]
- [x] BR006 Are selected pack/version/asset metadata equality and changed-private-overlay precedence defined without stale pixels? [Bundled raster API]
- [x] BR007 Are source/rights and spoiler disclosure constraints explicit for static and dynamic pictures? [F008-07; Bundled raster API]
- [x] BR008 Are missing-source hard failures, runtime missing-byte fallback, adversarial fixtures and clean-profile/no-JS acceptance included in tasks? [T013–T017]

Generation: executed pinned checklist prerequisite/template command with SPECIFY_FEATURE=008-community-release; no extensions.yml hooks were present. Review follows artifact reading; implementation is not approved by generation.

Independent evaluation at 12:07 UTC: seven criteria satisfied by written contract/plan/tasks. BR005 is pending the agreed explicit structural-versus-compressed-decode clarification; no new codec dependency is required. This is a requirements-only gate, not runtime acceptance.

12:08 UTC reevaluation: contract clarification committed0dfbeee explicitly separates structural/integrity checks from browser compressed-pixel decode, requires runtime corruption fallback and no-JS meaningful alt/context. BR005 satisfied; all8 requirements-quality criteria pass. Implementation, actual hosted images and final release remain unapproved until independently verified.
