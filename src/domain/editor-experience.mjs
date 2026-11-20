import { assert, parseBounded } from "../content/limits.mjs";
import {
  createPageDocument,
  newPageId,
  validatePageDocument,
  pageAssets,
  stableJSON,
} from "./page-document.mjs";

export const fieldLabels = Object.freeze({
  name: "Name",
  title: "Title",
  description: "Description",
  body: "Guide text",
  category: "Category",
  rarity: "Rarity",
  grid: "Map grid",
  requirementsKnown: "Requirements complete",
  ingredientsKnown: "Ingredients complete",
  quantity: "Quantity",
  itemId: "Item",
  status: "Evidence status",
  sourceIds: "Sources",
  reviewedAt: "Reviewed date",
  prerequisites: "Prerequisites",
  rewards: "Page rewards",
  notes: "Notes",
  orderPage: "Orders page",
  orderSet: "Orders map",
  track: "Progression type",
  unit: "Unit",
  steps: "Mission tasks",
});
export const friendlyLabel = (key) =>
  fieldLabels[key] ||
  String(key)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/^./, (s) => s.toUpperCase());

export function editorChanges(before, after, limit = 100) {
  assert(
    Number.isInteger(limit) && limit >= 1 && limit <= 200,
    "Invalid review limit",
  );
  const changes = [];
  let omitted = 0,
    visited = 0;
  const walk = (a, b, path) => {
    assert(
      ++visited <= 30000,
      "Review is too large; export and compare the draft",
    );
    if (stableJSON(a) === stableJSON(b)) return;
    const aObject = a !== null && typeof a === "object",
      bObject = b !== null && typeof b === "object";
    if (
      (aObject && bObject && Array.isArray(a) === Array.isArray(b)) ||
      (aObject && b === undefined) ||
      (bObject && a === undefined)
    ) {
      const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
      for (const k of keys) {
        if (
          ["id", "baseFingerprint", "sourceEdits", "deletedAnchors"].includes(k)
        )
          continue;
        walk(a?.[k], b?.[k], [...path, k]);
      }
    } else {
      const entry = {
        path: path.join("."),
        label: path
          .map((k) => (/^\d+$/.test(k) ? Number(k) + 1 : friendlyLabel(k)))
          .join(" › "),
        before: a === undefined ? null : a,
        after: b === undefined ? null : b,
        beforePresent: a !== undefined,
        afterPresent: b !== undefined,
      };
      if (changes.length < limit) changes.push(entry);
      else omitted++;
    }
  };
  walk(before, after, []);
  return { changes, omitted };
}

export function workspacePreferences(value) {
  const fallback = {
    version: 1,
    outlineWidth: 230,
    inspectorWidth: 340,
    outlineCollapsed: false,
    inspectorCollapsed: false,
    mode: "content",
  };
  if (!value || value.version !== 1) return fallback;
  for (const key of ["outlineWidth", "inspectorWidth"])
    if (!Number.isFinite(value[key]) || value[key] < 180 || value[key] > 520)
      return fallback;
  if (
    !["content", "layout", "photos"].includes(value.mode) ||
    ["outlineCollapsed", "inspectorCollapsed"].some(
      (k) => typeof value[k] !== "boolean",
    )
  )
    return fallback;
  return Object.fromEntries(Object.keys(fallback).map((k) => [k, value[k]]));
}

export function freshSection(source) {
  const section = structuredClone(source);
  section.id = newPageId("s");
  const walk = (b) => {
    b.id = newPageId("b");
    if (b.type === "steps") b.entries.forEach((t) => (t.id = newPageId("t")));
    if (b.type === "group") b.children.forEach(walk);
  };
  section.blocks.forEach(walk);
  return section;
}
export const sectionTemplates = Object.freeze([
  ["tips", "Tips & warnings"],
  ["walkthrough", "Step-by-step walkthrough"],
  ["location", "Location & screenshot"],
  ["requirements", "Requirements notes"],
  ["two-column", "Text beside picture"],
]);
export function templateSection(type) {
  assert(
    sectionTemplates.some(([id]) => id === type),
    "Unknown section template",
  );
  const paragraph = () => ({ id: newPageId("b"), type: "paragraph", text: "" }),
    section = {
      id: newPageId("s"),
      title: sectionTemplates.find(([id]) => id === type)[1],
      kind: "custom",
      slot: null,
      layout: "stacked",
      collapsed: false,
      blocks: [],
    };
  if (type === "tips")
    section.blocks = [
      { id: newPageId("b"), type: "callout", tone: "tip", text: "" },
    ];
  if (type === "walkthrough")
    section.blocks = [
      {
        id: newPageId("b"),
        type: "steps",
        entries: [{ id: newPageId("t"), text: "Add walkthrough instructions" }],
      },
    ];
  if (type === "location")
    section.blocks = [
      paragraph(),
      {
        id: newPageId("b"),
        type: "callout",
        tone: "info",
        text: "Add a location reference and your screenshot. Confirm placement against the current map.",
      },
    ];
  if (type === "requirements")
    section.blocks = [
      {
        id: newPageId("b"),
        type: "table",
        columns: ["Item", "Amount", "Notes"],
        rows: [["", "", ""]],
      },
      {
        id: newPageId("b"),
        type: "callout",
        tone: "info",
        text: "Presentation notes only. Edit tracked requirements under Content.",
      },
    ];
  if (type === "two-column") {
    section.layout = "two-column";
    section.blocks = [paragraph(), paragraph()];
  }
  return section;
}
export function validatePattern(value, target) {
  assert(
    value &&
      Object.keys(value).sort().join() === "name,sections,version" &&
      value.version === 1,
    "Unsupported reusable layout",
  );
  assert(
    typeof value.name === "string" &&
      value.name.trim() &&
      value.name.length <= 80,
    "Name the reusable layout (up to80 characters)",
  );
  assert(
    Array.isArray(value.sections) &&
      value.sections.length >= 1 &&
      value.sections.length <= 32,
    "Choose1–32 custom sections",
  );
  const walk = (b) => {
    assert(
      b.type !== "managed",
      "Reusable layouts cannot copy canonical projections",
    );
    if (b.type === "group") b.children.forEach(walk);
  };
  for (const s of value.sections) {
    assert(s.kind === "custom" && s.slot === null, "Save custom sections only");
    s.blocks.forEach(walk);
  }
  const doc = createPageDocument(target, "0".repeat(64));
  doc.sections = value.sections;
  validatePageDocument(doc, { target });
  assert(
    new TextEncoder().encode(JSON.stringify(value)).length <= 262144,
    "Reusable layout exceeds256KiB",
  );
  return value;
}
export function instantiatePattern(value, target, assets) {
  validatePattern(value, target);
  const doc = createPageDocument(target, "0".repeat(64));
  doc.sections = value.sections;
  const missing = pageAssets(doc).filter((id) => !assets.includes(id));
  assert(
    !missing.length,
    "Reusable layout needs library pictures: " + missing.join(", "),
  );
  return value.sections.map(freshSection);
}
export function parsePatterns(text, target) {
  const value = parseBounded(text, 524288, {
    depth: 14,
    nodes: 20000,
    string: 2000,
  });
  assert(
    value &&
      Object.keys(value).sort().join() === "patterns,version" &&
      value.version === 1 &&
      Array.isArray(value.patterns) &&
      value.patterns.length <= 12,
    "Unsupported pattern library (maximum12 layouts)",
  );
  value.patterns.forEach((p) => validatePattern(p, target));
  return value;
}

export function pageIssues(document, record) {
  const issues = [];
  for (const section of document.sections) {
    if (!section.title.trim())
      issues.push({
        sectionId: section.id,
        blockId: null,
        field: "Section title",
        message: "Give this section a title.",
      });
    const walk = (b) => {
      if (b.type === "heading" && !b.text.trim())
        issues.push({
          sectionId: section.id,
          blockId: b.id,
          field: "Text",
          message: "Enter heading text.",
        });
      if (b.type === "image" && !b.decorative && !b.alt.trim())
        issues.push({
          sectionId: section.id,
          blockId: b.id,
          field: "Image description",
          message: "Describe this picture, or mark it decorative.",
        });
      if (b.type === "steps" && b.entries.some((t) => !t.text.trim()))
        issues.push({
          sectionId: section.id,
          blockId: b.id,
          field: "One entry per line",
          message: "Complete each walkthrough step.",
        });
      if (b.type === "group") b.children.forEach(walk);
    };
    section.blocks.forEach(walk);
  }
  for (const r of record.requirements || record.inputs || [])
    if (
      r.quantity !== null &&
      (!Number.isSafeInteger(r.quantity) || r.quantity < 1)
    )
      issues.push({
        sectionId: null,
        blockId: null,
        field: "Quantity",
        message: "Use a positive whole quantity, or leave it unknown.",
      });
  return issues;
}
