import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { upgradeFixture } from "../helpers/upgrades.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import { spoilerGuard } from "../../src/domain/progression.mjs";
import {
  spendingView,
  recordUpgradePurchase,
} from "../../src/domain/upgrade-spending.mjs";
const source = (await readFile("src/client/upgrade-spending.mjs", "utf8"))
  .replace(/^import[\s\S]*?;\n/gm, "")
  .replaceAll("export function ", "function ");
function summary(pack, profile, retained = false) {
  const root = { innerHTML: "", setAttribute() {} };
  vm.runInNewContext(
    `${source}\n${retained ? "retained = state.profile;" : ""}\nrenderSpendingSummary();`,
    {
      state: { pack, profile },
      $: (selector) => (selector === "#upgrade-spending-summary" ? root : null),
      esc: String,
      spendingView,
      spoilerGuard,
    },
  );
  return root.innerHTML;
}
test("compact empty summary keeps explicit zero metrics and unrecorded-history caveat without empty pagers", () => {
  const pack = upgradeFixture(),
    profile = newProfile(pack),
    html = summary(pack, profile);
  for (const metric of ["net", "gross", "reversed"])
    assert(html.includes(`data-spend-metric="materials-${metric}">0`));
  assert.match(
    html,
    /Older completions.*manual stock edits.*lifetime gameplay spending/,
  );
  assert.match(html, /currencies stay separate/);
  for (const scaffolding of [
    "spend-items-",
    "spend-history-",
    "Per-item and separate",
    "Private recorded history",
  ])
    assert(!html.includes(scaffolding));
  const old = { ...profile, schemaVersion: 2 };
  delete old.spendHistory;
  assert.match(summary(pack, old), /Preview spending-history migration/);
  assert.match(summary(pack, profile, true), /data-spend-recovery-export/);
});
test("empty visible projection preserves protected notice without hidden amounts or event IDs", () => {
  const pack = upgradeFixture(),
    profile = newProfile(pack);
  profile.inventory[pack.items[0].id] = 100;
  const purchased = recordUpgradePurchase(pack, profile, "test:first", {
    operationId: "spend:private",
    recordedAt: "2026-10-26T20:00:00.000Z",
    expectedRevision: 0,
  }).candidate;
  pack.objectives[0].spoiler = true;
  const html = summary(pack, purchased);
  assert.match(html, /Some private history is omitted/);
  assert(!html.includes("spend:private"));
  assert(!html.includes('data-spend-metric="materials-net">5'));
  assert(!html.includes("spend-history-next"));
  purchased.spoilers = true;
  const full = summary(pack, purchased);
  assert(full.includes('data-spend-metric="materials-net">5'));
  assert(full.includes("spend-history-next"));
  assert(full.includes("spend-items-next"));
});
