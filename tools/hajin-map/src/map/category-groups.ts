import { displayKind } from "./display-duplicates.ts";

export interface CategoryMember {
  sourceId: string;
  categoryId: string;
}
export interface CategoryInput extends CategoryMember {
  path: readonly string[];
}
const normalize = (value: string) =>
  value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const definitions: Record<string, { name: string; aliases: string[] }> = {
  keys: {
    name: "Keys",
    aliases: [
      "key",
      "keys",
      "key locations",
      "locked rooms",
      "key locked locations",
    ],
  },
  poi: {
    name: "Locations",
    aliases: [
      "locations",
      "location",
      "poi",
      "pois",
      "major poi",
      "major pois",
      "minor poi",
      "minor pois",
      "place names",
      "poilabelsecondary",
    ],
  },
  fortress: {
    name: "Fortresses",
    aliases: ["fortress", "fortresses", "stronghold", "strongholds", "fort"],
  },
  safe: { name: "Safes", aliases: ["safe", "safes"] },
  gas: {
    name: "Gas stations",
    aliases: ["gas", "gas station", "gas stations"],
  },
  marine: {
    name: "Marine gas stations",
    aliases: [
      "marine",
      "marine gas",
      "marine gas station",
      "marine gas stations",
    ],
  },
  police: {
    name: "Police stations",
    aliases: ["police", "police station", "police stations"],
  },
  fire: {
    name: "Fire stations",
    aliases: ["fire", "fire station", "fire stations"],
  },
  clinic: {
    name: "Clinics & hospitals",
    aliases: [
      "clinic",
      "clinics",
      "clinics and hospitals",
      "hospital",
      "hospitals",
    ],
  },
  cache: {
    name: "Caches",
    aliases: [
      "cache",
      "caches",
      "ammo",
      "ammo cache",
      "ammo caches",
      "ammo armor cache",
      "ammo armor caches",
    ],
  },
  compound: { name: "Compounds", aliases: ["compound", "compounds"] },
  exfil: {
    name: "Exfils",
    aliases: ["exfil", "exfils", "extraction", "extractions"],
  },
  uav: { name: "UAV towers", aliases: ["uav", "uav tower", "uav towers"] },
  sam: { name: "SAM sites", aliases: ["sam", "sam site", "sam sites"] },
  hunt: {
    name: "Lieutenant hunt towers",
    aliases: [
      "hunt",
      "hunt tower",
      "hunt towers",
      "lieutenant hunt tower",
      "lieutenant hunt towers",
      "lieutenant towers",
      "lttower",
      "lt tower",
    ],
  },
  bosses: {
    name: "Bosses & lieutenants",
    aliases: [
      "boss",
      "bosses",
      "commander",
      "commanders",
      "lieutenant",
      "lieutenants",
      "lt",
    ],
  },
  bounty: {
    name: "Bounties",
    aliases: ["bounty", "bounties", "bounty station", "bounty stations"],
  },
  missions: {
    name: "Missions & orders",
    aliases: [
      "mission",
      "missions",
      "story mission",
      "story missions",
      "dmz orders",
      "page",
      "chapter",
    ],
  },
  recipes: {
    name: "Crafting recipes",
    aliases: ["recipes", "crafting recipes", "3d printer recipes"],
  },
  equipment: {
    name: "Items & equipment",
    aliases: [
      "consumables",
      "plate carriers",
      "backpacks",
      "tacticals",
      "lethals",
      "field upgrades",
      "fire support",
      "gear",
      "ingredients",
      "items",
      "equipment",
    ],
  },
  spawn: { name: "Spawn points", aliases: ["spawn point", "spawn points"] },
  drones: {
    name: "Crashed drones",
    aliases: ["drone", "crashed drone", "crashed drones"],
  },
  drops: {
    name: "Supply drops",
    aliases: ["drop", "supply drop", "supply drops", "lost supply drops"],
  },
  radio: { name: "Radio towers", aliases: ["radio tower", "radio towers"] },
  other: { name: "Other", aliases: [] },
};
const aliases = new Map(
  Object.entries(definitions).flatMap(([id, value]) =>
    value.aliases.map((alias) => [normalize(alias), id]),
  ),
);

export function mapCategoryType(category: Omit<CategoryInput, "sourceId">) {
  // These explicit ancestors describe the record type, even if its leaf is a room/site name.
  for (const part of category.path) {
    const id = aliases.get(normalize(part));
    if (id && ["keys", "missions", "recipes", "fortress"].includes(id))
      return id;
  }
  const known = displayKind(category.categoryId);
  if (Object.hasOwn(definitions, known) && known !== "other") return known;
  for (const part of [...category.path].reverse()) {
    const id = aliases.get(normalize(part));
    if (id) return id;
  }
  return "other";
}

/** Reversible presentation groups; member IDs remain the original visibility-mask keys. */
export function groupMapCategories(input: readonly CategoryInput[]) {
  const groups = new Map<
    string,
    { id: string; name: string; members: CategoryMember[] }
  >();
  for (const category of input) {
    const id = mapCategoryType(category);
    const group = groups.get(id) ?? {
      id,
      name: definitions[id].name,
      members: [],
    };
    if (
      !group.members.some(
        (member) =>
          member.sourceId === category.sourceId &&
          member.categoryId === category.categoryId,
      )
    )
      group.members.push({
        sourceId: category.sourceId,
        categoryId: category.categoryId,
      });
    groups.set(id, group);
  }
  return [...groups.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "en"),
  );
}
