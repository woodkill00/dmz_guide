import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boundedBytes } from '../src/map/bounded-input.ts';

test('reads bounded input and rejects HTTP errors or declared oversize', async () => {
  assert.deepEqual([...await boundedBytes(new Response(new Uint8Array([1, 2, 3])), 3)], [1, 2, 3]);
  await assert.rejects(boundedBytes(new Response('bad', { status: 404 }), 8));
  await assert.rejects(boundedBytes(new Response('x', { headers: { 'content-length': '100' } }), 4));
});
test('enforces streamed byte limit even without Content-Length', async () => {
  let cancelled = false;
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(8)); }, cancel() { cancelled = true; } });
  await assert.rejects(boundedBytes(new Response(stream), 4), /too large/);
  assert.equal(cancelled, true);
});
