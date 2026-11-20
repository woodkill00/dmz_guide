# Implementation plan: Unified local site

Node22/24, existing Vite7.3.7/Leaflet, ESM/TypeScript and PowerShell; no new package/service. Serial implementation on095 in current checkout; staged predecessors retained. No production before independent planning gate.

## Constitution and clarification

Private/source boundaries, keyboard/mobile and bounded imports retained. One public reader origin; author opt-in4174; standalone5175 explicit recovery/development only. No automatic migration/shared-store merge, Git operations or asset publication. Defaults resolve scope without a blocking user question.

## Architecture

1. Build map frontend with base`/map/`, copyPublicDir:false and existing seven HTML entries. Separate fixed ignored local artifact root uses existing publishBuild candidate/last-good/lock recovery. Validate entrypoints/manifest/source fingerprint before publication. Map public imagery/captures remain unchanged outside the bundle. Standalone build/dev stays base`/` unless unified selected.
2. Mount finite map handler before guide method/static fallback in serve.mjs. Canonical paths map to known entries; legacy HTML aliases stay under `/map/`. Serve compiled files and audited public-map assets via bounded regular-file/jail checks, MIME/HEAD/cache/CSP. Unknown map paths404, never guide fallback. No persistent Vite process. Portable guide-only server mode retained.
3. Adapt existing reference/source-update plugins under `/map/__references` and `/map/__map-updates`, stripping only fixed mount paths while preserving Host/Origin/token/body/method restrictions and owned disposal. No arbitrary remote URL or private/source-directory proxy.
4. Prefix map URLs only at runtime fetch/image/link boundaries, keeping stored snapshot paths/IDs unchanged. Vite rewrites static imports/styles. Shared feature registry, deep highlights and handoffs use map namespace; map→guide uses current origin when unified and legacy guide origin only standalone. Keep strict window/origin/nonce protocols.
5. Cross-platform Node startup and existing PowerShell wrapper build artifacts as requested and start one listener. Exact nonsecret status identity detects existing correct service; unrelated occupied port refuses without killing/rebinding. SkipBuild requires valid existing bundles. Each app has its own last-good build boundary; failed preparation never reports combined readiness. No combined atomic-publication claim.
6. Compact migration link/help preserves old5175 state. Explicit legacy command enables original backup tools; existing workspace/X01 codecs own restore validation/CAS/permissions. Map-only localStorage preference envelope uses finite audited allowlist,3MiB envelope/2MiB road cap, exact target review and explicit apply/rollback. No guide inventory/armory/key import. Audit DB/settings namespaces; do not infer empty new-origin data means loss.

## Verification

Pure URL/routes/preferences and namespace inventory. HTTP fixture canonical/alias/HEAD/MIME/CSP, encoded traversal/symlinks/method/origin/token/unknown paths and missing bundle; frontend failure preserves old artifact. Startup duplicate/occupied/ownership/shutdown. Three-browser synthetic all maps/floors/markers/icons, guide↔map, saved reload, highlights/handoffs and legacy restore/conflicts with unchanged guide state. Affected guide/map runtime/typecheck/build/browser and guide-only package checks. Actual4173 smoke with5175 stopped only after recovery options/artifacts ready. Independent task→analysis→fix/convergence and implementation review; no invented CI/physical-device/factual accuracy claim.
