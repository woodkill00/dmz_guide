# Implementation Plan: Page edit and picture actions

**Branch**: 010-page-edit-actions | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

## Summary
Extend the shared detail renderer with contextual actions. Build a static per-record contributor landing page with local startup instructions, explicitly clicked default-loopback deep links, custom-port suffixes and return-to-public-detail. Local saved previews instead emit direct same-origin editor links. Reuse Studio forms, save transactions and media workflows. Add location image references consistently.

## Technical Context
JavaScript ES modules, Node 22+, existing static HTML/CSS, Playwright and Node test runner. No new dependencies, accounts, runtime services or remote fetches. Source remains canonical content/catalog plus media. Author-only target helper is also usable by the build. Existing six detail groups only. Additive schema fields require no migration or version bump because existing records remain valid.

## Constitution Check
Pre-design: satisfies user value, static/public separation, factual integrity, privacy, inert imports, small slice and traceable tests. Post-design: preserve all write authorization. Cross-site document entry is explicitly separated from APIs and requires GET + browser navigation/document metadata; no cross-origin data API relaxation. No security settings or credentials changed. Independent reviewer owns requirements-quality and release approval.

## Project Structure
- src/content/author-target.mjs: strict query parser/resolver and generated editor/preview paths, using exact stable key/pack ID/record ID.
- src/ui/author-actions.mjs: public instruction landing page and action markup, escaped values and safe generated paths.
- src/ui/render.mjs, scripts/build.mjs: actions on all public details and generated static guidance pages.
- scripts/author.mjs, scripts/author-preview.mjs: validated editor document entry and direct preview actions; retain read-only/mutation boundaries.
- src/client/studio.mjs, studio-media.mjs, src/ui/studio-page.mjs: exact selection, image focus, return context, unsaved-image protection and six-group image support.
- schemas/pack.schema.json: optional location assetId/assetIds matching existing record contracts.
- tests/runtime/page-edit.test.mjs, author-server.test.mjs, tests/browser/studio.mjs: identity/security and full real image journey plus screenshots.
- docs/content-studio.md, README.md, .github/workflows/quality.yml: workflow documentation and existing hosted suite coverage.

## Risks and Alternatives
Public static links cannot know the user's port or prove a server is running. Show startup first, an explicit default address link, and copyable relative suffix for custom ports; do not fetch/probe. Bare cross-origin links to author would be rejected by existing Sec-Fetch policy, so allow only validated editor top-level GET navigation, not API/iframe/resource reads. Return links are derived from validated identity, not user-supplied URLs. Prepared workbench loss is included in existing navigation/discard guard. A per-record instruction page avoids injecting untrusted query into a generic public script and remains usable without JavaScript.

## Verification and Release
Run full format, Python contracts/tests, Node tests, build/package/release. Hosted existing Studio suite covers Chrome Windows/Linux and Firefox/WebKit; add targeted real upload/replacement/additional/library-reuse and fresh clone proofs there. Capture and independently review dark/light desktop, 390px and 320px 200%-text action/guidance/editor screenshots; retain WebKit functional-only screenshot limitation. Never disable browser sandbox to obtain local evidence. Analyze before implementation and converge after checks. Draft PR then exact-head green CI and independent review before parent-authorized merge.
