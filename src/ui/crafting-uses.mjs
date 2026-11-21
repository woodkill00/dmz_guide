import {
  buildCraftingUses,
  visibleCraftingMethods,
  craftingInputAmounts,
  craftReferenceAnchor,
} from "../domain/crafting-uses.mjs";
import { itemIcon } from "./item-workspace.mjs";
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
export function craftingItemLink(
  item,
  pack,
  referenceURL,
  { hash = "", label = item.name } = {},
) {
  const type =
    item.recordType ||
    (pack.recipes.includes(item)
      ? "recipe"
      : pack.objectives.includes(item)
        ? "objective"
        : "item");
  const iconItem =
    type === "recipe"
      ? pack.items.find((row) => row.id === item.output?.itemId)
      : type === "item"
        ? item
        : null;
  return `<a${iconItem ? ' class="item-craft-button"' : ""} href="${esc(referenceURL({ ...item, recordType: type, pack }) + hash)}">${iconItem ? itemIcon({ ...iconItem, pack }).replace("<span ", '<span aria-hidden="true" ') : ""}<span>${esc(label)}</span></a>`;
}
export function renderCraftingUses(record, pack, referenceURL) {
  if (!cache.has(pack)) cache.set(pack, buildCraftingUses(pack));
  const index = cache.get(pack);
  const link = (item, hash = "", label = item.name) =>
    craftingItemLink(item, pack, referenceURL, { hash, label });
  const shown = (methods) =>
    visibleCraftingMethods(pack, methods || [], !!record.spoiler);
  const grouped = new Map();
  for (const method of shown(index.uses.get(record.id))) {
    if (!grouped.has(method.output.id))
      grouped.set(method.output.id, { output: method.output, methods: [] });
    grouped.get(method.output.id).methods.push(method);
  }
  const groups = [...grouped.values()].sort((a, b) =>
    a.output.name.localeCompare(b.output.name),
  );
  const methodURL = (method) =>
    method.recipe
      ? referenceURL({ ...method.recipe, recordType: "recipe", pack })
      : referenceURL({ ...method.output, recordType: "item", pack }) +
        `#${craftReferenceAnchor(method.id)}`;
  const uses = `<details open class="item-craft-uses" data-crafting-uses><summary>Used to craft (${groups.length})</summary>${
    groups.length
      ? `<ul class="item-craft-products">${groups
          .map(
            ({ output, methods }) =>
              `<li data-craft-output="${esc(output.id)}"><strong>${link(output)}</strong><details class="item-craft-methods"><summary>Recipes (${methods.length})</summary><ul>${methods
                .map(
                  (method) =>
                    `<li data-craft-method="${esc(method.id)}"><a href="${esc(methodURL(method))}">${esc(context(method))}</a><small> ${craftingInputAmounts(
                      method,
                      record.id,
                    )
                      .map(
                        (input) =>
                          `${esc(quantity(input.quantity))}${input.role === "retained" ? " · retained tool" : input.role === "unknown" ? " · usage unverified" : ""}`,
                      )
                      .join("; ")}</small></li>`,
                )
                .join("")}</ul></details></li>`,
          )
          .join("")}</ul>`
      : "<p>No crafting uses recorded.</p>"
  }</details>`;
  const methods = shown(index.produces.get(record.id));
  const own = methods.length
    ? `<section class="item-craft-references"><h3>Make this item</h3>${methods
        .map(
          (method, index) =>
            `<details class="item-craft-recipe" id="${craftReferenceAnchor(method.id)}"${index === 0 ? " open" : ""}><summary>${esc(context(method))}${method.outputQuantity == null ? "" : ` · output × ${esc(method.outputQuantity)}`}</summary>${method.references
              .slice(1)
              .map(
                (ref) => `<span id="${craftReferenceAnchor(ref.id)}"></span>`,
              )
              .join(
                "",
              )}<ul class="item-craft-ingredients">${method.inputs.map((input) => `<li>${input.record ? link(input.record) : "Unmapped ingredient"} <strong>${esc(quantity(input.quantity))}</strong></li>`).join("") || "<li>Ingredients not recorded.</li>"}</ul>${["blueprint", "crafting"].includes(method.kind) ? `<p>${method.access == null ? "DMZ level not recorded" : `Reported DMZ level ${esc(method.access)}`}</p>` : ""}${method.prerequisites.length ? `<p>FOB prerequisites: ${method.prerequisites.map((input) => (input.record ? link(input.record) : "Unmapped prerequisite")).join(", ")}</p>` : ""}<p>${method.recipe ? link(method.recipe, "", "Full recipe") : `<a href="${esc(method.sourceURL)}" rel="noreferrer noopener">Source details ↗</a>`}</p></details>`,
        )
        .join(
          "",
        )}<small>Recorded requirements; access and blueprint ownership are separate.</small></section>`
    : "";
  return own + uses;
}
