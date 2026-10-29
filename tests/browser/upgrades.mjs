import { runSourcedCatalogJourneys } from "./sourced-catalog-journeys.mjs";
import { runIndependentUpgradeSpending } from "./independent-upgrade-spending.mjs";
import { runUpgradeRebindTests } from "./upgrades-rebind.mjs";
import { runUpgradePerformance } from "./upgrades-performance.mjs";
import { runIndependentUpgradeJourneys } from "./independent-upgrade-journeys.mjs";
import { runIndependentUpgradeAdviceUI } from "./independent-upgrade-advice-ui.mjs";
export async function runUpgradeTests(options) {
  await runSourcedCatalogJourneys(options);
  await runIndependentUpgradeJourneys(options);
  await runIndependentUpgradeAdviceUI(options);
  await runIndependentUpgradeSpending(options);
  await runUpgradeRebindTests(options);
  await runUpgradePerformance(options);
}
