import { mergeSourceEdits } from "../src/domain/page-source-edits.mjs";
import {
  captureEditorRevision,
  prepareRevisionPlan,
  editorStateQuota,
} from "./page-editor-tools.mjs";
import {
  registerSpecialTarget,
  sourceRecord,
  specialProjections,
  validateJoinedSources,
} from "./page-adapters.mjs";
import { renderDetail, allRecords } from "../src/ui/render.mjs";
import { randomBytes } from "node:crypto";
import { readCatalog, catalogJSON, catalogRevision } from "./catalog.mjs";
import {
  applyFilePlan,
  withRepositorySnapshot,
  inspectRecovery,
  AuthorError,
  validateAuthorPNG,
} from "./author-store.mjs";
import {
  readPageDocuments,
  pageEditorRecord,
  resolvePageTarget,
  optionalBytes,
  digest,
  PAGE_MANIFEST,
} from "./page-documents.mjs";
import { validatePack } from "../src/content/validate.mjs";
import { bytesFromBase64 } from "../src/content/portable.mjs";
import { assert, parseBounded } from "../src/content/limits.mjs";
import {
  exact,
  validatePageTarget,
  validatePageDocument,
  pageKey,
  pagePath,
  semanticFingerprint,
  stableJSON,
} from "../src/domain/page-document.mjs";
function validateReceipt(r, id) {
  assert(
    r &&
      r.version === 1 &&
      r.operationId === id &&
      ["unresolved", "committed", "not-committed"].includes(r.state),
    "Invalid page operation receipt",
  );
  if (r.state === "not-committed") {
    assert(r.cancelled === true, "Invalid terminal cancellation");
    const keys = Object.keys(r);
    assert(
      keys.every((k) =>
        [
          "version",
          "state",
          "operationId",
          "cancelled",
          "target",
          "previewDigest",
          "expectedRevision",
          "expectedDocumentRevision",
        ].includes(k),
      ),
      "Unexpected cancellation fields",
    );
    return r;
  }
  const fields =
    "version state operationId target previewDigest expectedRevision expectedDocumentRevision";
  exact(
    r,
    r.state === "committed"
      ? fields +
          " transactionId documentRevision documentHash canonicalFingerprint repositoryRevision assetHashes"
      : fields,
  );
  validatePageTarget(r.target);
  assert(
    [r.previewDigest, r.expectedRevision].every((v) =>
      /^[a-f0-9]{64}$/.test(v),
    ) &&
      Number.isSafeInteger(r.expectedDocumentRevision) &&
      r.expectedDocumentRevision >= 0,
    "Invalid operation base",
  );
  if (r.state === "committed") {
    assert(
      /^[a-f0-9]{32}$/.test(r.transactionId) &&
        [r.documentHash, r.canonicalFingerprint, r.repositoryRevision].every(
          (v) => /^[a-f0-9]{64}$/.test(v),
        ) &&
        Number.isSafeInteger(r.documentRevision) &&
        r.documentRevision > r.expectedDocumentRevision &&
        Array.isArray(r.assetHashes) &&
        r.assetHashes.length <= 1000,
      "Invalid committed receipt",
    );
    for (const a of r.assetHashes) {
      exact(a, "id sha256");
      assert(
        typeof a.id === "string" &&
          a.id.length <= 100 &&
          /^[a-f0-9]{64}$/.test(a.sha256),
        "Invalid receipt asset",
      );
    }
  }
  return r;
}
const factual = (record) => {
  const { assetId, assetIds, imageDescriptions, ...facts } = record;
  return stableJSON(facts);
};
const ACTIVE = ".author-state/page-operations/active.json";
const operationPath = (id) => {
  assert(/^[a-f0-9]{32}$/.test(id), "Invalid page operation");
  return `.author-state/page-operations/${id}.json`;
};
export function createPageEditorStore({ root, store }) {
  const candidates = new Map();
  let queue = Promise.resolve();
  const serial = (fn) => {
    const task = queue.catch(() => {}).then(fn);
    queue = task;
    return task;
  };
  const snapshot = (fn) =>
    withRepositorySnapshot({ root }, async () =>
      fn(await readCatalog({ root, schema: store.schema })),
    );
  const status = (id) => inspectStatus(id);
  async function inspectStatus(id, snapshotOwned = false) {
    const bytes = await optionalBytes(root, operationPath(id));
    const recovery = await inspectRecovery({ root });
    if (
      !bytes ||
      recovery.pending ||
      (!snapshotOwned && recovery.lock?.state === "live")
    )
      return {
        state: "unresolved",
        operationId: id,
        recoveryRequired: !!recovery.pending,
      };
    try {
      const receipt = validateReceipt(
        parseBounded(bytes.toString("utf8"), 1048576),
        id,
      );
      if (receipt.state === "committed") {
        const data = await optionalBytes(
          root,
          `.author-state/transactions/${receipt.transactionId}/outcome.json`,
          8388608,
        );
        assert(data, "Missing committed transaction outcome");
        const outcome = parseBounded(data.toString("utf8"), 8388608, {
          depth: 8,
          nodes: 300000,
          string: 2000,
        });
        assert(
          outcome.state === "committed" &&
            outcome.transactionId === receipt.transactionId &&
            outcome.paths.some(
              (p) =>
                p.path === operationPath(id) && p.afterHash === digest(bytes),
            ),
          "Committed receipt does not match transaction outcome",
        );
      }
      return receipt;
    } catch {
      return { state: "unresolved", operationId: id, receiptInvalid: true };
    }
  }
  async function read(target) {
    return snapshot(async (catalog) => {
      const record = await pageEditorRecord(root, catalog, target, {
        imageURL: (p, id) =>
          `/api/media?packKey=${encodeURIComponent(target.scope.packKey)}&assetId=${encodeURIComponent(id)}`,
      });
      delete record.pages;
      return {
        ...record,
        schema: store.schema,
        checkoutId: digest(Buffer.from(root)),
      };
    });
  }
  async function preview(input) {
    exact(
      input,
      "target record contentVersion document uploads repositoryRevision pageRevision",
    );
    return snapshot(async (catalog) => {
      if (input.target.adapter !== "catalog")
        await registerSpecialTarget(root, catalog, input.target);
      assert(
        input.repositoryRevision === catalog.revision,
        "Repository changed; reload and compare your draft",
      );
      const pages = await readPageDocuments(root, catalog, {
        checkBase: false,
      });
      assert(
        input.pageRevision === pages.revision,
        "Page layouts changed; reload and compare",
      );
      const resolved = resolvePageTarget(catalog.entries, input.target),
        key = await pageKey(input.target),
        previous = pages.documents.get(key)?.document;
      assert(
        input.record.id === resolved.record.id,
        "Record identity cannot change",
      );
      const pack = structuredClone(resolved.entry.pack);
      if (
        resolved.group !== "special" &&
        factual(input.record) !== factual(resolved.record) &&
        ["verified", "observed"].includes(input.record.status) &&
        input.record.status === resolved.record.status
      )
        input.record = { ...input.record, status: "unknown" };

      let sourceChange = null;
      if (resolved.group === "special") {
        const data = structuredClone(resolved.sourceData),
          row = sourceRecord(input.record);
        if (input.target.adapter === "weapon-acquisition") {
          const { blueprints, ...weapon } = row;
          assert(
            Array.isArray(blueprints) &&
              blueprints.every((b) => b.weapon === row.id),
            "Blueprint must remain associated with its selected weapon",
          );
          data.weapons[resolved.index] = weapon;
          data.blueprints = data.blueprints
            .filter((b) => b.weapon !== row.id)
            .concat(blueprints);
        } else data[resolved.collection][resolved.index] = row;
        resolved.validate(data);
        sourceChange = {
          path: resolved.sourcePath,
          before: resolved.sourceBytes,
          after:
            stableJSON(row) === stableJSON(resolved.record)
              ? resolved.sourceBytes
              : catalogJSON(data),
          record: row,
        };
      } else
        pack[resolved.group][
          pack[resolved.group].findIndex((r) => r.id === input.record.id)
        ] = structuredClone(input.record);
      pack.contentVersion = input.contentVersion;
      assert(
        Array.isArray(input.uploads) && input.uploads.length <= 9,
        "Page upload limit",
      );
      let bytes = 0;
      for (const upload of input.uploads) {
        exact(upload, "asset base64");
        const pixels = bytesFromBase64(upload.base64);
        bytes += pixels.length;
        assert(bytes <= 8388608, "Page uploads exceed8MiB");
        const checked = await validateAuthorPNG(pixels);
        for (const k of ["sha256", "width", "height", "bytes", "mime"])
          assert(checked[k] === upload.asset[k], "Uploaded picture mismatch");
        assert(
          !pack.assets.some((a) => a.id === upload.asset.id),
          "New picture ID already exists",
        );
        pack.assets.push(upload.asset);
      }
      validatePack(pack, store.schema, { profile: "published" });
      const changed = stableJSON(pack) !== stableJSON(resolved.entry.pack);
      assert(
        !changed || pack.contentVersion !== resolved.entry.pack.contentVersion,
        "Change the content version for canonical content or new picture metadata",
      );
      const record = sourceChange
          ? sourceChange.record
          : pack[resolved.group].find((r) => r.id === input.record.id),
        fingerprint = await semanticFingerprint(record);
      const document = structuredClone(input.document);
      document.sourceEdits = sourceChange
        ? mergeSourceEdits(previous?.sourceEdits || [], resolved.record, record)
        : previous?.sourceEdits || [];
      assert(
        document.baseFingerprint ===
          (await semanticFingerprint(resolved.record)),
        "Source changed since this draft started; compare current source and explicitly accept its baseline before reviewing",
      );
      assert(
        document.revision === (previous?.revision || 0),
        "Page document revision changed",
      );
      const oldSections = previous?.sections.map((s) => s.id) || [];
      const active = new Set(document.sections.map((s) => s.id));
      document.deletedAnchors = [
        ...new Set([
          ...(previous?.deletedAnchors || []),
          ...document.deletedAnchors,
          ...oldSections.filter((id) => !active.has(id)),
        ]),
      ].filter((id) => !active.has(id));
      document.baseFingerprint = fingerprint;
      validatePageDocument(document, {
        target: input.target,
        assetIds: sourceChange
          ? pack.assets.map((a) => a.id)
          : [record.assetId, ...(record.assetIds || [])].filter(Boolean),
        resolveReference: (t) => {
          try {
            if (t.adapter !== "catalog") return false;
            resolvePageTarget(catalog.entries, t);
            return true;
          } catch {
            return false;
          }
        },
      });
      document.revision++;
      const data = catalogJSON(document),
        manifest = structuredClone(pages.manifest),
        descriptor = { target: input.target, key, sha256: digest(data) };
      manifest.documents = manifest.documents
        .filter((e) => e.key !== key)
        .concat(descriptor)
        .sort((a, b) => a.key.localeCompare(b.key));
      const overlay = new Map([
        [PAGE_MANIFEST, catalogJSON(manifest)],
        [pagePath(key), data],
      ]);
      if (sourceChange?.after)
        overlay.set(sourceChange.path, sourceChange.after);
      const nextCatalog = {
        ...catalog,
        entries: catalog.entries.map((e) =>
          e === resolved.entry ? { ...e, pack } : e,
        ),
      };
      await readPageDocuments(root, nextCatalog, { overlay });
      if (sourceChange) await validateJoinedSources(root, overlay);
      const currentState = await pageEditorRecord(root, catalog, input.target);
      const beforeSnapshot = await captureEditorRevision(
        root,
        currentState,
        catalog,
        { id: randomBytes(16).toString("hex"), kind: "before" },
      );
      const afterSnapshot = await captureEditorRevision(
        root,
        {
          ...currentState,
          record,
          document,
          pack,
          fingerprint: document.baseFingerprint,
        },
        catalog,
        {
          id: randomBytes(16).toString("hex"),
          kind: "after",
          uploads: input.uploads,
        },
      );
      const revisionPlan = await prepareRevisionPlan(
        root,
        input.target,
        beforeSnapshot,
        afterSnapshot,
      );
      const digestValue = digest(catalogJSON({ input, document, manifest }));
      if (candidates.size >= 8)
        candidates.delete(candidates.keys().next().value);
      candidates.set(digestValue, {
        input: structuredClone(input),
        document,
        manifest,
        data,
        key,
        pack,
        mediaPackKey: resolved.entry.key,
        sourceChange,
        expectedPages: pages.revision,
        revisionPlan,
        created: Date.now(),
      });
      const refs = catalog.entries.flatMap((e) =>
        [...e.pack.recipes, ...e.pack.objectives]
          .filter(
            (r) =>
              (r.inputs || r.requirements || []).some(
                (x) => x.itemId === record.id,
              ) || r.prerequisites?.includes(record.id),
          )
          .map((r) => ({
            id: r.id,
            name: r.name || r.title,
            packId: e.pack.id,
          })),
      );
      let projected;
      if (sourceChange) projected = { projections: specialProjections(record) };
      else
        renderDetail(
          allRecords([pack]).find((r) => r.id === record.id),
          nextCatalog.entries.map((e) => e.pack),
          {
            capturePage: (v) => (projected = v),
            imageURL: (p, id) =>
              `/api/media?packKey=${encodeURIComponent(input.target.scope.packKey)}&assetId=${encodeURIComponent(id)}`,
            showPlanner: false,
          },
        );
      return {
        projections: projected.projections,
        previewDigest: digestValue,
        target: input.target,
        expectedRevision: catalog.revision,
        expectedDocumentRevision: previous?.revision || 0,
        document,
        record,
        contentVersion: pack.contentVersion,
        semanticChange: factual(resolved.record) !== factual(record),
        canonicalMetadataChange: changed,
        affected: refs,
        review:
          "Repository files will change only after Save. Player quantities and completion are unchanged. Rebuild the reader after saving.",
      };
    });
  }
  async function commit(input) {
    exact(
      input,
      "operationId target expectedRevision expectedDocumentRevision previewDigest",
    );
    const path = operationPath(input.operationId);
    const old = await optionalBytes(root, path);
    if (old) {
      const receipt = validateReceipt(
        parseBounded(old.toString("utf8"), 1048576),
        input.operationId,
      );
      if (receipt.cancelled) return status(input.operationId);
      assert(
        receipt.previewDigest === input.previewDigest &&
          receipt.expectedRevision === input.expectedRevision &&
          receipt.expectedDocumentRevision === input.expectedDocumentRevision &&
          stableJSON(receipt.target) === stableJSON(input.target),
        "Operation identity cannot be reused",
      );
      return status(input.operationId);
    }
    const candidate = candidates.get(input.previewDigest);
    assert(
      candidate && Date.now() - candidate.created < 1800000,
      "Preview expired; validate your retained draft again",
    );
    const revisionPlan = {
      before: new Map(candidate.revisionPlan.before),
      after: new Map(candidate.revisionPlan.after),
    };
    for (const [p, b] of [...revisionPlan.after])
      if (b && revisionPlan.before.get(p) === null) {
        const envelope = JSON.parse(Buffer.from(b).toString("utf8"));
        if (envelope.kind === "after") {
          const next = p.replace(
            /\/[a-f0-9]{32}\.json$/,
            "/" + input.operationId + ".json",
          );
          envelope.id = input.operationId;
          revisionPlan.before.delete(p);
          revisionPlan.after.delete(p);
          revisionPlan.before.set(next, null);
          revisionPlan.after.set(next, catalogJSON(envelope));
        }
      }
    assert(
      input.expectedRevision === candidate.input.repositoryRevision &&
        input.expectedDocumentRevision === candidate.input.document.revision &&
        stableJSON(input.target) === stableJSON(candidate.input.target),
      "Save does not match reviewed preview",
    );
    const active = await optionalBytes(root, ACTIVE);
    assert(!active, "Resolve the pending page operation first");
    const intent = {
      version: 1,
      state: "unresolved",
      operationId: input.operationId,
      target: input.target,
      previewDigest: input.previewDigest,
      expectedRevision: input.expectedRevision,
      expectedDocumentRevision: input.expectedDocumentRevision,
    };
    await applyFilePlan({
      root,
      before: new Map([
        [path, null],
        [ACTIVE, null],
      ]),
      after: new Map([
        [path, catalogJSON(intent)],
        [ACTIVE, catalogJSON({ operationId: input.operationId })],
      ]),
    });
    const intentBytes = await optionalBytes(root, path),
      activeBytes = await optionalBytes(root, ACTIVE),
      transactionId = randomBytes(16).toString("hex");
    try {
      const saved = await store.save(
        {
          packKey: candidate.mediaPackKey,
          expectedRevision: input.expectedRevision,
          pack: candidate.pack,
          uploads: candidate.input.uploads.map((u) => ({
            assetId: u.asset.id,
            base64: u.base64,
            category: "other",
          })),
        },
        async ({ before, after, current }) => {
          const resultingRevision = catalogRevision(
            new Map([...after].filter(([, value]) => value !== null)),
          );
          if (candidate.sourceChange?.after) {
            await validateJoinedSources(
              root,
              new Map([
                [candidate.sourceChange.path, candidate.sourceChange.after],
              ]),
            );
            before.set(
              candidate.sourceChange.path,
              candidate.sourceChange.before,
            );
            after.set(
              candidate.sourceChange.path,
              candidate.sourceChange.after,
            );
          }
          const pages = await readPageDocuments(root, current, {
            checkBase: false,
          });
          assert(
            pages.revision === candidate.expectedPages,
            "Page changed since preview",
          );
          for (const [p, b] of pages.files) {
            before.set(p, b);
            after.set(p, b);
          }
          const docPath = pagePath(candidate.key);
          if (!before.has(docPath)) before.set(docPath, null);
          after.set(docPath, candidate.data);
          after.set(PAGE_MANIFEST, catalogJSON(candidate.manifest));
          for (const [p, b] of revisionPlan.after)
            if (b && revisionPlan.before.get(p) === null) {
              const value = JSON.parse(Buffer.from(b).toString("utf8"));
              if (value.kind === "after") {
                value.value.baseRevision = resultingRevision;
                revisionPlan.after.set(p, catalogJSON(value));
              }
            }
          await editorStateQuota(root, revisionPlan.after);
          for (const [p, b] of revisionPlan.before) {
            before.set(p, b);
            after.set(p, revisionPlan.after.get(p));
          }
          before.set(path, intentBytes);
          before.set(ACTIVE, activeBytes);
          after.set(ACTIVE, null);
          after.set(
            path,
            catalogJSON({
              ...intent,
              state: "committed",
              transactionId,
              documentRevision: candidate.document.revision,
              documentHash: digest(candidate.data),
              canonicalFingerprint: candidate.document.baseFingerprint,
              repositoryRevision: resultingRevision,
              assetHashes: candidate.pack.assets.map(({ id, sha256 }) => ({
                id,
                sha256,
              })),
            }),
          );
          return { transactionId };
        },
      );
      candidates.delete(input.previewDigest);
      return {
        ...(await status(input.operationId)),
        repositoryRevision: saved.revision,
      };
    } catch (reason) {
      throw new AuthorError(
        "PAGE_OPERATION_UNRESOLVED",
        `${reason.message} Page operation ${input.operationId} retained; check status or cancel only after recovery.`,
        409,
      );
    }
  }
  async function cancel(id) {
    const path = operationPath(id),
      bytes = await optionalBytes(root, path),
      active = await optionalBytes(root, ACTIVE),
      recovery = await inspectRecovery({ root });
    assert(
      !recovery.pending,
      "Resolve the repository journal with author:recover before cancellation",
    );
    const old = bytes
      ? validateReceipt(parseBounded(bytes.toString("utf8"), 1048576), id)
      : null;
    if (old?.state === "committed") return status(id);
    if (active)
      assert(
        parseBounded(active.toString("utf8"), 1024).operationId === id,
        "Another page operation owns the writer",
      );
    const before = new Map([[path, bytes]]),
      after = new Map([
        [
          path,
          catalogJSON({
            ...old,
            version: 1,
            state: "not-committed",
            operationId: id,
            cancelled: true,
          }),
        ],
      ]);
    if (active) {
      before.set(ACTIVE, active);
      after.set(ACTIVE, null);
    }
    await applyFilePlan({ root, before, after });
    return status(id);
  }
  return {
    read,
    preview: (input) => serial(() => preview(input)),
    commit: (input) => serial(() => commit(input)),
    status,
    // Only this method owns the snapshot barrier. HTTP status reads retain
    // their unresolved result while any writer holds the repository lock.
    statusForRefresh: (id) =>
      withRepositorySnapshot({ root }, () => inspectStatus(id, true)),
    cancel: (id) => serial(() => cancel(id)),
  };
}
