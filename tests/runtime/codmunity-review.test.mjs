import test from "node:test";
import assert from "node:assert/strict";
import { renderSourceReview } from "../../src/client/codmunity-review.mjs";
const row = {
  name: "Synthetic rifle",
  sourceUpdated: null,
  stats: { ads: 123.456 },
  damage: [
    {
      from: 0,
      to: null,
      unit: "source-unspecified",
      values: { chest: 23, head: null },
      providerTTK: 0,
      shotsToKill: 5,
    },
  ],
};
const coverage = { weapons: 1, damage: 1, total: 33 };
function fixture(kind = "added") {
  const before = {
    sourceDate: "2026-11-01",
    sourceURL: "https://example.invalid/synthetic",
    mode: "multiplayer",
    sourceHash: "synthetic-fingerprint",
    warning: "NOT TESTED",
    unknownCount: 0,
    fetchedAt: "today",
    weapons: kind === "added" ? {} : { synthetic: row },
  };
  const after = {
    ...before,
    weapons:
      kind === "removed" ? {} : { synthetic: { ...row, stats: { ads: 125 } } },
  };
  const diff = {
    added: [],
    changed: [],
    removed: [],
    coverageBefore: coverage,
    coverageAfter: coverage,
  };
  if (kind !== "unchanged") diff[kind] = ["synthetic"];
  return {
    sources: { mw4: before, dmz: null },
    proposal: {
      hash: "reference",
      unchanged: kind === "unchanged",
      content: { modes: { mw4: after, dmz: null } },
      diff: {
        mw4: diff,
        dmz: {
          added: [],
          changed: [],
          removed: [],
          coverageBefore: coverage,
          coverageAfter: coverage,
        },
      },
    },
  };
}
test("052 proposal uses readable coverage, precise values and authored units without JSON blocks", () => {
  const html = renderSourceReview(fixture("changed"), [
    { id: "ads", name: "ADS speed", unit: "ms" },
  ]);
  for (const text of [
    "Weapons with damage profiles",
    "Synthetic rifle · Changed",
    "ADS speed (ms)",
    "123.456",
    "125",
    "Damage band 1 · Chest",
    "Unknown",
    "Open ended",
    "provider TTK",
    "Source dates and warnings",
    "https://example.invalid/synthetic",
    "multiplayer",
    "synthetic-fingerprint",
    "NOT TESTED",
  ])
    assert(html.includes(text), text);
  assert(!html.includes("<pre"));
  assert(!html.includes("&quot;stats&quot;"));
  assert(html.includes('tabindex="0"'));
});
test("052 additions/removals and unchanged records keep review distinctions", () => {
  assert(renderSourceReview(fixture()).includes("Synthetic rifle · Added"));
  const removed = renderSourceReview(fixture("removed"));
  assert(removed.includes("Synthetic rifle · Removed"));
  assert(removed.includes("Not reported"));
  const noOp = renderSourceReview(fixture("unchanged"));
  assert(noOp.includes("No normalized fact changes"));
  assert(noOp.includes("Unchanged weapons (1)"));
  const stale = fixture();
  stale.proposal.stale = true;
  assert(renderSourceReview(stale).includes("Stale proposal"));
  assert.equal(renderSourceReview({}), "<p>No CODMunity proposal staged.</p>");
});
test("052 imported names, metadata and values stay inert in summaries and tables", () => {
  const value = fixture();
  value.proposal.content.modes.mw4.weapons.synthetic.name =
    '<img src=x onerror="alert(1)">';
  value.proposal.content.modes.mw4.warning = "<script>bad</script>";
  const html = renderSourceReview(value);
  assert(!html.includes("<img"));
  assert(!html.includes("<script>"));
  assert(html.includes("&lt;img"));
  assert(html.includes("&lt;script&gt;"));
});
