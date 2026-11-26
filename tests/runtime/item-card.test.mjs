import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  ITEM_CARD_SIZES,
  renderItemCard,
  renderItemIcon,
} from "../../src/ui/item-card.mjs";
import { fixtureCatalog } from "../helpers/catalog.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import {
  createUpgradeOperation,
  commitFoundOperation,
  verifyFoundOperation,
} from "../../src/client/collection-action.mjs";

test("standard item variants escape labels, keep native links and one hydration hook", () => {
  const item = {
    id: "item:one",
    name: "Example <img src=x onerror=alert(1)>",
    rarity: "Rare",
  };
  for (const size of ITEM_CARD_SIZES) {
    const html = renderItemCard(item, {
      packId: "fictional:fixture",
      size,
      quantityLabel: "Still needed",
      quantityValue: "7",
      facts: [{ label: "Owned", value: "2" }],
      notes: ["<script>bad</script>"],
    });
    assert(html.includes('data-item-size="' + size + '"'));
    assert(html.includes("/local/?pack=fictional%3Afixture&amp;id=item%3Aone"));
    assert(!html.includes("<img src=x"));
    assert(!html.includes("<script>"));
    assert.equal((html.match(/data-inventory-icon=/g) || []).length, 1);
    assert(!/<button/.test(html));
  }
  for (const href of [
    "javascript:alert(1)",
    "//evil.invalid/",
    "/\\evil.invalid/",
    "/bad\npath",
  ])
    assert.throws(() => renderItemCard(item, { href }), /Unsafe/);
  assert.throws(() => renderItemCard(item, { size: "huge" }), /Unknown/);
});
test("protected items have no image hook, identity, facts or link until explicitly revealed", () => {
  const item = { id: "secret:identity", name: "SECRET EXAMPLE", spoiler: true };
  const html = renderItemCard(item, {
    packId: "fictional:fixture",
    quantityLabel: "Required",
    quantityValue: "999",
  });
  assert(html.includes("Protected item"));
  for (const value of [
    "SECRET EXAMPLE",
    "secret:identity",
    "data-inventory-icon",
    " href=",
    "999",
  ])
    assert(!html.includes(value));
  assert(
    renderItemCard(item, {
      packId: "fictional:fixture",
      reveal: true,
    }).includes("SECRET EXAMPLE"),
  );
  assert(
    renderItemIcon({ id: "x" }, { size: "icon" }).includes("Image needed"),
  );
});
test("item icon creation is centralized across all seven legacy presentation surfaces", async () => {
  for (const path of [
    "src/ui/dashboard-page.mjs",
    "src/ui/item-workspace.mjs",
    "src/ui/crafting-uses.mjs",
    "src/client/profile.mjs",
    "src/client/quick-collect.mjs",
    "src/client/build-collect-view.mjs",
    "src/client/fob-upgrade-card.mjs",
  ]) {
    const source = await readFile(path, "utf8");
    assert(!source.includes('data-inventory-icon="'), path);
    assert(source.includes("item-card.mjs"), path);
  }
});

test("upgrade status uses acknowledged commit proof, not inventory history, and cannot replay after read failure", async () => {
  const packs = fixtureCatalog.entries.map((entry) => entry.pack);
  const pack = packs.find(
    (p) =>
      p.schemaVersion === 2 &&
      p.objectives.some((o) => o.track === "dmz-upgrade"),
  );
  const profile = newProfile(pack);
  const target = pack.objectives.find(
    (o) => o.track === "dmz-upgrade" && !o.spoiler,
  );
  const before = JSON.stringify(profile);
  const op = createUpgradeOperation(pack, profile, target.id, "completed", {
    overlayTag: "false:0",
    displayName: target.name,
  });
  assert.equal(JSON.stringify(profile), before);
  assert.deepEqual(op.candidate.inventory, profile.inventory);
  assert.deepEqual(op.candidate.fieldOps, profile.fieldOps);
  let writes = 0;
  const committed = { ...op.candidate, revision: profile.revision + 1 };
  await commitFoundOperation(op, {
    save: async () => {
      writes++;
      return committed;
    },
  });
  await assert.rejects(() =>
    verifyFoundOperation(op, {
      read: async () => {
        throw Error("Synthetic read failure");
      },
    }),
  );
  assert.equal(op.state, "committed-unverified");
  await assert.rejects(() =>
    commitFoundOperation(op, {
      save: async () => {
        writes++;
        return committed;
      },
    }),
  );
  const newer = structuredClone(committed);
  newer.revision++;
  newer.upgradeProgress[target.id].completion = "incomplete";
  assert.equal(
    await verifyFoundOperation(op, { read: async () => newer }),
    newer,
  );
  assert.equal(op.state, "confirmed");
  assert.equal(writes, 1);
  const failed = createUpgradeOperation(pack, profile, target.id, "completed");
  await assert.rejects(() =>
    commitFoundOperation(failed, {
      save: async () => {
        throw Error("Synthetic quota");
      },
    }),
  );
  assert.equal(failed.state, "failed-before-commit");
  assert.equal(failed.upgradeId, target.id);
  assert.equal(failed.expectedRevision, profile.revision);
});
