import test from "node:test";
import assert from "node:assert/strict";
import { quickTrackerPage } from "../../src/ui/quick-tracker.mjs";
test("quick tracker wraps only owning pages without replacing existing controls or script ownership", () => {
  for (const page of [
    "inventory",
    "upgrades",
    "needed",
    "quick-collect",
    "field-desk",
    "armory-workbench",
  ]) {
    const input = {
      page,
      path: "/" + page + "/",
      body: '<form id="existing"><input name="quantity"></form>',
      scripts: ["original.mjs"],
    };
    const result = quickTrackerPage(input);
    assert(result.body.endsWith(input.body));
    assert.equal(result.scripts, input.scripts);
    assert.equal(result.path, input.path);
    assert.equal((result.body.match(/aria-current="page"/g) || []).length, 1);
    assert.equal((result.body.match(/data-tracker-link/g) || []).length, 6);
    assert(result.body.includes("/armory/workbench/#acquisition"));
    assert.equal(
      input.body,
      '<form id="existing"><input name="quantity"></form>',
    );
  }
});
test("unrelated guides retain their exact presentation and no tracker controls", () => {
  for (const page of ["settings", "missions", "map", "planner", "collection"]) {
    const input = { page, body: "public content" };
    assert.equal(quickTrackerPage(input), input);
  }
});
