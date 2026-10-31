import { escapeHTML as esc } from "../ui/render.mjs";
export function upgradeNeedCell(id, scope, label) {
  return `<span class="inventory-upgrade-need" role="group" aria-label="${esc(label)}" data-upgrade-need="${scope}" data-item="${esc(id)}"><span class="upgrade-need-label">${esc(label)}</span><strong>Need <span data-tier-required>Unknown</span></strong><small>Missing <span data-tier-missing>Unknown</span></small><small data-tier-uncertainty></small></span>`;
}
export function needsValues(scope, id) {
  const used = scope.used.has(id);
  if (!used && !scope.membershipLimited)
    return {
      required: "-",
      missing: "-",
      note: "No known unfinished upgrade use in this scope.",
    };
  const row = scope.rows.get(id);
  if (
    scope.status !== "ok" ||
    !row ||
    !row.contributors.length ||
    scope.membershipLimited
  )
    return {
      required: "Unknown",
      missing: "Unknown",
      note: "Requirement or profile binding needs review.",
    };
  return {
    required: row.required === null ? "Unknown" : String(row.required),
    missing: row.search === null ? "Unknown" : String(row.search),
    note: scope.partial
      ? "Listed requirements only; additional or unknown costs may exist."
      : "Listed requirements; eligibility is separate.",
  };
}
export function upgradeNeedsDetail(pack, needs, id) {
  const collected = needs.collection?.get(id);
  const collection = collected?.used
    ? `<section><h4>Unfinished upgrade / mission collection</h4><p>${esc(collected.label)}${collected.craft ? " · Crafting ingredient" : ""}. Required ${collected.required == null ? "Unknown" : esc(collected.required)}; missing ${collected.missing == null ? (collected.knownMissing > 0 ? `at least ${esc(collected.knownMissing)}` : "Unknown") : esc(collected.missing)}.</p><p>Shared listed costs, current draft stock after reserves, recipe batch yields and held outputs. Quantity coverage does not certify crafting access or eligibility. Yellow means unresolved or partial demand; crafting use is labelled separately. Next / All upgrade columns below exclude the separate mission/crafting projection.</p><ul>${[...collected.names].map((name) => `<li>${esc(name)}</li>`).join("")}</ul></section>`
    : "";
  return (
    collection +
    [
      ["next", "Next listed tier in each group"],
      ["all", "All known unfinished upgrades"],
    ]
      .map(([scope, label]) => {
        const data = needs[scope],
          row = data.rows.get(id),
          values = needsValues(data, id);
        const uses = row?.contributors || [];
        return `<section><h4>${label}</h4><p>Required: ${esc(values.required)}; missing including reserve shortfall: ${esc(values.missing)}. ${esc(values.note)}</p><p>Consumed ${data.status !== "ok" || !row?.contributors.length || row.required === null ? "unknown total" : esc(row?.knownConsumed ?? 0)} / retained floor ${data.status !== "ok" || !row?.contributors.length || row.required === null ? "unknown total" : esc(row?.knownRetained ?? 0)}. Saved completion; current inventory draft. Units remain separate.</p><ul>${uses
          .slice(0, 50)
          .map(
            (use) =>
              `<li><a href="/local/?pack=${encodeURIComponent(pack.id)}&amp;id=${encodeURIComponent(use.id)}" tabindex="0" target="_blank" rel="noopener noreferrer">${esc(use.name)}</a>: ${use.quantity === null ? "Unknown" : esc(use.quantity)} / ${esc(use.consumption)}</li>`,
          )
          .join(
            "",
          )}</ul>${uses.length > 50 ? "<p>First50 contributors; narrow the upgrade list for more.</p>" : ""}${!uses.length && data.used.has(id) ? "<p>Known unfinished reference; exact accounting unavailable. Inspect Upgrade uses below.</p>" : ""}</section>`;
      })
      .join("")
  );
}
