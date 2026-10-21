# Contributing

Thanks for helping make the guide useful and trustworthy. The application is not built yet. Evidence, documentation review, accessible design feedback and tests are valuable contributions now.

## Choose your path

- Incorrect or missing game information: use the content-correction issue form and [content contribution guide](docs/content-contributing.md).
- Reproducible software problem: use the bug-report form. Security problems follow [SECURITY.md](SECURITY.md), not public issues.
- Feature or design idea: use the feature-request form. Describe the player problem before a preferred implementation.
- Code or documentation: follow [quickstart](docs/quickstart.md), [change types](docs/tutorials/change-types.md) and the [Spec Kit cycle](docs/spec-kit-cycle.md).

## A reviewable contribution

1. Read the constitution and check existing issues/specifications for overlap. Agree on substantial scope before writing a large patch.
2. Work on a branch or fork; keep one purpose per pull request. Never push secrets or personal player data.
3. Create or select the owning change artifacts. Link requirements, tasks and evidence rather than checking generic boxes without support.
4. Make the smallest change, update affected documentation and record how to undo it. Add regression tests for behavior; explain honestly when an existing test cannot run.
5. Run the documented checks. Include commands, results and environment in your pull request. Screenshots supplement tests; they do not replace them.
6. Request an independent review. Address findings in the owning artifacts as well as the implementation. Merge authority belongs to the repository maintainer.

Reports need sanitized, minimal examples. Remove usernames, IDs, chat, credentials, browser tokens and private inventory exports. For an image, provide only an authorized cropped/redacted illustration; do not upload private reference screenshots or copyrighted game assets without rights.

## Review standard

A reviewer checks scope, traceability, factual applicability, asset rights, privacy, accessibility, test evidence and rollback. Checklist completion means the named criterion was actually assessed. Missing evidence remains a blocker or a clearly documented limitation, not an invented pass.

Follow the [code of conduct](CODE_OF_CONDUCT.md). Original project code uses MIT. Do not assume third-party content becomes freely redistributable. State provenance and permission for each asset; maintainers must verify its separate rights before merging.
