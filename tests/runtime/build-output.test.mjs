import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { publishBuild } from "../../scripts/build-output.mjs";

async function fixture(t, old = true) {
  const root = await fs.mkdtemp(join(tmpdir(), "dmz-build-output-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  if (old) {
    await fs.mkdir(join(root, "dist"));
    await fs.writeFile(join(root, "dist/index.html"), "OLD usable reader");
    await fs.writeFile(join(root, "dist/old-only.txt"), "OLD sentinel");
  }
  return root;
}
const generate = async (dist) => {
  await fs.writeFile(join(dist, "index.html"), "NEW reader");
  await fs.writeFile(join(dist, "new-only.txt"), "NEW sentinel");
};
const validate = async (dist) => {
  assert.equal(
    await fs.readFile(join(dist, "index.html"), "utf8"),
    "NEW reader",
  );
};
async function oldRemains(root) {
  assert.equal(
    await fs.readFile(join(root, "dist/index.html"), "utf8"),
    "OLD usable reader",
  );
  assert.equal(
    await fs.readFile(join(root, "dist/old-only.txt"), "utf8"),
    "OLD sentinel",
  );
  await assert.rejects(fs.access(join(root, "dist/new-only.txt")));
}
function failingRename(...positions) {
  let call = 0;
  return {
    ...fs,
    rename: async (...args) => {
      if (positions.includes(++call)) {
        throw Object.assign(new Error(`Synthetic promotion failure ${call}`), {
          code: "EPERM",
        });
      }
      return fs.rename(...args);
    },
  };
}

test("successful first build publishes only the complete candidate", async (t) => {
  const root = await fixture(t, false);
  const result = await publishBuild({ root, generate, validate });
  assert.equal(result.published, true);
  assert.equal(
    await fs.readFile(join(root, "dist/index.html"), "utf8"),
    "NEW reader",
  );
});
test("complete replacement removes obsolete old-only routes", async (t) => {
  const root = await fixture(t);
  await publishBuild({ root, generate, validate });
  assert.equal(
    await fs.readFile(join(root, "dist/index.html"), "utf8"),
    "NEW reader",
  );
  await assert.rejects(fs.access(join(root, "dist/old-only.txt")));
  assert.deepEqual(await fs.readdir(join(root, ".build-state")), []);
});
for (const phase of ["write", "copy", "validation"]) {
  test(`${phase} failure leaves OLD bytes at dist`, async (t) => {
    const root = await fixture(t);
    await assert.rejects(
      publishBuild({
        root,
        generate: async (dist) => {
          await generate(dist);
          if (phase !== "validation") throw new Error(`Synthetic ${phase} EIO`);
        },
        validate: async () => {
          if (phase === "validation")
            throw new Error("Synthetic validation error");
        },
      }),
      /OLD build retained at .*dist/,
    );
    await oldRemains(root);
  });
}
test("failed initial build does not publish partial output", async (t) => {
  const root = await fixture(t, false);
  await assert.rejects(
    publishBuild({
      root,
      generate: async (dist) => {
        await generate(dist);
        throw new Error("EIO");
      },
      validate,
    }),
    /No previous build exists/,
  );
  await assert.rejects(fs.access(join(root, "dist")));
});
test("failure moving OLD dist leaves it unchanged", async (t) => {
  const root = await fixture(t);
  await assert.rejects(
    publishBuild({ root, generate, validate, filesystem: failingRename(1) }),
    /OLD build retained at .*dist/,
  );
  await oldRemains(root);
});
test("promotion failure restores OLD dist", async (t) => {
  const root = await fixture(t);
  await assert.rejects(
    publishBuild({ root, generate, validate, filesystem: failingRename(2) }),
    /OLD build retained at .*dist/,
  );
  await oldRemains(root);
});
test("rollback failure retains complete OLD tree and reports unavailable normal path", async (t) => {
  const root = await fixture(t);
  let failure;
  try {
    await publishBuild({
      root,
      generate,
      validate,
      filesystem: failingRename(2, 3),
    });
  } catch (error) {
    failure = error;
  }
  assert(failure);
  assert.match(failure.message, /OLD build retained for recovery at/);
  assert.match(failure.message, /normal dist path is unavailable/);
  assert.equal(
    await fs.readFile(join(failure.retainedPath, "index.html"), "utf8"),
    "OLD usable reader",
  );
  assert.equal(
    await fs.readFile(join(failure.retainedPath, "old-only.txt"), "utf8"),
    "OLD sentinel",
  );
  await assert.rejects(fs.access(join(root, "dist")));
  const before = (await fs.readdir(join(root, ".build-state"))).sort();
  await assert.rejects(
    publishBuild({ root, generate, validate }),
    /interrupted|recovery/i,
  );
  assert.deepEqual(
    (await fs.readdir(join(root, ".build-state"))).sort(),
    before,
  );
});
test("cooperating concurrent builds fail without taking the existing lock", async (t) => {
  const root = await fixture(t);
  let resume, entered;
  const paused = new Promise((resolve) => {
    resume = resolve;
  });
  const ready = new Promise((resolve) => {
    entered = resolve;
  });
  const first = publishBuild({
    root,
    generate: async (dist) => {
      entered();
      await paused;
      await generate(dist);
    },
    validate,
  });
  await ready;
  const lockBytes = await fs.readFile(join(root, ".build-state/current.lock"));
  await assert.rejects(
    publishBuild({ root, generate, validate }),
    /Another build or interrupted build/,
  );
  assert.deepEqual(
    await fs.readFile(join(root, ".build-state/current.lock")),
    lockBytes,
  );
  await oldRemains(root);
  resume();
  await first;
});
test("pre-existing uncertain build material is preserved and diagnosed", async (t) => {
  const root = await fixture(t);
  await fs.mkdir(join(root, ".build-state"));
  await fs.mkdir(join(root, ".build-state/previous-interrupted"));
  await fs.writeFile(
    join(root, ".build-state/previous-interrupted/index.html"),
    "retained before crash",
  );
  await assert.rejects(
    publishBuild({ root, generate, validate }),
    /interrupted|recovery/i,
  );
  assert.equal(
    await fs.readFile(
      join(root, ".build-state/previous-interrupted/index.html"),
      "utf8",
    ),
    "retained before crash",
  );
  await oldRemains(root);
});
test("candidate cleanup failure is reported without losing OLD", async (t) => {
  const root = await fixture(t);
  const filesystem = {
    ...fs,
    rm: async () => {
      throw new Error("Synthetic cleanup failure");
    },
  };
  await assert.rejects(
    publishBuild({
      root,
      filesystem,
      generate: async () => {
        throw new Error("Synthetic generation error");
      },
      validate,
    }),
    /OLD build retained/,
  );
  await oldRemains(root);
});

test("OLD is inspected after acquiring the output lock, not before a competing promotion", async (t) => {
  const root = await fixture(t, false);
  let inserted = false;
  const filesystem = {
    ...fs,
    open: async (path, ...args) => {
      if (!inserted && String(path).endsWith("current.lock")) {
        inserted = true;
        await fs.mkdir(join(root, "dist"));
        await fs.writeFile(
          join(root, "dist/index.html"),
          "OLD just promoted by prior build",
        );
      }
      return fs.open(path, ...args);
    },
  };
  await assert.rejects(
    publishBuild({
      root,
      filesystem,
      generate: async () => {
        throw new Error("Synthetic later failure");
      },
      validate,
    }),
    /OLD build retained at/,
  );
  assert.equal(
    await fs.readFile(join(root, "dist/index.html"), "utf8"),
    "OLD just promoted by prior build",
  );
});
