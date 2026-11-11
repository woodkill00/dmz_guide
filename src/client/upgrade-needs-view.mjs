import { escapeHTML as esc } from "../ui/render.mjs";
import { inventoryReviewReasons } from "../domain/inventory-review.mjs";
export function upgradeNeedCell(id, scope, label) {
  if (scope === "collection")
    return `<span class="inventory-upgrade-need inventory-counts" role="group" aria-label="${esc(label)}" data-upgrade-need="collection" data-item="${esc(id)}"><span class="inventory-count-column"><small>Needed</small><strong data-tier-required>Unknown</strong></span><span class="inventory-count-column"><small>Missing</small><strong data-tier-missing>Unknown</strong></span><small data-tier-uncertainty></small></span>`;

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
  // Display reported costs without promoting them to verified accounting.
  if (
    row.required == null &&
    row.contributors.every(
      (c) =>
        !scope.excludedNumericIds?.has(c.id) &&
        Number.isSafeInteger(c.quantity) &&
        c.quantity >= 0 &&
        ["consumed", "retained", "unknown"].includes(c.consumption),
    )
  ) {
    const consumed = row.contributors.reduce(
      (n, c) => n + (c.consumption === "retained" ? 0 : c.quantity),
      0,
    );
    const retained = Math.max(
      0,
      ...row.contributors
        .filter((c) => c.consumption === "retained")
        .map((c) => c.quantity),
    );
    const required = consumed + retained;
    if (Number.isSafeInteger(required) && required <= 1e12)
      return {
        required: required.toLocaleString("en-US"),
        missing:
          row.held == null
            ? "Enter owned"
            : Math.max(0, required + row.reserve - row.held).toLocaleString(
                "en-US",
              ),
        provisional: true,
        note: "Listed / provisional; unknown consumption is budgeted as consumed. Eligibility remains separate.",
      };
  }
  return {
    required: row.required === null ? "Unknown" : String(row.required),
    missing: row.search === null ? "Unknown" : String(row.search),
    note: scope.partial
      ? "Listed requirements only; additional or unknown costs may exist."
      : "Listed requirements; eligibility is separate.",
  };
}
export function collectionNeedsValues(collection, id, uses = null) {
  const row = collection?.get(id);
  if (!row?.used) {
    if (collection?.blocked || collection?.limited)
      return {
        required: "Review",
        missing: "Review",
        state: "review",
        emptyReason: "blocked",
        note: "Calculations are blocked. Review the inventory warning before using these counts.",
      };
    const references = [...(uses?.upgrades || []), ...(uses?.missions || [])];
    const completed =
      references.length > 0 &&
      references.every((reference) => reference.completed);
    return {
      required: "0",
      missing: "0",
      state: completed ? "covered" : "none",
      emptyReason: completed ? "completed" : "unlisted",
      note: completed
        ? "All listed upgrades and missions using this item are completed. Uncheck an upgrade to restore its requirements."
        : "No unfinished requirement is listed for this item in the selected catalog.",
    };
  }
  const n = (value) => Number(value).toLocaleString("en-US");
  const minimum = row.consumed + row.retained;
  const knownMinimum =
    !collection.blocked &&
    !collection.limited &&
    Number.isSafeInteger(minimum) &&
    minimum > 0 &&
    minimum <= 1e12;

  return {
    required:
      row.required == null
        ? knownMinimum
          ? "At least " + n(minimum)
          : "Unknown"
        : (row.quantityUnknown ? "At least " : "") + n(row.required),
    missing:
      row.missing == null
        ? row.stockMissing
          ? "Enter owned"
          : row.knownMissing > 0
            ? "At least " + n(row.knownMissing)
            : "Unknown"
        : (row.quantityUnknown ? "At least " : "") + n(row.missing),
    state: row.state,
    note: "All unfinished upgrades and missions, including ingredients for current output shortages. Recipe access is separate.",
  };
}
export function upgradeNeedsDetail(pack, needs, id, profile = null) {
  const collectionView = needs.listedCollection || needs.collection;
  const collected = collectionView?.get(id);
  const display = collectionNeedsValues(collectionView, id);
  const collection = collected?.used
    ? `<section><h4>Unfinished upgrade / mission collection</h4><p>${esc(collected.label)}${collected.craft ? " · Crafting ingredient" : ""}. Required ${esc(display.required)}; missing ${esc(display.missing)}.</p><p>Shared listed costs, current draft stock after reserves, recipe batch yields and held outputs. Quantity coverage does not certify crafting access or eligibility. Yellow means unresolved or partial demand; crafting use is labelled separately. Next / All upgrade columns below exclude the separate mission/crafting projection.</p><ul>${[...collected.names].map((name) => `<li>${esc(name)}</li>`).join("")}</ul></section>`
    : "";
  const review =
    profile && collected?.used
      ? inventoryReviewReasons(pack, profile, collectionView, collected)
      : [];
  return (
    collection +
    (review.length
      ? `<section data-inventory-review><h4>Why this needs attention</h4><ul>${review.map((r) => `<li>${esc(r.text)}</li>`).join("")}</ul></section>`
      : "") +
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
