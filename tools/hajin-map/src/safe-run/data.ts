import { markerSources, type MarkerSource } from "../map/marker-sources.ts";
import { loadCurrentCaptureSelection } from "../map/current-captures.ts";
import { loadLocalProviderSources } from "../map/local-providers.ts";
import { boundedBytes } from "../map/bounded-input.ts";
import { parseSnapshot } from "../map/source-snapshot.ts";
import { parseRoadGraph } from "../workspace/roads.ts";
import { extractStops } from "./domain.ts";
import baseKeys from "../../../../src/ui/keys.json";
import supplementalKeys from "../../../../src/ui/key-supplemental.json";
import { keyIdentities } from "./access.ts";
const guideKeys = keyIdentities([...baseKeys.keys, ...supplementalKeys.keys]);

async function read(path: string, limit: number) {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(path, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.headers.get("content-type")?.includes("application/json"))
      throw Error("Expected local JSON.");
    return await boundedBytes(response, limit);
  } finally {
    clearTimeout(timer);
  }
}
export async function loadDataset() {
  const selection = await loadCurrentCaptureSelection();
  let sources = selection.sources;
  if (!selection.present)
    sources = [...markerSources, ...(await loadLocalProviderSources())];
  const results = await Promise.allSettled(
    sources.map(async (source: MarkerSource) => {
      const bytes = await read(source.snapshot, 2 * 1024 * 1024);
      if (source.snapshotDigest) {
        const digest = Array.from(
          new Uint8Array(
            await crypto.subtle.digest(
              "SHA-256",
              bytes as Uint8Array<ArrayBuffer>,
            ),
          ),
          (v) => v.toString(16).padStart(2, "0"),
        ).join("");
        if (digest !== source.snapshotDigest)
          throw Error("Capture digest changed; refresh/review source capture.");
      }
      return {
        source,
        snapshot: parseSnapshot(
          JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
          source,
        ),
      };
    }),
  );
  const failures = results.flatMap((r, i) =>
    r.status === "rejected"
      ? [
          `${sources[i].name}: ${r.reason instanceof Error ? r.reason.message : "capture unavailable"}`,
        ]
      : [],
  );
  if (failures.length) throw Error(failures.join(" · "));
  const captures = results.flatMap((r) =>
    r.status === "fulfilled" ? [r.value] : [],
  );
  return {
    data: extractStops(captures, guideKeys),
    sources: captures.map(({ source, snapshot }) => ({
      name: source.name,
      page: source.page,
      date: snapshot.capturedAt,
    })),
  };
}
export async function loadRoads() {
  return parseRoadGraph(
    new TextDecoder("utf-8", { fatal: true }).decode(
      await read("/maps/hajin/roads.local.json", 2 * 1024 * 1024),
    ),
  );
}
