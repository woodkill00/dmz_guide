import test from "node:test";
import assert from "node:assert/strict";
import { createAuthorServer } from "../../scripts/author.mjs";
import { createWeaponManager } from "../../scripts/weapon-manager.mjs";
test("071 companion preparation rejects invalid variants before opening a repository or service", async () => {
  const previous = process.env.DMZ_UI_VARIANT;
  process.env.DMZ_UI_VARIANT = "invalid";
  try {
    await assert.rejects(
      createAuthorServer({ root: "__synthetic_missing_ui_root__", port: 0 }),
      /DMZ_UI_VARIANT/,
    );
    await assert.rejects(
      createWeaponManager({ root: "__synthetic_missing_ui_root__", port: 0 }),
      /DMZ_UI_VARIANT/,
    );
  } finally {
    if (previous === undefined) delete process.env.DMZ_UI_VARIANT;
    else process.env.DMZ_UI_VARIANT = previous;
  }
});
