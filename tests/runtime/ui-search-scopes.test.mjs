import test from "node:test";
import assert from "node:assert/strict";
import { buildUnifiedIndex } from "../../src/content/unified-index.mjs";
test("071 modern public tool results name distinct mission and update owners", async () => {
  const previous = process.env.DMZ_UI_VARIANT;
  process.env.DMZ_UI_VARIANT = "modern";
  try {
    const { entries } = await buildUnifiedIndex([]);
    const get = (id) => entries.find((r) => r.id === "feature:" + id);
    assert.equal(get("missions").title, "Missions & story");
    assert.equal(get("tool-missions").title, "Map mission tracker");
    assert.notEqual(get("weapon-updates").title, get("tool-updates").title);
    assert.notEqual(get("missions").url, get("tool-missions").url);
  } finally {
    if (previous === undefined) delete process.env.DMZ_UI_VARIANT;
    else process.env.DMZ_UI_VARIANT = previous;
  }
});
