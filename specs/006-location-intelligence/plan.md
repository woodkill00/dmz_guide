# Implementation Plan: Location intelligence
Branch 006-location-intelligence. Spec: spec.md. Pinned Spec Kit v1.2.2. Status: design awaiting reviewer gate.

## Summary
Implement a native /maps/ route with shared list/map filter state, inert SVG coordinate presentation, local raster support and honest goal relevance. Trace 001 FR10/A11/A12 to LI-001–008.

## Technical Context
Existing Node ES modules, static renderer, browser modules and IndexedDB. No new dependency. Owned files: src/domain/locations.mjs, src/client/maps.mjs, src/ui/maps-page.mjs, tests/runtime/locations.test.mjs, tests/browser/maps.mjs and this specification tree. Parent integrates build route/styles/common/planner contracts. Validated content limits bound input. No persistence or schema migration in this slice.

## Constitution Check
Pass by design: player utility through map-equivalent list; keyboard/mobile alternatives; source/unknown honesty; profile/content separation; explainable item intersections; inert text and validated local raster only; isolated reversible files; unit/browser evidence and independent review required. No new publication or game semantics. Post-design pass unchanged.

## Project Structure
Pure coordinate/filter/relevance functions in domain. Client owns one filter state and selection, camera viewBox, SVG markers and accessible HTML list. Native route body exports featurePages(packs). SVG uses attributes rather than inline styles under CSP. User images remain raster and use local validated Blob URLs only. No automatic source fetch.

## Phase 0 research
See research.md. No unresolved design question; coordinate semantics locked to schema-supported axis/origin combinations. Reject inconsistent unsupported transforms rather than guess.

## Phase 1 design
See data-model.md and contracts/ui.md. No shared-contract edits by worker. Parent supplies shared plan adapter and imported-overlay discovery. List is authoritative; plot is subset with explicit counts and unplottable reasons.

## Verification
Pure tests: three non-collinear points, nonzero bounds, y inversion, invalid/outside coordinates, floors, source/category/search and actual need intersection. Browser tests exported runMapsTests: default real list/zero markers; demo opt-in floor/parity/detail; query/category/source; keyboard selection/camera; missing imagery/list fallback; goal no-relation/context switch. Parent hosted Google Chrome CI runs sandboxed browser tests and screenshots because local socket sandbox is blocked; do not retry disabling sandbox. Tests not run are recorded pending, never passing.

## Dependencies and risks
004 shared plan output and 005 validated local raster payload contract must be confirmed before adapter implementation. Shared CSS hook required for readable SVG focus and responsive controls. Stale profile or unsupported plan yields no recommendation. No remote assets or routing. Out-of-bounds coordinate edits are visible list-only, no clamping that would imply precise placement.
