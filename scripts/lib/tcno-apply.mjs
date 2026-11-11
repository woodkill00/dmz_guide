import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { resolve, relative, sep, isAbsolute } from "node:path";
export async function applyTcnoChanges(
  root,
  changes,
  { writer = writeFile } = {},
) {
  if (changes.length > 600) throw Error("Import change limit");
  const prepared = [];
  for (const change of changes) {
    const path = resolve(change.file),
      rel = relative(root, path);
    if (
      !rel ||
      isAbsolute(rel) ||
      rel.startsWith(".." + sep) ||
      rel === ".." ||
      resolve(root, rel) !== path
    )
      throw Error("Import path outside workspace");
    let before = null;
    try {
      before = await readFile(path);
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    const after = Buffer.from(change.text);
    if (after.length > 2_000_000) throw Error("Import record limit");
    if (before?.equals(after)) continue;
    prepared.push({ file: path, relative: rel, before, after });
  }
  if (!prepared.length) return { changed: 0 };
  const backup = resolve(
    root,
    ".local/tcno-import-backups",
    Date.now() + "-" + Math.random().toString(16).slice(2),
  );
  await mkdir(backup, { recursive: true });
  await writeFile(
    resolve(backup, "before.json"),
    JSON.stringify(
      prepared.map((p) => ({
        path: p.relative,
        before: p.before?.toString("base64") ?? null,
      })),
      null,
      2,
    ),
  );
  const attempted = [];
  try {
    for (const entry of prepared) {
      attempted.push(entry);
      await writer(entry.file, entry.after);
    }
    await writeFile(resolve(backup, "state.txt"), "complete\n");
  } catch (error) {
    const failed = [];
    for (const entry of attempted.reverse())
      try {
        if (entry.before === null)
          await unlink(entry.file).catch((e) => {
            if (e.code !== "ENOENT") throw e;
          });
        else await writeFile(entry.file, entry.before);
      } catch (e) {
        failed.push(e.message);
      }
    await writeFile(
      resolve(backup, "state.txt"),
      failed.length
        ? "recovery-required\n" + failed.join("\n")
        : "rolled-back\n",
    );
    throw new Error(
      `Import failed; ${failed.length ? "manual recovery required" : "previous files restored"}. Backup: ${backup}`,
      { cause: error },
    );
  }
  return { changed: prepared.length, backup };
}
