import test from "node:test";
import assert from "node:assert/strict";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import { activeOrderPageKeys } from "../../src/domain/order-progress.mjs";
import { projectDashboard } from "../../src/domain/dashboard.mjs";
import { dashboardOrderCards } from "../../src/ui/order-cards.mjs";
import { renderMissionObjectives } from "../../src/ui/mission-objectives.mjs";
const pack = loadFixturePack("official-starter");
test("112 reviewed Order details retain source disagreement and explicit locations/actions", () => {
  const get = (suffix) =>
    pack.objectives.find((r) => r.id === "mw4:order-" + suffix);
  assert.match(get("hunter").steps.join(" "), /nearest Lieutenant/);
  assert.match(get("triangulation").steps.join(" "), /Songdo Wharf/);
  assert.match(get("civil-service").steps.join(" "), /second floor/);
  assert.match(get("navigate-with-care").steps[0], /Pay/);
  assert.match(get("drc").steps[0], /Loot.*Chang-san.*Haneul.*NuriGO/);
  assert.match(get("hard-carry").steps.join(" "), /2.*5.*check/i);
  assert.equal(get("hard-carry").requirementsKnown, false);
  assert(
    get("hard-carry").sourceIds.includes("source:codcentral-orders-20261128"),
  );
  const code = pack.objectives.find(
    (r) => r.id === "mw4:x01-order-source-code",
  );
  assert.match(code.steps.join(" "), /three.*same deployment/i);
});
test("earliest incomplete nonempty page defaults independent per map and complete/empty pages skipped", () => {
  assert.deepEqual(
    [
      ...activeOrderPageKeys([
        { set: "hajin", page: 1, total: 2, done: 2 },
        { set: "hajin", page: 2, total: 0, done: 0 },
        { set: "hajin", page: 3, total: 3, done: 1 },
        { set: "hajin", page: 4, total: 2, done: 0 },
        { set: "x01", page: 1, total: 3, done: 0 },
      ]),
    ],
    ["hajin-3", "x01-1"],
  );
  assert.deepEqual(
    [...activeOrderPageKeys([{ set: "hajin", page: 1, total: 2, done: 2 }])],
    [],
  );
});
test("dashboard projects exact source steps, expands first page, and escapes separate objective lines", () => {
  const model = projectDashboard(pack, newProfile(pack));
  const page = model.orders[0];
  const mission = page.rows[0];
  assert.deepEqual(
    mission.steps,
    pack.objectives.find((r) => r.id === mission.id).steps,
  );
  const html = dashboardOrderCards(model, pack);
  assert(html.includes('data-order-disclosure="hajin-1" open'));
  assert(html.includes('data-mission-objectives="' + mission.id + '" open'));
  const lines = renderMissionObjectives(
    { id: "test:mission", steps: ["First <task>", "Second & last"] },
    { expanded: true },
  );
  assert(
    lines.includes("<li>First &lt;task&gt;</li><li>Second &amp; last</li>"),
  );
  assert(
    renderMissionObjectives({ id: "empty" }).includes("have not been recorded"),
  );
});
test("new instructions do not expose protected terms", () => {
  const p = structuredClone(pack);
  const profile = newProfile(p);
  const secret = p.objectives.find((r) => r.spoiler);
  assert(secret);
  const shown = p.objectives.find((r) => !r.spoiler && r.track === "dmz-order");
  shown.steps = ["Visit " + secret.name];
  const row = projectDashboard(p, profile)
    .orders.flatMap((r) => r.rows)
    .find((r) => r.id === shown.id);
  assert(row);
  assert(!JSON.stringify(row.steps).includes(secret.name));
  assert(
    !dashboardOrderCards(projectDashboard(p, profile), p, {
      expanded: true,
    }).includes(secret.name),
  );
});
