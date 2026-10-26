import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyWorkspace } from "../src/workspace/model.ts";
import {
  acceptReview,
  undoReview,
  splitEntity,
} from "../src/workspace/review.ts";
const p = (id: string) => ({
  key: id,
  sourceId: "official",
  snapshotId: "s",
  recordId: id,
  title: `Claim ${id}`,
  category: "Facility",
  x: id === "a" ? 10 : 20,
  y: 30,
  applicability: {
    mapId: "hajin",
    coordinateVersion: "hajin-official-v1-4096",
    gameBuild: null,
    floor: null,
  },
  lineages: ["same-official-upstream"],
  registrationId: "r",
  mappingVersion: 1,
  activity: "unknown",
});
test("review selects fields without averaging, preserves correlated lineage and supports split/undo", () => {
  const s = emptyWorkspace(),
    a = p("a"),
    b = p("b");
  const e = acceptReview(s, [a, b] as any, {
    titleKey: "a",
    positionKey: "b",
    categoryKey: "a",
    reviewer: "Me",
  });
  assert.equal(e.x, 20);
  assert.equal(e.title, "Claim a");
  assert.equal(e.independentLineages, 1);
  assert.deepEqual(e.refs, ["a", "b"]);
  splitEntity(s, e.id, [a, b] as any, "Me");
  assert.equal(s.entities.filter((e) => e.acceptance === "accepted").length, 2);
  undoReview(s, "Me");
  assert.equal(s.entities.filter((e) => e.acceptance === "accepted").length, 1);
  assert.equal(s.entities.find((x) => x.id === e.id)?.acceptance, "accepted");
});
test("unknown applicability cannot bridge conflicting known floors or builds", () => {
  for (const field of ["floor", "gameBuild"] as const) {
    const a = p("a"),
      b = p("b"),
      c = p("c");
    b.applicability[field] = "upper" as any;
    c.applicability[field] = "lower" as any;
    assert.throws(
      () =>
        acceptReview(emptyWorkspace(), [a, b, c] as any, {
          titleKey: "a",
          positionKey: "a",
          categoryKey: "a",
          reviewer: "Me",
        }),
      /conflict/i,
    );
  }
});
