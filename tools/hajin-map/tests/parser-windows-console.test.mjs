import { test } from "node:test";
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import { open } from "node:fs/promises";
import { basename } from "node:path";
import { withInertParser } from "../server/source-collectors.mjs";

test(
  "Windows source parser uses GUI-subsystem Chromium headlessly and closes without a command shell",
  {
    skip: process.platform !== "win32" || Boolean(process.env.CI),
  },
  async () => {
    const launches = [];
    const shells = [];
    const spawn = childProcess.spawn;
    const spawnSync = childProcess.spawnSync;
    childProcess.spawn = function (command, args, options) {
      launches.push({ command, args, shell: options?.shell });
      return spawn.call(this, command, args, options);
    };
    childProcess.spawnSync = function (command, ...args) {
      shells.push(command);
      return spawnSync.call(this, command, ...args);
    };
    try {
      await withInertParser(async (page) => {
        assert.equal(
          await page.evaluate(
            () =>
              new DOMParser().parseFromString("<p>fixture</p>", "text/html")
                .body.textContent,
          ),
          "fixture",
        );
      });
      await assert.rejects(
        withInertParser(() => {
          throw Error("synthetic parser failure");
        }),
        /synthetic parser failure/,
      );
      assert.equal(launches.length, 2);
      for (const launch of launches) {
        assert.equal(basename(launch.command).toLowerCase(), "chrome.exe");
        assert.ok(launch.args.includes("--headless"));
        assert.ok(!launch.shell);
        const file = await open(launch.command, "r");
        try {
          const header = Buffer.alloc(64);
          await file.read(header, 0, header.length, 0);
          const subsystem = Buffer.alloc(2);
          await file.read(subsystem, 0, 2, header.readUInt32LE(0x3c) + 24 + 68);
          assert.equal(
            subsystem.readUInt16LE(),
            2,
            "GUI subsystem must not allocate a console",
          );
        } finally {
          await file.close();
        }
      }
      assert.deepEqual(
        shells,
        [],
        "normal and failed parser work must close gracefully without cmd/taskkill",
      );
    } finally {
      childProcess.spawn = spawn;
      childProcess.spawnSync = spawnSync;
    }
  },
);
