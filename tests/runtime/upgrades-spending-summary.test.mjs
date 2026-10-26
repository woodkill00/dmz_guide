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

test("purchase and reversal previews initially focus their review heading, not a footer action", () => {
  const pack = upgradeFixture(),
    profile = newProfile(pack);
  profile.inventory[pack.items[0].id] = 100;
  const purchase = recordUpgradePurchase(pack, profile, "test:first", {
    operationId: "spend:entry-focus",
    recordedAt: "2026-10-26T20:00:00.000Z",
    expectedRevision: 0,
  });
  for (const kind of ["purchase", "reversal"]) {
    const nodes = new Map();
    let markup;
    const document = {
      activeElement: null,
      createElement: () => ({
        setAttribute() {},
        set innerHTML(value) {
          markup = value;
          for (const match of value.matchAll(/id="([^"]+)"/g)) {
            const node = {
              focus() {
                document.activeElement = this;
              },
            };
            nodes.set(`#${match[1]}`, node);
          }
        },
        showModal() {
          this.open = true;
        },
      }),
      querySelector: () => ({
        append(node) {
          nodes.set(`#${node.id}`, node);
        },
      }),
    };
    const state = {
      pack,
      profile: kind === "purchase" ? profile : purchase.candidate,
    };
    const before = JSON.stringify(state.profile);
    const target = {
      kind,
      snapshot: purchase.event,
      warnings: [],
      revision: 0,
      candidate: kind === "purchase" ? purchase.candidate : profile,
    };
    vm.runInNewContext(
      `${source}\nensureDialog(); pending=target; showPreview(target);`,
      {
        document,
        state,
        target,
        $: (selector) => nodes.get(selector),
        esc: String,
        spendingView,
        spoilerGuard,
      },
    );
    assert.match(markup, /id="upgrade-spend-title" tabindex="-1"/);
    assert(!markup.includes("autofocus"));
    assert.equal(document.activeElement, nodes.get("#upgrade-spend-title"));
    assert.equal(nodes.get("#upgrade-spend-confirm").scrollTop, 0);
    assert.equal(nodes.get("#upgrade-spend-ack").checked, false);
    assert.equal(
      nodes.get("#upgrade-spend-apply").disabled,
      kind === "purchase",
    );
    assert.equal(nodes.get("#upgrade-spend-cancel").disabled, false);
    assert.equal(JSON.stringify(state.profile), before);
  }
});
