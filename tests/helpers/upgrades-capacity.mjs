import { upgradeFixture } from "./upgrades.mjs";
export function capacityUpgradeFixture(count) {
  const pack = upgradeFixture(),
    template = pack.objectives[0];
  pack.objectives = Array.from({ length: count }, (_, i) => ({
    ...structuredClone(template),
    id: `test:capacity-${i}`,
    name: `Synthetic capacity ${i}`,
    upgrade: {
      tierLabel: null,
      prerequisiteStatus: "known",
      observationKeys: [`capacity-${i}`],
    },
  }));
  return pack;
}
