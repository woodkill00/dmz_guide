import test from "node:test";
import assert from "node:assert/strict";
import { sourceClaimChanges } from "../../src/domain/source-change-review.mjs";

test("candidate claims retain old/new evidence and build qualification without applying", () => {
  const current = {
    id: "test:pack",
    contentVersion: "1",
    sources: [],
    claims: [
      {
        id: "claim:a",
        entityId: "item:a",
        field: "damage",
        value: 20,
        status: "observed",
        sourceId: "source:a",
      },
    ],
  };
  const candidate = structuredClone(current);
  candidate.contentVersion = "2";
  candidate.sources = [
    {
      id: "source:b",
      url: "https://example.org/notes",
      reviewedAt: "2026-11-14",
    },
  ];
  candidate.claims[0] = {
    ...candidate.claims[0],
    value: 25,
    status: "disputed",
    sourceId: "source:b",
  };
  const result = sourceClaimChanges(current, candidate);
  assert.deepEqual(
    result.changes.map((row) => [row.oldValue, row.newValue]),
    [[20, 25]],
  );
  assert.match(result.changes[0].applicability, /verify build/);
  assert.equal(result.changes[0].citation, "https://example.org/notes");
  assert.equal(current.claims[0].value, 20);
  assert.throws(
    () => sourceClaimChanges(current, { ...candidate, id: "other" }),
    /identity/,
  );
});

test("protected claim targets and values stay out of the public review queue", () => {
  const old = {
    id: "test:pack",
    contentVersion: "1",
    items: [{ id: "secret:item", name: "Hidden name", spoiler: true }],
    claims: [
      {
        id: "claim:secret",
        entityId: "secret:item",
        field: "note",
        value: "old",
      },
      {
        id: "claim:visible",
        entityId: "item:visible",
        field: "note",
        value: "plain",
      },
    ],
  };
  const next = structuredClone(old);
  next.claims[0].value = "new";
  next.claims[1].value = "Hidden name";
  assert.deepEqual(sourceClaimChanges(old, next).changes, []);
});
