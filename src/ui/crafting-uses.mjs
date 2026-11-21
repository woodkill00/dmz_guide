import {
  buildCraftingUses,
  visibleCraftingMethods,
  craftingInputAmounts,
  craftReferenceAnchor,
} from "../domain/crafting-uses.mjs";
const cache = new WeakMap();
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const quantity = (value) =>
  value == null ? "Amount not recorded" : `× ${value}`;
const context = (method) =>
  method.kind === "catalog"
    ? method.station
    : method.kind === "x01"
      ? method.station
      : `${method.kind === "blueprint" ? "Blueprint" : "Crafting"} reference · station not recorded`;
export function renderCraftingUses(record, pack, referenceURL) {
  if (!cache.has(pack)) cache.set(pack, buildCraftingUses(pack));
  const index = cache.get(pack);
  const link = (item, hash = "", label = item.name) =>
    `<a href="${esc(referenceURL({ ...item, recordType: item.recordType || (pack.recipes.includes(item) ? "recipe" : pack.objectives.includes(item) ? "objective" : "item"), pack }) + hash)}">${esc(label)}</a>`;
  const shown = (methods) =>
    visibleCraftingMethods(pack, methods || [], !!record.spoiler);
  const grouped = new Map();
  for (const method of shown(index.uses.get(record.id))) {
    if (!grouped.has(method.output.id))
      grouped.set(method.output.id, { output: method.output, methods: [] });
    grouped.get(method.output.id).methods.push(method);
  }
  const methodLink = (method) =>
    method.recipe
      ? link(method.recipe)
      : link(
          method.output,
          `#${craftReferenceAnchor(method.id)}`,
          method.label,
        );
  const groups = [...grouped.values()].sort((a, b) =>
    a.output.name.localeCompare(b.output.name),
  );
  const uses = `<details open class="item-craft-uses" data-crafting-uses><summary>Used to craft (${groups.length} items)</summary>${
    groups.length
      ? `<ul class="item-craft-products">${groups
          .map(
            ({ output, methods }) =>
              `<li data-craft-output="${esc(output.id)}"><strong>${link(output)}</strong><ul>${methods
                .map(
                  (method) =>
                    `<li data-craft-method="${esc(method.id)}">${methodLink(method)} <span>· ${esc(context(method))}</span><br><small>This item: ${craftingInputAmounts(
                      method,
                      record.id,
                    )
                      .map(
                        (input) =>
                          `${esc(quantity(input.quantity))} · ${input.role === "consumed" ? "consumed" : input.role === "retained" ? "retained tool" : "listed requirement; consumption not recorded"}`,
                      )
                      .join("; ")}</small></li>`,
                )
                .join("")}</ul></li>`,
          )
          .join("")}</ul>`
      : "<p>No direct crafting uses recorded in this catalog and its captured references.</p>"
  }<small>Recorded recipes and source references. Access and blueprint ownership are separate; current-game coverage may be incomplete.</small></details>`;
  const references = shown(index.produces.get(record.id)).filter(
    (method) => !method.recipe,
  );
  const own = references.length
    ? `<details open class="item-craft-references"><summary>Reported recipes for this item (${references.length})</summary>${references
        .map(
          (method) =>
            `<section id="${craftReferenceAnchor(method.id)}">${method.references
              .slice(1)
              .map(
                (ref) => `<span id="${craftReferenceAnchor(ref.id)}"></span>`,
              )
              .join(
                "",
              )}<h3>${esc(method.label)}</h3><p>${esc(context(method))} · Source-reported${["blueprint", "crafting"].includes(method.kind) ? (method.access == null ? " · DMZ level not recorded" : ` · Reported DMZ level ${esc(method.access)}`) : ""}${method.outputQuantity == null ? " · output amount not recorded" : ` · output × ${esc(method.outputQuantity)}`}.</p><ul>${method.inputs.map((input) => `<li>${input.record ? link(input.record) : "Unmapped ingredient"} ${esc(quantity(input.quantity))}</li>`).join("") || "<li>No requirements recorded; this does not establish a free craft.</li>"}</ul>${method.prerequisites.length ? `<p>FOB prerequisites: ${method.prerequisites.map((input) => (input.record ? link(input.record) : "Unmapped prerequisite")).join(", ")}</p>` : ""}${method.sourceURL ? `<p><a href="${esc(method.sourceURL)}" rel="noreferrer noopener">Recipe source ↗</a></p>` : ""}</section>`,
        )
        .join("")}</details>`
    : "";
  return uses + own;
}
