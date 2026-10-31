// Fictional recipe chain for collection UI/model acceptance, not gameplay evidence.
import { upgradeFixture } from "./upgrades.mjs";
export function collectionFixture() {
  const p = upgradeFixture();
  p.id = "qa044:collection";
  p.title = "FICTIONAL collection acceptance";
  const seed = p.items[0];
  p.items = ["output", "part", "wire", "tool", "spare", "unrelated"].map(
    (id) => ({
      ...structuredClone(seed),
      id: `craft:${id}`,
      name: `Fictional ${id}`,
    }),
  );
  p.objectives = [
    {
      ...p.objectives[0],
      id: "craft:upgrade",
      name: "Fictional upgrade I",
      requirements: [
        {
          ...p.objectives[0].requirements[0],
          itemId: "craft:output",
          quantity: 3,
        },
      ],
      upgrade: {
        ...p.objectives[0].upgrade,
        observationKeys: ["craft-upgrade"],
      },
    },
  ];
  const line = (itemId, quantity, consumption = "consumed") => ({
    itemId: `craft:${itemId}`,
    quantity,
    consumption,
    status: "fictional",
    sourceIds: [p.sources[0].id],
  });
  const recipe = (id, output, q, inputs) => ({
    id: `craft:${id}`,
    name: `Fictional ${id}`,
    status: "fictional",
    sourceIds: [p.sources[0].id],
    station: "Fictional bench",
    eligibility: "stash",
    ingredientsKnown: true,
    output: { itemId: `craft:${output}`, quantity: q },
    inputs,
    prerequisites: [],
  });
  p.recipes = [
    recipe("output-recipe", "output", 2, [
      line("part", 2),
      line("tool", 1, "retained"),
    ]),
    recipe("part-recipe", "part", 1, [line("wire", 3)]),
    recipe("unrelated-recipe", "unrelated", 1, [line("spare", 4)]),
  ];
  return p;
}
