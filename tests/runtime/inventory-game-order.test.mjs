import test from "node:test";
import assert from "node:assert/strict";
import { loadFixturePack } from "../helpers/catalog.mjs";
import {
  compareItems,
  itemSection,
} from "../../src/domain/inventory-items.mjs";
const expected = {
  Consumables:
    "Energy Drink|Bandage|Pain Killers|Sedative Inhaler|Radiation Blockers|Smelling Salts|Medkit|Staff Emergency Exfil Keycard|Self-Revive Kit|Door Breacher Charge",
  Backpacks:
    "Small Backpack|Medium Backpack|Medium Scavenger Backpack|Medium Weapon Backpack|Small Secure Backpack|Large Backpack|Medium Secure Backpack|Large Scavenger Backpack|Large Secure Backpack|Secure Scavenger Backpack",
  Tacticals:
    "Concussion Grenade|Snapshot Grenade|Smoke Grenade|Shock Stick|Screamer Mine|Flash|Decoy Grenade|Stim|Heartbeat Sensor|Spotter Scope",
  Lethals:
    "C4|Claymore|Frag Grenade|Molotov Cocktail|Zip Gun|Proximity Mine|Semtex|Thermite|Drill Charge|Trip Wire|Throwing Knife",
  "Fire support":
    "Care Package|Combat Drone|Bomb Glider|UAV|Advanced UAV|Impact Warhead|Bombing Run|Artillery Beacon|Railgun Sentry|Crossfire",
  Equipment:
    "Weak Night Vision Goggles|Gas Mask|Disposable Parachute|Night Vision Goggles|Durable Gas Mask|Elite Night Vision Goggles|Parachute",
  Ingredients:
    "Biomaterials|Control Unit|Detonators|Electronic Sensors|Reactive Metals|Rigid Synthetics|Alloyed Plating|Ballistic Fabric|Comms Module|Nylon Laminate|Power Regulator|Stabilized Reagents|Turned Components|Volatile Explosives",
};
for (const [section, names] of Object.entries(expected))
  test("owner game order: " + section, () => {
    const pack = loadFixturePack("official-starter"),
      before = structuredClone(pack);
    const listed = names.split("|");
    const sorted = pack.items
      .filter((i) => itemSection(i) === section)
      .sort(compareItems);
    assert.deepEqual(
      sorted.slice(0, listed.length).map((i) => i.name),
      listed,
    );
    assert.deepEqual(pack, before);
  });
test("custom name lookalikes are not reclassified", () => {
  assert.equal(
    itemSection({ id: "custom:medkit", name: "Medkit", category: "Custom" }),
    "Custom",
  );
});
