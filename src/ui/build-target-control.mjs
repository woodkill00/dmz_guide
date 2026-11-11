const e = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function buildTargetControl(
  pack,
  id,
  profile = null,
  { auto = false } = {},
) {
  const selected = Object.hasOwn(profile?.buildTargets || {}, id),
    value = profile?.buildTargets?.[id] ?? 1;
  const item = pack.items.find((i) => i.id === id);
  if (!item || (item.spoiler && !profile?.spoilers)) return "";
  return `<div class="build-target-choice" data-build-control data-build-pack="${e(pack.id)}" data-build-item="${e(id)}"${auto ? " data-build-auto" : ""}><label><input type="checkbox" data-build-select aria-label="Want to build or get ${e(item.name)}"${selected ? " checked" : ""}${auto ? " disabled" : ""}> Want to build / get</label><label class="build-target-count">How many more<input type="number" min="1" max="1000000" step="1" name="build:${e(id)}" data-build-quantity aria-label="Additional quantity for ${e(item.name)}" value="${e(value)}"${!selected || auto ? " disabled" : ""}></label><small data-build-status role="status">${auto ? "Loading saved target…" : "Save with inventory"}</small></div>`;
}
