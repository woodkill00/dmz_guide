import { LIMITS, assert } from "../content/limits.mjs";
import { GROUPS, defaultFieldValue } from "../content/portable.mjs";

// This view owns no storage or persistence. Hosts own drafts, locks and previews.
export function createGuidedEditor({
  schema,
  getDraft,
  mutateDraft,
  onRender = () => {},
  searchPlaceholder = "Search this private pack",
  root = document,
  isIdentityReadOnly = () => false,
}) {
  const $ = (selector) => root.querySelector(selector);
  const node = (tag, text) => {
    const n = document.createElement(tag);
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const arrayPages = new Map();
  const label = (k) =>
    k.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (s) => s.toUpperCase());
  const help = {
    id: "Stable namespaced ID, such as my-pack:wire. References use this exact ID.",
    contentVersion:
      "Change this whenever facts change. Existing profiles must explicitly rebind; historical references are retained.",
    scope:
      "Optional fact-specific game, mode and build. Omit to inherit the pack scope.",
    status:
      "Unknown is not verified. Fictional training records must stay fictional. Evidence is required for factual verification.",
    sourceIds:
      "IDs of sources already listed in Sources and evidence. Numeric stats need their own source.",
    sourceId: "Source ID supporting this particular claim.",
    consumed:
      "Checked: quantity is spent. Unchecked: retained tool or possession requirement, not consumed.",
    prerequisites:
      "Objective IDs that gate this recipe or objective. Unknown gates are not automatically unlocked.",
    ingredientsKnown:
      "Unchecked means the complete ingredient list is unknown, not free.",
    requirementsKnown:
      "Unchecked means requirements are incomplete or unknown.",
    unit: "Use count for items/weapons, resource-unit for resources, dmz-cash for currency. Statistic units must match the selected metric.",
    value:
      "Use null for an unknown statistic; never invent zero. Choose the type explicitly for claims/effects.",
    context:
      "State measurement conditions, attachments, range, target and method. Do not compare unlike measurements.",
    spoiler:
      "Mark story-sensitive material. Reader spoiler preferences control disclosure.",
    extent:
      "Canonical [minimum x, minimum y, maximum x, maximum y]. Null means an unknown map extent.",
    coordinates:
      "Null means location geometry is unknown. Numeric coordinates must fit the map extent and floor.",
    spawnKind: "Possible or event spawns are not guaranteed.",
    assetId:
      "ID of attached picture metadata. Picture bundles require actual bytes, not only a URL.",
    redistributionAllowed:
      "Must be true only with actual redistribution permission. This field does not prove ownership.",
    body: "Plain text only. HTML and Markdown are displayed inertly, never executed.",
    reviewedAt:
      "Date this evidence was reviewed; do not confuse with capture date.",
    sourceUrl: "Recorded attribution only, never fetched automatically.",
  };
  function resolve(s) {
    while (s.$ref)
      s = s.$ref
        .slice(2)
        .split("/")
        .reduce((o, k) => o[k], schema);
    return s;
  }
  function defaultValue(s, key = "") {
    return defaultFieldValue(
      schema,
      s,
      { fictional: getDraft()?.game?.id === "fictional-training" },
      key,
    );
  }
  function setAt(path, value) {
    mutateDraft((draft) => {
      let target = draft;
      for (const key of path.slice(0, -1)) target = target[key];
      if (value === undefined) delete target[path.at(-1)];
      else target[path.at(-1)] = value;
    });
  }
  function getAt(path) {
    return path.reduce((value, key) => value?.[key], getDraft());
  }
  const entryNames = {
    items: "Item or weapon",
    recipes: "Recipe",
    objectives: "Objective",
    sources: "Source",
    guides: "Guide",
    maps: "Map",
    locations: "Location",
    claims: "Claim",
    assets: "Picture",
    stats: "Statistic",
    inputs: "Ingredient",
    requirements: "Requirement",
    prerequisites: "Prerequisite",
    sourceIds: "Source",
    itemIds: "Item",
    relatedIds: "Related record",
    aliases: "Alias",
    effects: "Effect",
    floors: "Floor",
    extent: "Extent coordinate",
  };
  function fieldTitle(path, value) {
    const key = path.at(-1);
    if (typeof key !== "number") return label(String(key));
    const group = path.at(-2),
      name =
        value && typeof value === "object"
          ? value.name || value.title || value.label || value.id
          : "";
    return `${entryNames[group] || "Entry"} ${key + 1}${name ? " · " + name : ""}`;
  }
  function referenceGroup(path) {
    const key = typeof path.at(-1) === "number" ? path.at(-2) : path.at(-1);
    return {
      itemId: "items",
      itemIds: "items",
      sourceId: "sources",
      sourceIds: "sources",
      prerequisites: "objectives",
      mapId: "maps",
      assetId: "assets",
      assetIds: "assets",
      entityId: "all",
      relatedIds: "all",
    }[key];
  }
  function referencePicker(path, title, input) {
    const draft = getDraft();
    const group = referenceGroup(path);
    if (!group) return null;
    const container = node("div"),
      searchLabel = node("label", `Find ${title.toLowerCase()} by name or ID `),
      search = node("input"),
      pickLabel = node("label", `Choose existing ${title.toLowerCase()} `),
      picker = node("select"),
      summary = node("small");
    search.type = "search";
    search.autocomplete = "off";
    search.placeholder = searchPlaceholder;
    search.dataset.refSearch = path.join(".");
    picker.dataset.refPicker = path.join(".");
    searchLabel.append(search);
    pickLabel.append(picker);
    container.append(searchLabel, pickLabel, summary);
    const records = (
      group === "all" ? GROUPS.flatMap((k) => draft[k]) : draft[group]
    ).filter((r) => r.id);
    function populate() {
      const query = search.value.trim().toLowerCase(),
        matches = records.filter((r) =>
          `${r.name || r.title || r.label || ""} ${r.id}`
            .toLowerCase()
            .includes(query),
        ),
        visible = matches.slice(0, 50);
      picker.replaceChildren();
      const placeholder = node(
        "option",
        matches.length ? "Select a matching record…" : "No matching records",
      );
      placeholder.value = "";
      picker.append(placeholder);
      for (const record of visible) {
        const option = node(
          "option",
          `${record.name || record.title || record.label || record.id} · ${record.id}`,
        );
        option.value = record.id;
        picker.append(option);
      }
      picker.value = visible.some((r) => r.id === input.value)
        ? input.value
        : "";
      summary.textContent = `${matches.length} matching ${group === "all" ? "records" : group}; showing ${visible.length}. Search more specifically if needed. Exact IDs remain editable below.`;
    }
    search.addEventListener("input", populate);
    search.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        picker.focus();
      }
    });
    picker.addEventListener("change", () => {
      if (!picker.value) return;
      setAt(path, picker.value);
      input.value = picker.value;
    });
    input.addEventListener("input", populate);
    populate();
    return container;
  }
  function control(s, path, required = true) {
    s = resolve(s);
    const key = path.at(-1),
      value = getAt(path),
      box = node("div");
    box.className = "field";
    const title = fieldTitle(path, value);
    if (!required) {
      const l = node("label"),
        check = node("input");
      check.type = "checkbox";
      check.checked = value !== undefined;
      check.dataset.path = path.join(".") + ".included";
      l.append(check, document.createTextNode(` Include ${title} (optional)`));
      box.append(l);
      check.addEventListener("change", () => {
        setAt(path, check.checked ? defaultValue(s, key) : undefined);
        renderFields();
      });
      if (value === undefined) return box;
    }
    if (s.anyOf || Array.isArray(s.type)) {
      const variants = s.anyOf || s.type.map((type) => ({ ...s, type })),
        type =
          value === null
            ? "null"
            : Array.isArray(value)
              ? "array"
              : typeof value;
      let idx = variants.findIndex(
        (v) =>
          resolve(v).type === type ||
          (type === "number" && resolve(v).type === "integer"),
      );
      if (idx < 0) idx = 0;
      const l = node("label", `${title} type `),
        select = node("select");
      select.dataset.path = path.join(".") + ".type";
      variants.forEach((v, i) => {
        const option = node(
          "option",
          resolve(v).type === "null"
            ? "Unknown / null"
            : label(resolve(v).type),
        );
        option.value = String(i);
        select.append(option);
      });
      select.value = String(idx);
      l.append(select);
      box.append(l);
      select.addEventListener("change", () => {
        setAt(path, defaultValue(variants[Number(select.value)], key));
        renderFields();
      });
      if (resolve(variants[idx]).type === "null") return box;
      box.append(control(variants[idx], path, true));
      return box;
    }
    if (s.type === "object") {
      const fieldset = node("fieldset"),
        legend = node("legend", title);
      fieldset.append(legend);
      if (help[key]) fieldset.append(node("p", help[key]));
      for (const [k, v] of Object.entries(s.properties || {}))
        fieldset.append(
          control(v, [...path, k], (s.required || []).includes(k)),
        );
      box.append(fieldset);
      return box;
    }
    if (s.type === "array") {
      const fieldset = node("fieldset");
      fieldset.append(node("legend", title));
      if (help[key]) fieldset.append(node("p", help[key]));
      const pageKey = path.join("."),
        pageSize = 20,
        start = Math.min(
          arrayPages.get(pageKey) || 0,
          Math.max(
            0,
            Math.floor(((value?.length || 1) - 1) / pageSize) * pageSize,
          ),
        );
      fieldset.append(
        node(
          "p",
          `${value?.length || 0} entries · showing ${value?.length ? start + 1 : 0}–${Math.min(start + pageSize, value?.length || 0)}`,
        ),
      );
      if (start > 0) {
        const previous = node("button", `Previous ${title} entries`);
        previous.type = "button";
        previous.onclick = () => {
          arrayPages.set(pageKey, Math.max(0, start - pageSize));
          renderFields();
        };
        fieldset.append(previous);
      }
      if (start + pageSize < (value?.length || 0)) {
        const next = node("button", `Next ${title} entries`);
        next.type = "button";
        next.onclick = () => {
          arrayPages.set(pageKey, start + pageSize);
          renderFields();
        };
        fieldset.append(next);
      }
      (value || []).slice(start, start + pageSize).forEach((_, offset) => {
        const i = start + offset,
          row = node("div");
        row.append(control(s.items, [...path, i], true));
        const remove = node("button", `Remove ${title} entry ${i + 1}`);
        remove.type = "button";
        remove.onclick = () => {
          mutateDraft(() => getAt(path).splice(i, 1));
          renderFields();
        };
        row.append(remove);
        fieldset.append(row);
      });
      const add = node("button", `Add ${title} entry`);
      add.type = "button";
      add.onclick = () => {
        mutateDraft(() => {
          assert(
            (getAt(path) || []).length < (s.maxItems || LIMITS.records),
            "Entry limit reached",
          );
          getAt(path).push(defaultValue(s.items, key));
          arrayPages.set(
            pageKey,
            Math.floor((getAt(path).length - 1) / pageSize) * pageSize,
          );
        });
        renderFields();
      };
      fieldset.append(add);
      box.append(fieldset);
      return box;
    }
    const l = node("label", title + " ");
    let input;
    if (s.enum || "const" in s) {
      input = node("select");
      for (const choice of s.enum || [s.const]) {
        const opt = node("option", String(choice));
        opt.value = String(choice);
        input.append(opt);
      }
      input.value = String(value);
      input.disabled = "const" in s;
    } else if (s.type === "boolean") {
      input = node("input");
      input.type = "checkbox";
      input.checked = !!value;
    } else {
      input = node(s.maxLength > 1000 ? "textarea" : "input");
      if (input.tagName === "INPUT")
        input.type = ["integer", "number"].includes(s.type) ? "number" : "text";
      if (["number", "integer"].includes(s.type)) {
        input.step = s.type === "integer" ? "1" : "any";
        if (s.minimum !== undefined) input.min = s.minimum;
        if (s.maximum !== undefined) input.max = s.maximum;
      }
      if (s.maxLength) input.maxLength = s.maxLength;
      input.value = value ?? "";
    }
    input.dataset.path = path.join(".");
    if ((path.length === 1 && key === "id") || isIdentityReadOnly(path, value))
      input.disabled = true;
    input.addEventListener("input", () => {
      setAt(
        path,
        s.type === "boolean"
          ? input.checked
          : ["number", "integer"].includes(s.type)
            ? input.value === ""
              ? NaN
              : Number(input.value)
            : input.value,
      );
    });
    l.append(input);
    const picker = referencePicker(path, title, input);
    if (picker) {
      box.append(picker);
      l.firstChild.textContent = `Exact ${title.toLowerCase()} ID (advanced) `;
    }
    box.append(l);
    if (help[key]) box.append(node("small", help[key]));
    return box;
  }
  function renderFields() {
    const draft = getDraft();
    const root = $("#editor-fields");
    root.replaceChildren();
    if (!draft) return;
    const group = $("#editor-section").value;
    $("#record-picker-label").hidden = group === "metadata";
    $("#add-record").hidden = group === "metadata";
    $("#remove-record").hidden = group === "metadata";
    if (group === "metadata") {
      for (const [k, s] of Object.entries(schema.properties))
        if (!GROUPS.includes(k)) root.append(control(s, [k]));
    } else {
      const index = Number($("#editor-record").value || 0);
      if (draft[group][index])
        root.append(control(schema.properties[group].items, [group, index]));
      else root.append(node("p", "No records yet. Add one to start."));
    }
    onRender();
  }
  function renderRecords() {
    const draft = getDraft();
    const group = $("#editor-section").value,
      select = $("#editor-record"),
      old = select.value;
    select.replaceChildren();
    if (group !== "metadata")
      draft[group].forEach((r, i) => {
        const option = node(
          "option",
          `${r.name || r.title || r.id || "New record"}`,
        );
        option.value = String(i);
        select.append(option);
      });
    if ([...select.options].some((o) => o.value === old)) select.value = old;
    renderFields();
  }

  return {
    renderFields,
    renderRecords,
    resetPagination: () => arrayPages.clear(),
    defaultValue,
  };
}
