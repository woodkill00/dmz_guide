# Research decisions

- Decision: use shared detail renderer, with build-time catalog identity mapping. Rationale: all public records originate in allRecords; catalog key is absent from runtime pack and must not be guessed from title. Alternatives: first matching name/index rejected; all six groups explicitly supported.
- Decision: static record-specific guidance plus explicit default-port link/custom-port suffix. Rationale: no localhost probing, no public writes, no JavaScript prerequisite, straightforward first-use. Alternatives: silent hardcoded redirect rejected; suffix-only UX rejected as needless repeated manual work.
- Decision: use validated local document navigation, same-origin selection and generated saved-preview return. Rationale: existing author Host/Origin/API safeguards remain; catalog identity catches stale or mismatched keys. Alternatives: arbitrary return URL or cross-origin fetch rejected.
- Decision: optional location picture fields. Rationale: location is a public detail type and existing validator/rendering already process references generically. Sources/claims/assets are auxiliary and remain outside public detail scope.
- Decision: replace record attachment, not media bytes. Rationale: existing Studio library creates/reuses stable assets; shared asset safety and rights checks stay intact.
- Decision: count prepared media as unsaved work. Rationale: existing dirty flag covers guided changes but not an unattached image; leaving must not silently discard it.
