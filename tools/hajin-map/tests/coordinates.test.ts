import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromPixels, toPixels } from '../src/map/coordinates.ts';

const space = { id: 'hajin', coordinateSpaceVersion: 'v1', width: 4096, height: 4096 };
test('corners and center round trip without swapping axes', () => {
  for (const [x, y] of [[0, 0], [4096, 0], [0, 4096], [4096, 4096], [2048, 2048], [1248, 1622]]) {
    assert.deepEqual(toPixels(fromPixels(x, y, space), space), [x, y]);
  }
});
test('rejects invalid coordinates and incompatible map versions', () => {
  for (const value of [-1, 4097, NaN, Infinity]) assert.throws(() => fromPixels(value, 0, space));
  const position = fromPixels(1248, 1622, space);
  assert.throws(() => toPixels({ ...position, coordinateSpaceVersion: 'v2' }, space));
  assert.throws(() => toPixels({ ...position, mapId: 'other' }, space));
});
