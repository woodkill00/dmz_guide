# Testing and evidence

The active plan names the public interfaces and acceptance scenarios. Routine tests inside that scope use existing authorization. New material scope decisions are clarified before dependent implementation.

- Reproduce the actual symptom, then keep a regression at a boundary that can detect it. Expected values come from independent examples/specs.
- Use `npm run test:skills` for offline tooling negatives and `npm run skills:check` for real installation integrity. Static checks do not evaluate decisions.
- Existing guide checks are in package.json; Python structural checks use scripts/check-python.mjs. Root code uses Node; map-specific TypeScript checks belong to the map workspace.
- Browser health and server ownership guards remain strict. Await ordinary completed navigation where needed; intentional interruption tests must retain their original oracles. Distinguish fixture cleanup from product behavior.
- For UI changes measure rendered card/container widths, narrow screens, enlarged text and keyboard behavior using real controls. Images supplement behavioral evidence.
- Record exact command, environment, result, applicable scope, failure cause and limitations. Never call an unexecuted command green.

`npm run skills:pilots` only creates fictional OS-temp exercises. Fresh actors choose/execute installed helpers, run original failing and repaired checks and leave sanitized receipts in the owning feature. Review/handoff/resume/retrospective and all twelve capabilities have explicit assignments in [the exercise matrix](../../specs/110-agent-workflow-quality/plan.md). File discovery, direct-path execution and automatic UI discovery are distinct observations. Before merge, actual current-head CI is mandatory.
