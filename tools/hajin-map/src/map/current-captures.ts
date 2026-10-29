import { sourcePolicies, authorizeLocalCapture } from "../workspace/policy.ts";
import type { MarkerSource } from "./marker-sources.ts";
import { boundedBytes } from "./bounded-input.ts";
import { hajin } from "./hajin.ts";
export interface CaptureDescriptor {
  id: string;
  generation?: string;
  snapshot: string;
  snapshotDigest: string;
  iconDirectory: string;
  semanticDigest?: string;
}
export function captureSource(value: CaptureDescriptor): MarkerSource {
  const p = sourcePolicies[value?.id];
  const base = value?.generation
    ? `/maps/hajin/captures/${value.generation}/${value.id}/`
    : `/maps/hajin/${value?.id === "official" ? "official" : `providers/${value?.id}`}/`;
  if (
    !p ||
    (value.generation &&
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
        value.generation,
      )) ||
    value.snapshot !== base + "markers.json" ||
    value.iconDirectory !== base + "icons/" ||
    !/^[a-f0-9]{64}$/.test(value.snapshotDigest) ||
    (value.semanticDigest !== undefined &&
      !/^[a-f0-9]{64}$/.test(value.semanticDigest))
  )
    throw Error("Invalid local capture descriptor.");
  return {
    id: p.id,
    name: p.name,
    page: p.page,
    website: new URL(p.page).hostname,
    snapshot: value.snapshot,
    snapshotDigest: value.snapshotDigest,
    iconDirectory: value.iconDirectory,
    labelCategories:
      p.id === "official"
        ? { poiLabel: "major", poiLabelSecondary: "minor" }
        : {},
    recordLink: () => p.page,
  };
}
export async function loadCurrentCaptures(): Promise<MarkerSource[]> {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch("/maps/hajin/current-captures.local.json", {
      signal: controller.signal,
      cache: "no-store",
    });
    if (response.status === 404) return [];
    const data = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        await boundedBytes(response, 32768),
      ),
    );
    if (
      data.version !== 1 ||
      data.canonicalDigest !== hajin.provenance.sha256 ||
      !Array.isArray(data.sources) ||
      data.sources.length > 5 ||
      new Set(data.sources.map((s: CaptureDescriptor) => s.id)).size !==
        data.sources.length
    )
      throw Error("Invalid current capture pointer.");
    const sources = data.sources.map(captureSource);
    for (const s of sources)
      if (s.id !== "official")
        authorizeLocalCapture(
          s.id,
          "Owner-enabled reviewed local capture pointer.",
        );
    return sources;
  } finally {
    clearTimeout(timer);
  }
}
