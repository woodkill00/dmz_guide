import { test } from "node:test";
import assert from "node:assert/strict";
import { localProviderSources } from "../src/map/local-providers.ts";
import { hajin } from "../src/map/hajin.ts";
const source = {
  id: "codmunity",
  authorization: "SYNTHETIC owner authorization",
  canonicalDigest: hajin.provenance.sha256,
  rms: 1,
  maxError: 2,
  heldOut: 3,
  snapshotDigest: "a".repeat(64),
  registrationDigest: "b".repeat(64),
};
test("local provider configuration allows only known local paths and explicit validated captures", () => {
  const [s] = localProviderSources({ version: 1, sources: [source] });
  assert.equal(s.snapshot, "/maps/hajin/providers/codmunity/markers.json");
  assert.equal(s.recordLink("any"), "https://codmunity.gg/dmz/map");
  for (const patch of [
    { id: "../outside" },
    { authorization: "" },
    { canonicalDigest: "wrong" },
    { rms: 9 },
    { maxError: 17 },
    { heldOut: 1 },
    { rms: NaN },
  ])
    assert.throws(() =>
      localProviderSources({ version: 1, sources: [{ ...source, ...patch }] }),
    );
  assert.throws(() =>
    localProviderSources({ version: 1, sources: [source, source] }),
  );
  assert.throws(() => localProviderSources({ version: 2, sources: [] }));
});
