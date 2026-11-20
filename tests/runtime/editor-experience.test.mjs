import test from "node:test";
import assert from "node:assert/strict";
import {
  editorChanges,
  workspacePreferences,
  templateSection,
  sectionTemplates,
  freshSection,
  validatePattern,
  instantiatePattern,
  parsePatterns,
  pageIssues,
} from "../../src/domain/editor-experience.mjs";
import {
  createPageDocument,
  validatePageDocument,
} from "../../src/domain/page-document.mjs";
const target = {
  adapter: "catalog",
  scope: { packKey: "test", packId: "test:catalog" },
  recordId: "test:record",
};
test("094 readable review distinguishes missing, unknown and factual changes and bounds output", () => {
  const result = editorChanges(
    { quantity: null, name: "Old" },
    { quantity: 2, name: "New", notes: null },
    2,
  );
  assert.equal(result.changes.length, 2);
  assert.equal(result.omitted, 1);
  assert.equal(result.changes[0].label, "Quantity");
  assert.equal(editorChanges({ value: null }, {}).changes.length, 1);
  assert.deepEqual(editorChanges({ a: 1 }, { a: 1 }), {
    changes: [],
    omitted: 0,
  });
});
test("094 workspace preferences reject future/corrupt/out-of-range data without touching content", () => {
  const fallback = workspacePreferences(null);
  assert.equal(fallback.mode, "content");
  assert.deepEqual(workspacePreferences({ version: 999 }), fallback);
  assert.deepEqual(
    workspacePreferences({ ...fallback, outlineWidth: 900 }),
    fallback,
  );
  assert.equal(
    workspacePreferences({ ...fallback, outlineWidth: 420 }).outlineWidth,
    420,
  );
});
test("094 templates/patterns allocate fresh nested IDs and cannot reuse canonical projections or missing pictures", () => {
  for (const [type] of sectionTemplates) {
    const doc = createPageDocument(target, "0".repeat(64));
    doc.sections = [templateSection(type)];
    validatePageDocument(doc);
  }
  const section = templateSection("walkthrough"),
    copy = freshSection(section);
  assert.notEqual(copy.id, section.id);
  assert.notEqual(
    copy.blocks[0].entries[0].id,
    section.blocks[0].entries[0].id,
  );
  const pattern = {
    version: 1,
    name: "Synthetic reusable layout",
    sections: [section],
  };
  validatePattern(pattern, target);
  assert.notEqual(instantiatePattern(pattern, target, [])[0].id, section.id);
  assert.throws(
    () =>
      validatePattern(
        {
          ...pattern,
          sections: createPageDocument(target, "0".repeat(64)).sections,
        },
        target,
      ),
    /custom/,
  );
  assert.throws(() => parsePatterns('{"version":99,"patterns":[]}', target));
  const image = {
    ...section,
    blocks: [
      {
        id: copy.blocks[0].id,
        type: "image",
        assetId: "test:missing",
        alt: "Synthetic",
        decorative: false,
        caption: "",
        fit: "contain",
        focalX: 0.5,
        focalY: 0.5,
      },
    ],
  };
  assert.throws(
    () => instantiatePattern({ ...pattern, sections: [image] }, target, []),
    /library pictures/,
  );
});
test("094 validation issues identify a section/block and preserve unknown requirement quantities", () => {
  const doc = createPageDocument(target, "0".repeat(64));
  doc.sections = [templateSection("tips")];
  doc.sections[0].title = "";
  const issues = pageIssues(doc, {
    requirements: [{ quantity: 0 }, { quantity: null }],
  });
  assert.equal(issues.length, 2);
  assert.equal(issues[0].sectionId, doc.sections[0].id);
});
