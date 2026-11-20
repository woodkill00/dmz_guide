# Research and decisions

Guide4173 uses a bounded Node static server; map5175 currently runs Vite with seven entries, two local API plugins, explicit separate stores and root-relative URLs. Vite currently copies public files, unsuitable for silently including private local map assets in releases.

Decision: compiled map frontend in same server, rather than iframe or second reverse-proxied Vite listener. Reuse candidate/last-good build publisher; guide/map have separate publication boundaries. Explicit standalone map development/recovery remains.

[Vite7 base/publicDir](https://v7.vite.dev/config/shared-options) and [copyPublicDir](https://v7.vite.dev/config/build-options) support namespaced code-only builds. Use installed7.3.7 options rather than later-major API. Local assets are served separately, not copied into guide archives.

[MDN same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy) and [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB) explain why4173 cannot read5175 storage directly. Choose explicit validated export/restore and retain original origin, rather than silently copying/inventing state. Stores `dmz-map-workspace`/`dmz-x01-workbench-v1` are distinct from guide `dmz-guide-local`/`dmz-armory-local`/`dmz-keys-local`; preference keys/handoffs need audited implementation proof.
