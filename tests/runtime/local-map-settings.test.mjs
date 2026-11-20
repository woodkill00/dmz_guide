import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mapUpdateSetting } from "../../scripts/local-map-settings.mjs";

test("unified launcher preserves existing map opt-in and explicit overrides", async () => {
  const root = await mkdtemp(join(tmpdir(), "dmz-update-setting-"));
  try {
    assert.equal(await mapUpdateSetting(root, {}), "0");
    await mkdir(join(root, "tools/hajin-map"), { recursive: true });
    const file = join(root, "tools/hajin-map/.env.development.local");
    await writeFile(file, 'DMZ_ENABLE_SOURCE_UPDATES="1"\nUNRELATED=ignored\n');
    assert.equal(await mapUpdateSetting(root, {}), "1");
    assert.equal(
      await mapUpdateSetting(root, { DMZ_ENABLE_SOURCE_UPDATES: "0" }),
      "0",
    );
    await writeFile(file, "DMZ_ENABLE_SOURCE_UPDATES=0\n");
    assert.equal(await mapUpdateSetting(root, {}), "0");
    assert.equal(
      await mapUpdateSetting(root, { DMZ_ENABLE_SOURCE_UPDATES: "1" }),
      "1",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
