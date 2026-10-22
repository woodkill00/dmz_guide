import * as fs from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

async function directory(filesystem, path, optional = false) {
  try {
    const info = await filesystem.lstat(path);
    if (!info.isDirectory() || info.isSymbolicLink())
      throw new Error(`Build path must be a real directory: ${path}`);
    return true;
  } catch (error) {
    if (optional && error.code === "ENOENT") return false;
    throw error;
  }
}

// A portable directory replacement is not a single atomic operation. Keep the
// complete previous tree until publication succeeds, and never erase uncertain
// recovery material. filesystem is a narrow fault-injection boundary for tests.
export async function publishBuild({
  root,
  generate,
  validate,
  filesystem = fs,
}) {
  root = resolve(root);
  const dist = join(root, "dist"),
    state = join(root, ".build-state"),
    lock = join(state, "current.lock"),
    id = randomUUID(),
    candidate = join(state, `candidate-${id}`),
    previous = join(state, `previous-${id}`);
  let oldAtDist = false,
    oldAtPrevious = false,
    locked = false,
    candidateCreated = false,
    published = false,
    retainLock = false,
    phase = "preparing",
    existingRecovery = false,
    distInspected = false,
    failure;
  const warnings = [];
  const checkpoint = async (next) => {
    phase = next;
    await filesystem.writeFile(
      lock,
      JSON.stringify({
        version: 1,
        id,
        pid: process.pid,
        phase,
        candidate,
        previous,
      }) + "\n",
    );
  };
  try {
    await directory(filesystem, root);
    await filesystem.mkdir(state, { recursive: true });
    await directory(filesystem, state);
    let handle;
    try {
      handle = await filesystem.open(lock, "wx");
      locked = true;
    } catch (error) {
      if (error.code === "EEXIST") {
        existingRecovery = true;
        throw new Error(
          "Another build or interrupted build owns .build-state/current.lock. Inspect it before retrying; no recovery material was changed.",
          { cause: error },
        );
      }
      throw error;
    }
    await handle.close();
    await checkpoint("preparing");
    oldAtDist = await directory(filesystem, dist, true);
    distInspected = true;
    const retained = (await filesystem.readdir(state)).filter(
      (name) => name !== "current.lock",
    );
    if (retained.length) {
      existingRecovery = true;
      throw new Error(
        "An interrupted build or retained recovery tree exists in .build-state. Inspect and explicitly resolve it before retrying; nothing was removed.",
      );
    }
    await filesystem.mkdir(candidate);
    candidateCreated = true;
    const value = await generate(candidate);
    await validate(candidate, value);
    await checkpoint("candidate-complete");
    if (oldAtDist) {
      await filesystem.rename(dist, previous);
      oldAtDist = false;
      oldAtPrevious = true;
      await checkpoint("previous-retained");
    }
    await filesystem.rename(candidate, dist);
    candidateCreated = false;
    published = true;
    oldAtDist = false;
    // Publication is already complete. Cleanup errors are warnings, not a false
    // claim that the old build is still current or that no new build was made.
    try {
      await checkpoint("promoted");
      if (oldAtPrevious) {
        await filesystem.rm(previous, { recursive: true });
        oldAtPrevious = false;
      }
    } catch (error) {
      warnings.push(
        `New build is published; cleanup needs inspection in ${state}: ${error.message}`,
      );
    }
    return { published: true, value, warnings };
  } catch (error) {
    if (oldAtPrevious && !published) {
      try {
        // Never overwrite an unexpected destination while trying to recover.
        if (await directory(filesystem, dist, true))
          throw new Error(
            "dist appeared during failed promotion; refusing to overwrite it",
          );
        await filesystem.rename(previous, dist);
        oldAtPrevious = false;
        oldAtDist = true;
      } catch (rollback) {
        retainLock = true;
        warnings.push(`Rollback failed: ${rollback.message}`);
      }
    }
    if (candidateCreated && !retainLock) {
      try {
        await filesystem.rm(candidate, { recursive: true });
        candidateCreated = false;
      } catch (cleanup) {
        warnings.push(
          `Incomplete candidate retained at ${candidate}: ${cleanup.message}`,
        );
      }
    }
    let message, retainedPath;
    if (existingRecovery && !locked) {
      message = `OLD/current output location cannot be verified while another or interrupted build owns ${lock}. Inspect dist and ${state}; this attempt did not change either tree.`;
    } else if (oldAtPrevious) {
      retainedPath = previous;
      const normalExists = await filesystem.lstat(dist).then(
        () => true,
        () => false,
      );
      message = `OLD build retained for recovery at ${previous}; ${normalExists ? "normal dist path is not restored to OLD" : "normal dist path is unavailable"}. Stop reader/build processes, inspect .build-state/current.lock and both trees, then explicitly restore OLD before retrying. No automatic recovery was performed.`;
    } else if (oldAtDist) {
      retainedPath = dist;
      message = `OLD build retained at ${dist}; this rebuild did not succeed.`;
    } else if (existingRecovery) {
      message = `Possible OLD build/recovery material retained at ${state}; normal dist path is unavailable. Inspect the retained trees and lock before retrying; no replacement was published.`;
    } else if (!distInspected) {
      message =
        "Previous build state could not be verified; no replacement was published.";
    } else {
      message = "No previous build exists; no replacement was published.";
    }
    failure = new Error(
      `Build failed during ${phase}: ${error.message}\n${message}${warnings.length ? "\n" + warnings.join("\n") : ""}`,
      { cause: error },
    );
    failure.retainedPath = retainedPath;
    throw failure;
  } finally {
    const before = warnings.length;
    if (locked && !retainLock) {
      try {
        const owner = JSON.parse(await filesystem.readFile(lock, "utf8"));
        if (owner.id === id) await filesystem.unlink(lock);
        else warnings.push(`Build lock ownership changed; inspect ${lock}.`);
      } catch (error) {
        warnings.push(
          `Build lock was not released; inspect ${lock}: ${error.message}`,
        );
      }
    }
    if (failure && warnings.length > before)
      failure.message += "\n" + warnings.slice(before).join("\n");
  }
}
