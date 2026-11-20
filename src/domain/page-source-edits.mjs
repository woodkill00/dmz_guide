import { assert } from "../content/limits.mjs";
const stableJSON = JSON.stringify;
const exact = (value, fields) =>
  assert(
    value &&
      Object.keys(value).sort().join(" ") ===
        fields.split(" ").sort().join(" "),
    "Invalid correction fields",
  );
export function sourceValue(record, path) {
  let value = record;
  for (const encoded of path.slice(1).split("/")) {
    const key = encoded.replaceAll("~1", "/").replaceAll("~0", "~");
    if (Array.isArray(value) && key.startsWith("@")) {
      value = value.find((v) => v?.id === key.slice(1));
      if (value === undefined) return { present: false, value: null };
    } else {
      if (!value || typeof value !== "object" || !Object.hasOwn(value, key))
        return { present: false, value: null };
      value = value[key];
    }
  }
  return { present: true, value };
}
export function validateSourceEdits(edits) {
  assert(
    Array.isArray(edits) && edits.length <= 64,
    "Local source correction limit",
  );
  const seen = new Set();
  for (const edit of edits) {
    exact(edit, "path beforePresent afterPresent before after editedAt origin");
    assert(
      typeof edit.path === "string" &&
        edit.path.startsWith("/") &&
        edit.path.length <= 200 &&
        !seen.has(edit.path) &&
        !edit.path
          .split("/")
          .some((s) => ["__proto__", "prototype", "constructor"].includes(s)),
      "Invalid source correction path",
    );
    seen.add(edit.path);
    assert(
      edit.origin === "local-author" &&
        typeof edit.beforePresent === "boolean" &&
        typeof edit.afterPresent === "boolean",
      "Invalid correction origin",
    );
    for (const value of [edit.before, edit.after])
      assert(
        value === null ||
          typeof value === "boolean" ||
          (typeof value === "number" && Number.isFinite(value)) ||
          (typeof value === "string" && value.length <= 2000),
        "Invalid correction value",
      );
    assert(
      typeof edit.editedAt === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(edit.editedAt) &&
        new Date(edit.editedAt).toISOString() === edit.editedAt,
      "Invalid correction timestamp",
    );
  }
  return edits;
}
export function mergeSourceEdits(previous, before, after) {
  const result = new Map(
      validateSourceEdits(previous)
        .filter((e) => {
          const current = sourceValue(before, e.path);
          return (
            current.present === e.afterPresent &&
            stableJSON(current.value) === stableJSON(e.after)
          );
        })
        .map((e) => [e.path, structuredClone(e)]),
    ),
    at = new Date().toISOString();
  const walk = (a, b, path, ap = true, bp = true) => {
    if (stableJSON(a) === stableJSON(b) && ap === bp) return;
    const ao = a && typeof a === "object",
      bo = b && typeof b === "object";
    if (ao || bo) {
      if (
        Array.isArray(a) &&
        Array.isArray(b) &&
        [...a, ...b].every((v) => v && typeof v.id === "string")
      ) {
        const am = new Map(a.map((v) => [v.id, v])),
          bm = new Map(b.map((v) => [v.id, v]));
        for (const id of new Set([...am.keys(), ...bm.keys()]))
          walk(
            am.get(id),
            bm.get(id),
            path + "/" + ("@" + id).replaceAll("~", "~0").replaceAll("/", "~1"),
            am.has(id),
            bm.has(id),
          );
        return;
      }
      for (const key of new Set([
        ...Object.keys(ao ? a : {}),
        ...Object.keys(bo ? b : {}),
      ]))
        walk(
          ao ? a[key] : undefined,
          bo ? b[key] : undefined,
          path + "/" + key.replaceAll("~", "~0").replaceAll("/", "~1"),
          !!ao && Object.hasOwn(a, key),
          !!bo && Object.hasOwn(b, key),
        );
      return;
    }
    assert(
      !/(?:^|\/)(?:image|images|sha256)(?:\/|$)/.test(path),
      "Downloaded image registrations require a separate reviewed ingestion; use picture placements instead",
    );
    const old = result.get(path),
      original = old
        ? { present: old.beforePresent, value: old.before }
        : { present: ap, value: ap ? a : null };
    if (
      original.present === bp &&
      stableJSON(original.value) === stableJSON(bp ? b : null)
    ) {
      result.delete(path);
      return;
    }
    result.set(path, {
      path,
      beforePresent: original.present,
      afterPresent: bp,
      before: original.value,
      after: bp ? b : null,
      editedAt: at,
      origin: "local-author",
    });
  };
  walk(before, after, "");
  return validateSourceEdits(
    [...result.values()].sort((a, b) => a.path.localeCompare(b.path)),
  );
}
