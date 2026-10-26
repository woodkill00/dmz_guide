import { emptyWorkspace } from "../../src/workspace/model.ts";
import { makeAnnotation } from "../../src/workspace/annotations.ts";
import { parseSnapshot } from "../../src/workspace/validation.ts";
import {
  canonicalFrame,
  identityRegistration,
} from "../../src/workspace/registration.ts";
import { applySnapshot } from "../../src/workspace/refresh.ts";
import {
  validateWorkspace,
  placedRecords,
  exportPrivateBackup,
} from "../../src/workspace/backup.ts";
import { acceptReview } from "../../src/workspace/review.ts";
/** Synthetic maximum point/icon capacities subject to the aggregate byte/node limits. */
export function capacityWorkspace(icons = []) {
  const state = emptyWorkspace(),
    applicability = {
      mapId: "hajin",
      coordinateVersion: canonicalFrame.coordinateVersion,
      gameBuild: null,
      floor: null,
    };
  state.icons = icons;
  for (let i = 0; i < 5000; i++) {
    const annotation = makeAnnotation({
      title: `SYNTHETIC custom ${i}`,
      x: (i * 71) % 4096,
      y: (i * 37) % 4096,
      category: `SYNTHETIC category ${i % 10}`,
      iconId: icons.length ? icons[i % icons.length].id : null,
    });
    state.annotations.push(annotation);
  }
  const snapshot = parseSnapshot(
    JSON.stringify({
      schemaVersion: 1,
      sourceId: "official",
      snapshotId: "synthetic-capacity",
      capturedAt: "2026-10-26T00:00:00Z",
      sourceRevision: "SYNTHETIC-NOT-GAME-DATA",
      frame: {
        id: "synthetic-canonical",
        mapId: "hajin",
        coordinateVersion: canonicalFrame.coordinateVersion,
        width: 4096,
        height: 4096,
        units: "pixels",
        origin: "top-left",
        xAxis: "right",
        yAxis: "down",
        crop: null,
        imageDigest: canonicalFrame.imageDigest,
      },
      applicability,
      categories: Array.from({ length: 10 }, (_, i) => ({
        id: `synthetic-${i}`,
        path: ["SYNTHETIC", `SYNTHETIC category ${i}`],
      })),
      records: Array.from({ length: 1000 }, (_, i) => ({
        id: `synthetic-${i}`,
        title: `SYNTHETIC raw ${i}`,
        categoryId: `synthetic-${i % 10}`,
        rawGeometry: {
          kind: "point",
          x: (i % 40) * 100 + 48,
          y: Math.floor(i / 40) * 120 + 40,
        },
        applicability,
        activityClaim: { state: "unknown", observedAt: null },
        upstreamRefs: ["synthetic-fixture-only"],
        evidence: [],
      })),
    }),
    "official",
  );
  applySnapshot(
    state,
    snapshot,
    "a".repeat(64),
    identityRegistration(snapshot.frame),
  );
  const records = placedRecords(state);
  for (const r of records.slice(0, 50))
    acceptReview(state, [r], {
      titleKey: r.key,
      positionKey: r.key,
      categoryKey: r.key,
      reviewer: "SYNTHETIC capacity reviewer",
    });
  validateWorkspace(state);
  exportPrivateBackup(state);
  return state;
}
