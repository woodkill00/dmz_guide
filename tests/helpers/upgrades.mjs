// Synthetic v2 fixture: these mechanics and stock are NOT gameplay evidence.
import { loadFixturePack } from "./catalog.mjs";
export function upgradeFixture() {
  const p = loadFixturePack("demo-training");
  p.schemaVersion = 2;
  p.recipes = [];
  p.objectives = [];
  p.guides = [];
  p.maps = [];
  p.locations = [];
  p.claims = [];
  p.assets = [];
  p.items = p.items.slice(0, 2).map((x) => ({ ...x, assetId: undefined }));
  for (const x of p.items) delete x.assetId;
  p.sources = p.sources.map((s) => ({
    ...s,
    provenance: {
      kind: "web",
      observationKey: "synthetic",
      lineageKey: "synthetic",
      captureDate: null,
      buildStatus: "known",
    },
  }));
  const objective = (id, quantity) => ({
    id: `test:${id}`,
    name: `Synthetic ${id}`,
    track: "dmz-upgrade",
    description: "Synthetic acceptance only",
    status: "fictional",
    sourceIds: [p.sources[0].id],
    requirements: [
      {
        itemId: p.items[0].id,
        quantity,
        consumption: "consumed",
        status: "fictional",
        sourceIds: [p.sources[0].id],
      },
    ],
    prerequisites: [],
    requirementsKnown: true,
    oneTime: true,
    effects: [],
    spoiler: false,
    upgrade: {
      tierLabel: null,
      prerequisiteStatus: "known",
      observationKeys: [id],
    },
  });
  p.objectives = [objective("first", 5), objective("second", 10)];
  return p;
}
