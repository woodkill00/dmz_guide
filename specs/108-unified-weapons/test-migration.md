# Browser contract migration

The legacy public renderers remain tested as pure components. Published build pages use unifiedFeaturePages and legacy addresses are aliases; historical page-specific selectors must not be used to assert a second independent persistence controller still exists.

- armory.mjs: same source/effect/slot/empty filtering, catalog link, native links and 48 theme/text layouts, now via context picker and reference tab.
- gunsmith.mjs: compact context search/empty/class/keyboard selection replaces the removed preview roster. Slot links, base figures, unknown bars, builder context/no implicit writes, invalid selectors, 64 layouts, cold corrupt-art fallback and native navigation retained.
- armory-workbench.mjs: existing build/evidence/import/restore/cancellation/picture/stale-CAS/quota/40-layout tests retained. Attachment ownership now has its own tab; a retained-save UI is disabled and the mutation guard is additionally exercised with a synthetic event.
- weapon-acquisition.mjs delegates the merged workflow to unified-weapons.mjs: manuals/count/known+custom blueprints/attachments/camos/shared keys, root/detail/legacy reload, held-save locks, quota candidate export/retry, stale write refusal and draft departure cancellation. Additional cases retain unknown/zero/max counts, correction retention/no increment replay, corrupt envelope preservation/export and storage denial. Catalog/normalized ownership/backup admission remains covered by original runtime domain tests.
- codmunity.mjs enters reference tab instead of assuming its source table is initially visible.
- Home/dashboard/hub tests now assert the canonical weapon link while preserving stable legacy feature identities. The Home mindmap places /armory/ directly beneath Home and the old hub as a compatibility child. Guide/FOB hub no-write checks remain; Weapons is now the actual tracker and may read its private armory, but opening it must not create saved progress (revision0).

No raw player browser profile, inventory or private screenshot is used by these tests; browser contexts contain labelled synthetic records.
