import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { serializeCatalog } from "../../scripts/catalog.mjs";
import { createAuthorServer } from "../../scripts/author.mjs";
export async function showEditorContent(page, { advanced = false } = {}) {
  const mobile = page.locator('[data-pe-tab="fields"]');
  if (await mobile.isVisible()) await mobile.click();
  await page.locator('[data-pe-mode="content"]').click();
  if (!(await page.locator("#pe-data").evaluate((n) => n.open)))
    await page.locator("#pe-data > summary").click();
  if (advanced && !(await page.locator("#pe-advanced").evaluate((n) => n.open)))
    await page.locator("#pe-advanced > summary").click();
}
export async function pageEditorFixture({ editorToolsOptions = {} } = {}) {
  const root = await mkdtemp(join(tmpdir(), "dmz-page-editor-")),
    schema = JSON.parse(
      await readFile(
        new URL("../../schemas/pack.schema.json", import.meta.url),
        "utf8",
      ),
    );
  const item = {
    id: "test:material",
    name: "Synthetic material",
    sourceIds: [],
    status: "fictional",
    kind: "item",
    category: "ingredient",
    unit: "count",
    description: "Fictional software fixture, not game data",
    aliases: [],
    stats: [],
  };
  const order = {
    id: "test:order",
    name: "Synthetic Order",
    sourceIds: [],
    status: "fictional",
    track: "dmz-order",
    description: "Fictional task",
    steps: ["Synthetic first step", "Synthetic second step"],
    requirements: [
      {
        itemId: item.id,
        quantity: 2,
        consumption: "consumed",
        status: "fictional",
        sourceIds: [],
      },
    ],
    prerequisites: [],
    requirementsKnown: true,
    oneTime: true,
    effects: [],
    spoiler: false,
  };
  const pack = {
    schemaVersion: 2,
    id: "test:catalog",
    contentVersion: "1",
    game: { id: "fictional-training", mode: "test", build: "test" },
    title: "Fictional editor tests",
    description: "Original software fixtures",
    coverage: { expectedTotal: null, note: "Fictional" },
    sources: [],
    items: [item, { ...item, id: "test:product", name: "Synthetic product" }],
    recipes: [
      {
        id: "test:recipe",
        name: "Synthetic recipe",
        status: "fictional",
        sourceIds: [],
        station: "Synthetic bench",
        eligibility: "stash",
        ingredientsKnown: true,
        output: { itemId: "test:product", quantity: 1 },
        inputs: structuredClone(order.requirements),
        prerequisites: [],
      },
    ],
    objectives: [
      order,
      {
        ...order,
        id: "test:x01-order",
        name: "Synthetic X01 Order",
        orderSet: "x01",
        orderPage: 1,
      },
      {
        ...order,
        id: "test:upgrade",
        name: "Synthetic upgrade",
        track: "dmz-upgrade",
        steps: [],
        upgrade: {
          tierLabel: null,
          prerequisiteStatus: "known",
          observationKeys: ["synthetic-upgrade"],
        },
      },
    ],
    guides: [
      {
        id: "test:guide",
        title: "Synthetic guide",
        body: "Fictional guide content",
        category: "crafting",
        sourceIds: [],
        status: "fictional",
        spoiler: false,
        relatedIds: [],
      },
    ],
    maps: [
      {
        id: "test:map",
        name: "Synthetic map",
        axis: "x-right-y-down",
        coordinateSpace: "synthetic-square",
        coordinateVersion: "1",
        extent: [0, 0, 100, 100],
        floors: ["ground"],
        origin: "top-left",
        sourceIds: [],
        status: "fictional",
      },
    ],
    locations: [
      {
        id: "test:location",
        name: "Synthetic location",
        category: "supply",
        description: "Fictional location",
        coordinates: { floor: "ground", x: 20, y: 30 },
        grid: null,
        itemIds: [item.id],
        mapId: "test:map",
        spawnKind: "possible",
        sourceIds: [],
        status: "fictional",
      },
    ],
    claims: [],
    assets: [],
  };
  const files = serializeCatalog({
    entries: [{ key: "test", pack, assetSources: {} }],
    schema,
  });
  files.set("schemas/pack.schema.json", Buffer.from(JSON.stringify(schema)));
  for (const [path, bytes] of files) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), bytes);
  }
  const app = await createAuthorServer({ root, port: 0, editorToolsOptions }),
    session = await (await fetch(app.url + "/api/session")).json();
  const headers = {
    Origin: app.url,
    "x-author-token": session.token,
    "Content-Type": "application/json",
  };
  const target = (id) => ({
    adapter: "catalog",
    scope: { packKey: "test", packId: pack.id },
    recordId: id,
  });
  const url = (id) =>
    app.url +
    "/?" +
    new URLSearchParams({
      packKey: "test",
      packId: pack.id,
      id,
      intent: "compose",
    });
  const get = async (id) => {
    const r = await fetch(
      app.url +
        "/api/page-edits/record?" +
        new URLSearchParams({
          packKey: "test",
          packId: pack.id,
          id,
          intent: "compose",
        }),
      { headers },
    );
    if (!r.ok) throw Error(await r.text());
    return r.json();
  };
  const post = async (path, body) => {
    const r = await fetch(app.url + path, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const value = await r.json();
    if (!r.ok) throw Error(JSON.stringify(value));
    return value;
  };
  return {
    root,
    app,
    pack,
    headers,
    target,
    url,
    get,
    post,
    async close() {
      await app.close();
      await rm(root, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      });
    },
  };
}
