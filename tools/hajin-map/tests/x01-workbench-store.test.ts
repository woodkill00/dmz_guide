import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyState,
  makeBackup,
  parseBackup,
  validatePrivateState,
} from "../src/x01/workbench-store.ts";
const point = {
  id: "custom-1",
  name: "Blue door",
  kind: "Entrance",
  floor: 1 as const,
  x: 0.3,
  y: 0.4,
  notes: "Observed near vault",
  createdAt: "2026-11-11T12:00:00Z",
};
test("X01 private backup keeps POI, observation, route and image bytes", async () => {
  const state = emptyState();
  state.points = [point];
  state.routeIds = [point.id];
  state.observations = [
    {
      id: "obs-1",
      targetId: point.id,
      date: "2026-11-11T13:00:00Z",
      build: "Season 1",
      outcome: "confirmed",
      notes: "Reached in match",
    },
  ];
  state.photos = [
    {
      id: "photo-1",
      pointId: point.id,
      name: "door.png",
      mime: "image/png",
      blob: new Blob([Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10)], {
        type: "image/png",
      }),
    },
  ];
  const backup = await makeBackup(state),
    restored = await parseBackup(backup);
  assert.equal(restored.points[0].name, "Blue door");
  assert.equal(restored.routeIds[0], "custom-1");
  assert.equal(restored.observations[0].outcome, "confirmed");
  assert.deepEqual(
    new Uint8Array(await restored.photos[0].blob.arrayBuffer()),
    Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10),
  );
  assert.equal("base64" in restored.photos[0], false);
});
test("X01 private state rejects invalid coordinates, orphan photos and oversized backup payload", async () => {
  const state = emptyState();
  state.points = [point];
  validatePrivateState(state);
  for (const change of [
    (s: any) => (s.points[0].x = 1.5),
    (s: any) => (s.points[0].name = "<script>"),
    (s: any) => (s.routeIds = ["x", "x"]),
  ]) {
    const copy = structuredClone(state);
    change(copy);
    assert.throws(() => validatePrivateState(copy));
  }
  const orphan = structuredClone(state);
  orphan.photos = [
    {
      id: "photo-1",
      pointId: "missing",
      name: "x.png",
      mime: "image/png",
      blob: new Blob(["x"]),
    },
  ];
  assert.throws(() => validatePrivateState(orphan));
  await assert.rejects(() =>
    parseBackup({
      format: "dmz-x01-private-backup",
      version: 1,
      state: {
        ...state,
        photos: [
          {
            id: "photo-1",
            pointId: point.id,
            name: "x.png",
            mime: "image/png",
            base64: "!",
          },
        ],
      },
    }),
  );
});
test("X01 restore refuses photo bytes that do not match declared image type", async () => {
  const state = emptyState();
  state.points = [point];
  await assert.rejects(
    () =>
      parseBackup({
        format: "dmz-x01-private-backup",
        version: 1,
        state: {
          ...state,
          photos: [
            {
              id: "photo-1",
              pointId: point.id,
              name: "x.png",
              mime: "image/png",
              base64: "bm90LWFuLWltYWdl",
            },
          ],
        },
      }),
    /Image type/,
  );
});
