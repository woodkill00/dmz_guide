import test from "node:test";
import assert from "node:assert/strict";
import {
  createWorkspaceManifest,
  inspectWorkspaceManifest,
} from "../../src/domain/workspace-manifest.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import { loadFixturePack } from "../helpers/catalog.mjs";

const profile = () => newProfile(loadFixturePack("official-starter"));

test("explicit profile export round-trips with digest and named omissions", async () => {
  const bundle = await createWorkspaceManifest([
    { name: "profile.json", text: JSON.stringify(profile()) },
  ]);
  const preview = await inspectWorkspaceManifest(bundle);
  assert.equal(preview.modules[0].id, "profile");
  assert.equal(preview.modules[0].restore, "/settings/");
  assert(preview.omitted.includes("map"));
  assert(preview.omitted.includes("armory"));
  const changed = structuredClone(bundle);
  changed.modules[0].text = changed.modules[0].text.replace(
    "official:mw4-dmz-starter",
    "other:pack",
  );
  await assert.rejects(inspectWorkspaceManifest(changed), /digest or type/);
  await assert.rejects(
    createWorkspaceManifest([{ name: "bad.json", text: "{}" }]),
    /Unsupported/,
  );
  await assert.rejects(
    createWorkspaceManifest([
      { name: "first.json", text: JSON.stringify(profile()) },
      { name: "second.json", text: JSON.stringify(profile()) },
    ]),
    /only one/,
  );
  await assert.rejects(
    inspectWorkspaceManifest({ ...bundle, version: 0 }),
    /Unsupported/,
  );
  await assert.rejects(
    inspectWorkspaceManifest({ ...bundle, omitted: [] }),
    /omission/,
  );
});
