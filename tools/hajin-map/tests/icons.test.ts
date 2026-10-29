import { test } from "node:test";
import assert from "node:assert/strict";
import { validateStoredIcon, deleteIcon } from "../src/workspace/icons.ts";
import { emptyWorkspace } from "../src/workspace/model.ts";
test("invalid icon bytes and metadata fail before decode; referenced deletion requires replacement", () => {
  assert.throws(() =>
    validateStoredIcon({
      id: "a".repeat(64),
      base64: btoa("<svg/>"),
      width: 1,
      height: 1,
      description: "x",
      rightsDeclaration: "owned",
    }),
  );
  const s = emptyWorkspace();
  s.categoryIcons.push({ category: "Mine", iconId: "a" });
  assert.throws(() => deleteIcon(s, "a", null));
});
