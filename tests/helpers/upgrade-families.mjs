// Fictional admitted test catalog. Quantities and tier names are not gameplay evidence.
import { upgradeFixture } from "./upgrades.mjs";
export function tieredUpgradeFixture() {
  const pack = upgradeFixture(),
    seed = pack.objectives[0];
  pack.id = "qa044:upgrade-tiers";
  pack.title = "FICTIONAL QA044 upgrade tiers";
  pack.contentVersion = "synthetic-044-1";
  pack.objectives = [
    ["bank-iii", "Bank III", "III", 30],
    ["stash-ii", "Stash II", "II", 4],
    ["bank-i", "Bank I", "I", 5],
    ["bank-ii", "Bank II", "II", 10],
    ["stash-i", "Stash I", "I", 2],
  ].map(([id, name, tier, q]) => ({
    ...structuredClone(seed),
    id: "tier:" + id,
    name,
    requirements: [{ ...seed.requirements[0], quantity: q }],
    upgrade: { ...seed.upgrade, tierLabel: tier, observationKeys: [id] },
  }));
  return pack;
}
