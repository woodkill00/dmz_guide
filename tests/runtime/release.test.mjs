import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
test("release documentation states runtime and external boundaries", () => {
  const text = readFileSync("docs/release.md", "utf8");
  for (const statement of [
    "Node.js 22",
    "127.0.0.1:4173",
    "host root",
    "server stops",
    "not a complete verified",
    "discordInvite",
    "Private reader",
  ])
    assert(text.includes(statement), statement);
});
