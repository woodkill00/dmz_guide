import type { MarkerSource } from "./marker-sources";
import { sourcePolicies, authorizeLocalCapture } from "../workspace/policy.ts";
import { hajin } from "./hajin.ts";
import { boundedBytes } from "./bounded-input.ts";

/** Owner-enabled, same-origin captures only. Never requests a provider website. */
export function localProviderSources(value: unknown): MarkerSource[] {
  const data = value as {
    version: number;
    sources: {
      id: string;
      authorization: string;
      canonicalDigest: string;
      rms: number;
      maxError: number;
      heldOut: number;
      snapshotDigest: string;
      registrationDigest: string;
    }[];
  };
  if (
    !data ||
    data.version !== 1 ||
    !Array.isArray(data.sources) ||
    data.sources.length > 3
  )
    throw new Error("Invalid local provider manifest.");
  const ids = new Set<string>();
  return data.sources.map((s) => {
    if (
      !s ||
      !["codmunity", "wzstats", "codcentral"].includes(s.id) ||
      ids.has(s.id) ||
      typeof s.authorization !== "string" ||
      !s.authorization.trim() ||
      s.authorization.length > 4000 ||
      s.canonicalDigest !== hajin.provenance.sha256 ||
      !Number.isFinite(s.rms) ||
      s.rms < 0 ||
      s.rms > 8 ||
      !Number.isFinite(s.maxError) ||
      s.maxError < 0 ||
      s.maxError > 16 ||
      !Number.isInteger(s.heldOut) ||
      s.heldOut < 2 ||
      !/^[a-f0-9]{64}$/.test(s.snapshotDigest) ||
      !/^[a-f0-9]{64}$/.test(s.registrationDigest)
    )
      throw new Error(
        "Local capture requires authorization and validated canonical registration.",
      );
    ids.add(s.id);
    const p = sourcePolicies[s.id];
    return {
      id: s.id,
      name: p.name,
      website: new URL(p.page).hostname,
      page: p.page,
      snapshot: `/maps/hajin/providers/${s.id}/markers.json`,
      snapshotDigest: s.snapshotDigest,
      iconDirectory: `/maps/hajin/providers/${s.id}/icons/`,
      labelCategories: {},
      recordLink: () => p.page,
    };
  });
}
export async function loadLocalProviderSources(): Promise<MarkerSource[]> {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch("/maps/hajin/providers.local.json", {
      signal: controller.signal,
    });
    if (response.status === 404) return [];
    const bytes = await boundedBytes(response, 32768);
    const data = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
    const sources = localProviderSources(data);
    for (const source of data.sources) {
      const response = await fetch(
        `/maps/hajin/providers/${source.id}/provenance.local.json`,
        { signal: controller.signal },
      );
      const bytes = await boundedBytes(response, 2 * 1024 * 1024);
      const digest = Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            bytes as Uint8Array<ArrayBuffer>,
          ),
        ),
        (b) => b.toString(16).padStart(2, "0"),
      ).join("");
      if (digest !== source.registrationDigest)
        throw new Error(
          "Registration evidence changed; review the local capture.",
        );
      const evidence = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      );
      if (
        evidence.snapshotDigest !== source.snapshotDigest ||
        evidence.registration.canonicalDigest !== source.canonicalDigest ||
        evidence.registrationVersion !== "reviewed-affine-v1"
      )
        throw new Error("Registration is not bound to this local capture.");
    }
    for (const source of data.sources)
      authorizeLocalCapture(source.id, source.authorization);
    return sources;
  } finally {
    clearTimeout(timer);
  }
}
