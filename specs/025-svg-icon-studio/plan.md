# Implementation Plan: SVG icon studio
Branch feat/025-svg-icon-studio;2026-10-28; [spec](spec.md).

## Summary
Compose original bounded SVG primitives from a validated recipe, show image previews, rasterize the generated image to256px PNG, then reuse existing icon sanitation, content hash, library/category/POI and transactional storage. Store optional version1 recipe on IconAsset for re-edit/export; no general SVG parser or third-party symbols.

## Technical Context
TypeScript5.9, DOM/Canvas, existing Vite7/Leaflet; no new package. IndexedDB existing workspace version/schema with additive optional recipe; Node tests and offline Playwright. Desktop and360px browser. Existing32icon/8MiBicon/20MiBworkspace limits remain; recipe has fixed fields and small strings. Live preview synchronous small data-URI image; encoding bounded by abortable10second deadline.

## Constitution Check
Pass before/after design: private/local, accessible controls and alternative numeric inputs, no game facts or remote art, strict untrusted recipe validation, existing transactional rollback/revision checks, old backups valid. No amendment needed.

## Structure and phases
icon-design.ts pure validation/templates/SVG serialization; icon-studio.ts DOM editor plus controlled encoding; icons.ts generated-icon staging and recipe validation; model.ts/backup.ts additive recipe; app.ts mount/reopen/export library actions; styles.css responsive preview controls; tests/icon-design.test.ts and scripts/icon-studio.browser.cjs.

## Alternatives and risks
Arbitrary SVG import/path editor would introduce a separate security/editor scope. Restrict to generated primitives and escaped title/label; never trust a stored markup string. Keep PNG as runtime image for current portability and backup budgets. Editing saves a copy; content-identical images reuse existing icon and keep existing metadata/recipe, attaching a recipe when a raster-only match has none. Only one icon form owns a dirty draft; other creation/upload/library forms become visibly inert until save/cancel. Canvas text rendering follows local system font; downloaded vector text remains text. Draft guards and processing lock prevent stale/lost edits; failure leaves draft available. Preview/export independent from persistence. Generated recipes optional and strict-key validated on restore.

## Verification
Pure validation/hostile fields/limits/deterministicSVG and backup tests. Browser create→save→assign→reload→copy→downloadSVG/PNG→restore; same image dedup; invalid/cancel/dirty/stale/quota protections;360px keyboard and no remote requests. Full unit/build/browser/repository checks. Independent reviewer quality and implementation checks; read-only analyze then separate fixes/converge.
