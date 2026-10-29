// SYNTHETIC TEST FIXTURE. Never game data, provider data or evidence of map accuracy.
export function syntheticSnapshot(sourceId = "synthetic", recordCount = 1) {
  const applicability = {
    mapId: "hajin",
    coordinateVersion: "synthetic-v1",
    gameBuild: null,
    floor: null,
  };
  return {
    schemaVersion: 1,
    sourceId,
    snapshotId: "fixture-v1",
    capturedAt: "2026-10-26T00:00:00Z",
    sourceRevision: "synthetic-v1",
    frame: {
      id: "synthetic-frame",
      mapId: "hajin",
      coordinateVersion: "synthetic-v1",
      width: 100,
      height: 80,
      units: "pixels",
      origin: "top-left",
      xAxis: "right",
      yAxis: "down",
      crop: null,
      imageDigest: null,
    },
    applicability,
    categories: [
      { id: "synthetic-category", path: ["Synthetic", "Locations"] },
    ],
    records: Array.from({ length: recordCount }, (_, i) => ({
      id: recordCount === 1 ? "synthetic-point" : `synthetic-${i}`,
      categoryId: "synthetic-category",
      title: "SYNTHETIC TEST POINT",
      rawGeometry: { kind: "point", x: 25, y: 40 },
      applicability: { ...applicability },
      activityClaim: { state: "unknown", observedAt: null },
      upstreamRefs: [],
      evidence: [],
    })),
  };
}
