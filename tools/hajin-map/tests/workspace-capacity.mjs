// Foundation capacity probe; T015 will add comparison/rendering timing acceptance.
import assert from 'node:assert/strict';
import { parseSnapshot, validateSnapshotCollection, LIMITS } from '../src/workspace/validation.ts';
import { syntheticSnapshot } from './fixtures/workspace.ts';
const started = performance.now();
const snapshots = Array.from({ length: LIMITS.sources }, (_, i) => {
  const source = `synthetic-${i}`;
  return parseSnapshot(JSON.stringify(syntheticSnapshot(source, LIMITS.recordsPerSource)), source);
});
validateSnapshotCollection(snapshots);
assert.equal(snapshots.reduce((sum, snapshot) => sum + snapshot.records.length, 0), LIMITS.recordsTotal);
assert.throws(() => validateSnapshotCollection([...snapshots, snapshots[0]]));
console.log(JSON.stringify({ synthetic: true, stage: 'foundation-validation', sources: snapshots.length, records: LIMITS.recordsTotal,
  elapsedMs: Math.round(performance.now() - started), comparisonAndRenderingAcceptance: 'pending T015' }, null, 2));
