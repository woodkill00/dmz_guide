import { test } from "node:test";
import assert from "node:assert/strict";
import { recordSearchText } from "../../src/ui/render.mjs";
test("catalog and private reader search typed weapon stats and guide body without spoiler leaks", () => {
  const record = {
    name: "Fixture rifle",
    category: "weapons",
    body: "Reload instructions",
    stats: [
      {
        label: "Damage at range",
        metric: "damage",
        value: 17,
        unit: "HP",
        status: "fictional",
        context: { rangeMeters: 25 },
      },
    ],
  };
  const text = recordSearchText(record);
  for (const q of ["damage at range", "17", "hp", "reload instructions", "25"])
    assert(text.includes(q));
  assert(!recordSearchText({ ...record, spoiler: true }).includes("damage"));
  assert.equal(
    recordSearchText({ ...record, spoiler: true }),
    "spoiler-protected record",
  );
});
