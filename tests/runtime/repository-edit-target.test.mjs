import test from "node:test";
import assert from "node:assert/strict";
import { repositoryEditTarget } from "../../src/domain/repository-edit-target.mjs";
const catalogs = [
  { id: "test:catalog", path: "/assets/content/packs/exact-key.json" },
];
const groups = {
  item: "items",
  recipe: "recipes",
  objective: "objectives",
  guide: "guides",
  map: "maps",
  location: "locations",
};
for (const [recordType, group] of Object.entries(groups))
  test(`093 T025 ${recordType} repository target uses exact published membership`, () => {
    const published = {
        id: "test:catalog",
        [group]: [{ id: "test:record", name: "Original" }],
      },
      record = {
        id: "test:record",
        name: "Private renamed copy",
        recordType,
        pack: { id: published.id },
      };
    assert.deepEqual(repositoryEditTarget(catalogs, published, record), {
      packKey: "exact-key",
      packId: published.id,
      id: record.id,
      intent: "compose",
    });
    assert.equal(
      repositoryEditTarget(catalogs, published, {
        ...record,
        id: "test:private-only",
      }),
      null,
    );
    assert.equal(
      repositoryEditTarget(catalogs, published, {
        ...record,
        pack: { id: "test:other" },
      }),
      null,
    );
    assert.equal(repositoryEditTarget([], published, record), null);
    assert.equal(
      repositoryEditTarget([...catalogs, ...catalogs], published, record),
      null,
    );
    assert.equal(
      repositoryEditTarget(
        [{ ...catalogs[0], path: "https://example.com/guessed.json" }],
        published,
        record,
      ),
      null,
    );
    assert.equal(repositoryEditTarget(catalogs, null, record), null);
    assert.equal(
      repositoryEditTarget(catalogs, published, {
        ...record,
        recordType: recordType === "recipe" ? "item" : "recipe",
      }),
      null,
    );
  });
test("093 T025 protected public identity cannot be exposed through an unprotected private copy", () => {
  const source = { id: "test:record", spoiler: true },
    published = { id: "test:catalog", items: [source] },
    record = { id: source.id, recordType: "item", pack: { id: published.id } };
  assert.equal(repositoryEditTarget(catalogs, published, record), null);
  assert.equal(
    repositoryEditTarget(
      catalogs,
      { ...published, items: [{ ...source, spoiler: false }] },
      { ...record, spoiler: true },
    ),
    null,
  );
  assert(repositoryEditTarget(catalogs, published, record, { reveal: true }));
  assert.equal(
    repositoryEditTarget(
      catalogs,
      { ...published, items: [source, source] },
      record,
      { reveal: true },
    ),
    null,
  );
  assert.equal(
    repositoryEditTarget(
      catalogs,
      published,
      { ...record, recordType: "source" },
      { reveal: true },
    ),
    null,
  );
});
