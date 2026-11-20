import { assert, boundedWalk } from "../content/limits.mjs";
export function chapterReaderPath(id) {
  const match = /^(hajin|x01)-([1-9]\d?)$/.exec(id);
  assert(
    match &&
      Number(match[2]) >= 1 &&
      Number(match[2]) <= (match[1] === "hajin" ? 24 : 5),
    "Invalid chapter identity",
  );
  return `/missions/${match[1]}/${Number(match[2])}/`;
}
export function validateChapterOverrides(value) {
  boundedWalk(value, { depth: 6, nodes: 10000, string: 2000 });
  assert(
    value &&
      Object.keys(value).sort().join() === "chapters,version" &&
      value.version === 1 &&
      Array.isArray(value.chapters) &&
      value.chapters.length <= 29,
    "Invalid chapter override document",
  );
  const ids = new Set();
  for (const row of value.chapters) {
    assert(
      row &&
        Object.keys(row).every((k) =>
          ["id", "rewards", "reviewedAt", "notes"].includes(k),
        ) &&
        /^hajin-(?:[1-9]|1[0-9]|2[0-4])$|^x01-[1-5]$/.test(row.id) &&
        !ids.has(row.id),
      "Invalid chapter identity",
    );
    ids.add(row.id);
    assert(
      Array.isArray(row.rewards) &&
        row.rewards.length <= 32 &&
        row.rewards.every(
          (v) => typeof v === "string" && v.trim() && v.length <= 200,
        ),
      "Invalid chapter rewards",
    );
    assert(
      typeof row.reviewedAt === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(row.reviewedAt) &&
        new Date(row.reviewedAt).toISOString().slice(0, 10) === row.reviewedAt,
      "Invalid chapter review date",
    );
    assert(
      row.notes === undefined ||
        (typeof row.notes === "string" && row.notes.length <= 2000),
      "Invalid chapter note",
    );
  }
  return value;
}
