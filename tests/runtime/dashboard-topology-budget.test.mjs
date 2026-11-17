import test from "node:test";
import assert from "node:assert/strict";
import { readPublicJSON } from "../../src/client/public-data.mjs";
import { checkJSON } from "../../src/content/json.mjs";
import { TOPOLOGY_JSON_NODES } from "../../src/content/site-topology-limits.mjs";
test("087 elevated JSON capacity is restricted to the exact site-map endpoint", async (t) => {
  const previous = globalThis.fetch;
  t.after(() => (globalThis.fetch = previous));
  let fetched = 0;
  globalThis.fetch = async () => {
    fetched++;
    return new Response("[0]");
  };
  await assert.rejects(
    readPublicJSON(
      "/assets/content/packs/official-starter.json",
      8388608,
      undefined,
      { nodes: TOPOLOGY_JSON_NODES },
    ),
    /node budget/,
  );
  await assert.rejects(
    readPublicJSON(
      "/assets/content/site-topology.json?other=1",
      12582912,
      undefined,
      { nodes: TOPOLOGY_JSON_NODES },
    ),
    /node budget/,
  );
  await assert.rejects(
    readPublicJSON("/assets/content/site-topology.json", 12582912, undefined, {
      nodes: TOPOLOGY_JSON_NODES + 1,
    }),
    /node budget/,
  );
  assert.equal(fetched, 0);
  assert.deepEqual(
    await readPublicJSON(
      "/assets/content/site-topology.json",
      12582912,
      undefined,
      { nodes: TOPOLOGY_JSON_NODES },
    ),
    [0],
  );
});
test("087 default JSON node budget and dedicated topology overflow remain enforced", async (t) => {
  const previous = globalThis.fetch;
  t.after(() => (globalThis.fetch = previous));
  const genericOverflow = "[" + Array(150000).fill("0").join(",") + "]";
  globalThis.fetch = async () => new Response(genericOverflow);
  await assert.rejects(
    readPublicJSON("/assets/content/site-topology.json", 12582912),
    /node limit/,
  );
  const topologyOverflow =
    "[" + Array(TOPOLOGY_JSON_NODES).fill("0").join(",") + "]";
  globalThis.fetch = async () => new Response(topologyOverflow);
  await assert.rejects(
    readPublicJSON("/assets/content/site-topology.json", 12582912, undefined, {
      nodes: TOPOLOGY_JSON_NODES,
    }),
    /node limit/,
  );
  assert.throws(
    () => checkJSON(topologyOverflow, 20, TOPOLOGY_JSON_NODES),
    /node limit/,
  );
  assert.equal(TOPOLOGY_JSON_NODES, 350000);
});
