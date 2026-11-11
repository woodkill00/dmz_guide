import {
  inventoryFamily,
  inventoryFamilyLabel,
  itemSection,
  inventoryTypeLabel,
  itemRarity,
  compareInventorySections,
  compareInventoryFamilies,
  compareItems,
} from "../domain/inventory-items.mjs";
import { spoilerGuard } from "../domain/progression.mjs";
let activePack = null;
const collapsed = new Set(),
  expanded = new Set();
export function neededCategory(pack, id, index = null) {
  return inventoryFamily(
    (index ? index.get(id) : pack.items.find((item) => item.id === id)) || {
      kind: "item",
    },
  );
}
const node = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};
function install(root) {
  if (root.dataset.neededGroupsInstalled) return;
  root.dataset.neededGroupsInstalled = "true";
  root.addEventListener(
    "toggle",
    (event) => {
      if (
        !root.contains(event.target) ||
        !event.target.matches("[data-needed-group-key]")
      )
        return;
      const key = event.target.dataset.neededGroupKey;
      if (event.target.open) collapsed.delete(key);
      else collapsed.add(key);
    },
    true,
  );
  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-needed-toggle]");
    if (!button || !root.contains(button)) return;
    const detail = document.getElementById(
      button.getAttribute("aria-controls"),
    );
    if (!detail || !root.contains(detail)) return;
    detail.hidden = !detail.hidden;
    button.setAttribute("aria-expanded", String(!detail.hidden));
    if (detail.hidden) expanded.delete(detail.id);
    else expanded.add(detail.id);
  });
}
export function setNeededGroups(open) {
  for (const group of document.querySelectorAll("[data-needed-group-key]")) {
    group.open = open;
    if (open) collapsed.delete(group.dataset.neededGroupKey);
    else collapsed.add(group.dataset.neededGroupKey);
  }
}
// Reuse the exact budget cells, quantities and diagnostics; only change their presentation.
export function groupNeededRows(pack, profile, { inputs = false } = {}) {
  if (activePack !== pack.id) {
    collapsed.clear();
    expanded.clear();
    activePack = pack.id;
  }
  const root = document.querySelector(
      inputs ? "#needed-print-inputs" : "#needed-list",
    ),
    table = root?.querySelector("table");
  if (!table) return;
  install(root);
  const labels = [...table.querySelectorAll("thead th")].map(
    (cell) => cell.textContent,
  );
  const guard = spoilerGuard(pack, profile.spoilers),
    items = new Map(pack.items.map((item) => [item.id, item])),
    groups = new Map();
  const cellValue = (cell) => {
    const value = node("span");
    for (const [key, text] of Object.entries(cell.dataset))
      value.dataset[key] = text;
    value.append(...cell.childNodes);
    return value;
  };
  for (const row of table.querySelectorAll("tbody tr")) {
    const cells = [...row.children],
      id = inputs ? row.dataset.neededPrintInput : row.dataset.neededItem,
      item = items.get(id);
    const family = neededCategory(pack, id, items),
      type = guard.text(
        inventoryTypeLabel(itemSection(item || { kind: "item" })),
      );
    if (!groups.has(family)) groups.set(family, new Map());
    const types = groups.get(family);
    if (!types.has(type)) types.set(type, []);
    const article = node("article", "needed-entry");
    article.setAttribute("role", "listitem");
    article.dataset[inputs ? "neededPrintInput" : "neededItem"] = id;
    const line = node("div", "needed-row"),
      identity = node("div", "needed-identity"),
      body = node("div", "needed-detail");
    const contributor = cells[0].querySelector("details");
    if (contributor) body.append(contributor);
    identity.append(...cells[0].childNodes);
    if (item)
      identity.append(
        node(
          "small",
          "needed-rarity",
          "Rarity: " + guard.text(itemRarity(item)),
        ),
      );
    line.append(identity);
    for (const [index, label] of [
      [1, "Needed"],
      [2, inputs ? "Saved excess" : "Owned"],
      [inputs ? 3 : 4, "Missing"],
    ]) {
      const metric = node("div", "needed-metric");
      metric.append(
        node("small", "needed-metric-label", label),
        cellValue(cells[index]),
      );
      line.append(metric);
    }
    const detailId = root.id + "-details-" + encodeURIComponent(id);
    body.id = detailId;
    body.hidden = !expanded.has(detailId);
    const button = node(
      "button",
      "needed-details-button",
      "Calculation / printing",
    );
    button.type = "button";
    button.dataset.neededToggle = "";
    button.setAttribute("aria-controls", detailId);
    button.setAttribute("aria-expanded", String(!body.hidden));
    line.append(button);
    for (const index of inputs ? [] : [3, 5, 6]) {
      const calculation = node("div", "tracker-needed-calculation");
      calculation.append(
        node("strong", "", labels[index]),
        cellValue(cells[index]),
      );
      body.append(calculation);
    }
    const edit = node("a", "needed-edit-stock", "Edit global stock");
    edit.href =
      "/inventory/?pack=" +
      encodeURIComponent(pack.id) +
      "&item=" +
      encodeURIComponent(id);
    body.append(edit);
    article.append(line, body);
    types.get(type).push(article);
  }
  const fragment = document.createDocumentFragment();
  const makeGroup = (name, key) => {
    const group = node("details", "needed-group");
    group.dataset.neededGroupKey = key;
    group.open = !collapsed.has(key);
    group.append(node("summary", "", name));
    return group;
  };
  for (const [family, types] of [...groups].sort(([a], [b]) =>
    compareInventoryFamilies(a, b),
  )) {
    const count = [...types.values()].reduce(
        (sum, rows) => sum + rows.length,
        0,
      ),
      group = makeGroup(
        inventoryFamilyLabel(family) + " (" + count + ")",
        root.id + "|" + family,
      );
    group.dataset.neededCategory = family;
    for (const [type, rows] of [...types].sort(([a], [b]) =>
      compareInventorySections(a, b),
    )) {
      const subgroup = makeGroup(
        type + " (" + rows.length + ")",
        root.id + "|" + family + "|" + type,
      );
      subgroup.classList.add("needed-subgroup");
      subgroup.dataset.neededType = type;
      const list = node("div", "needed-rows");
      list.setAttribute("role", "list");
      list.setAttribute(
        "aria-label",
        inventoryFamilyLabel(family) + " / " + type,
      );
      rows.sort((a, b) => {
        const aId = a.dataset.neededItem || a.dataset.neededPrintInput,
          bId = b.dataset.neededItem || b.dataset.neededPrintInput;
        return compareItems(
          items.get(aId) || { id: aId, name: a.textContent },
          items.get(bId) || { id: bId, name: b.textContent },
        );
      });
      list.append(...rows);
      subgroup.append(list);
      group.append(subgroup);
    }
    fragment.append(group);
  }
  root.replaceChildren(fragment);
  root.removeAttribute("tabindex");
  root.classList.add("needed-grouped-list");
}
