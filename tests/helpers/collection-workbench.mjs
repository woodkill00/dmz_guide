import { collectionFixture } from "./collection-needs.mjs";
import { loadFixturePack } from "./catalog.mjs";
export function workbenchFixture() {
  const p = collectionFixture(),
    demo = loadFixturePack("demo-training");
  p.id = "qa045:workbench";
  p.title = "FICTIONAL QA045 collection workbench";
  p.contentVersion = "synthetic-045-1";
  const mission = {
    ...structuredClone(p.objectives[0]),
    id: "craft:mission",
    name: "Fictional collection mission",
    track: "dmz-story",
  };
  delete mission.upgrade;
  mission.requirements[0].itemId = "craft:wire";
  mission.requirements[0].quantity = 1;
  p.objectives.push(mission);
  const alternative = structuredClone(p.recipes[0]);
  alternative.id = "craft:alternative";
  alternative.name = "Fictional alternative output";
  alternative.inputs = [
    { ...alternative.inputs[0], itemId: "craft:wire", quantity: 4 },
  ];
  p.recipes.push(alternative);
  const unknown = structuredClone(p.recipes[2]);
  unknown.id = "craft:unknown-recipe";
  unknown.name = "Fictional unknown recipe";
  unknown.eligibility = "unknown";
  unknown.ingredientsKnown = false;
  unknown.inputs[0].quantity = null;
  p.recipes.push(unknown);
  p.maps = structuredClone(demo.maps);
  p.locations = structuredClone(
    demo.locations.filter((l) => l.coordinates).slice(0, 2),
  ).map((l) => ({ ...l, itemIds: ["craft:wire"] }));
  return p;
}
export function largeWorkbenchFixture() {
  const p = collectionFixture(),
    seed = p.items[0],
    line = p.objectives[0].requirements[0];
  p.id = "qa045:large";
  p.title = "FICTIONAL QA045 large collection";
  p.items = Array.from({ length: 5000 }, (_, i) => ({
    ...structuredClone(seed),
    id: `stock:item-${i}`,
    name: `Fictional item ${String(i).padStart(4, "0")}`,
  }));
  p.recipes = [];
  p.objectives[0].requirements = p.items.map((i) => ({
    ...structuredClone(line),
    itemId: i.id,
    quantity: 1,
  }));
  return p;
}
