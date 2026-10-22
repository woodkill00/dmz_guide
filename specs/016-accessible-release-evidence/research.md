# Research decisions
- Choose bounded description array over dynamic map: current schema editor renders arrays, while object renderer enumerates fixed schema properties. Avoid broad validator/editor expansion.
- Choose usage-specific descriptions over asset-global text: same asset can convey different information per record. Legacy omission remains compatible.
- Keep rights captions separate from alternative text; no fabricated descriptions.
- Treat recovery archival eligibility conservatively: completed receipt+backup consistency is evidence, not proof history may be deleted. changes() uses old receipts for deleted managed-path inventory.
- Full archive inventory covers payload and explicitly excludes manifest self-digest circularity. Hashes prove consistency, not authorship.
- Keep deterministic ZIP work separate from scope13–14.
