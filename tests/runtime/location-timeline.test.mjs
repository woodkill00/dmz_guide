import { test } from "node:test";
import assert from "node:assert/strict";
import { locationTimeline } from "../../src/domain/field-ops.mjs";

test("location timeline keeps source report and private discovery authority separate", () => {
  const pack = {
    locations: [{ id: "loc", sourceIds: ["source:one"] }],
    sources: [
      {
        id: "source:one",
        title: "Source",
        reviewedAt: "2026-11-10",
        supports: "Named area",
        url: "https://example.com/",
      },
    ],
    items: [{ id: "item", name: "Synthetic item" }],
  };
  const profile = {
    fieldOps: {
      discoveries: [
        {
          id: "private-1",
          locationId: "loc",
          itemId: "item",
          at: "2026-11-11T12:00:00Z",
          notes: "My observation",
          photoId: null,
        },
      ],
    },
  };
  const rows = locationTimeline(pack, profile, "loc");
  assert.deepEqual(
    rows.map((row) => row.kind),
    ["private", "source"],
  );
  assert.equal(rows[0].detail, "My observation");
  assert.equal(rows[1].detail, "Named area");
});
