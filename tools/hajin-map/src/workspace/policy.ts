export interface SourcePolicy {
  id: string;
  name: string;
  page: string;
  capability: "referenceOnly" | "authorizedFileImport";
  revision: string;
  reason: string;
  privateExport: boolean;
  localBasemap: boolean;
}
const definitions: SourcePolicy[] = [
  {
    id: "official",
    name: "Call of Duty",
    page: "https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin",
    capability: "authorizedFileImport",
    revision: "owner-local-019-v1",
    reason:
      "Existing owner-local official inputs only; no acquisition or redistribution permission is added.",
    privateExport: false,
    localBasemap: true,
  },
  {
    id: "codmunity",
    name: "CODMunity",
    page: "https://codmunity.gg/dmz/map",
    capability: "referenceOnly",
    revision: "terms-2026-10-26",
    reason:
      "Collection restricted by source terms. An authorized export and reviewed permission are required.",
    privateExport: false,
    localBasemap: false,
  },
  {
    id: "wzstats",
    name: "WZStats",
    page: "https://wzstats.gg/mw4/dmz/map",
    capability: "referenceOnly",
    revision: "terms-2026-10-26",
    reason:
      "Collection and bulk export restricted by source terms. Permission is required.",
    privateExport: false,
    localBasemap: false,
  },
  {
    id: "codcentral",
    name: "CODCentral",
    page: "https://codcentral.net/blog/mw4-dmz-map/",
    capability: "referenceOnly",
    revision: "rights-2026-10-26",
    reason:
      "Reuse permission is unverified. An authorized export and reviewed permission are required.",
    privateExport: false,
    localBasemap: false,
  },
  {
    id: "mapgenie",
    name: "MapGenie",
    page: "https://mapgenie.io/call-of-duty-modern-warfare-4/maps/hajin-dmz",
    capability: "referenceOnly",
    revision: "mapgenie-local-024-v1",
    reason:
      "MapGenie collection requires owner permission and reviewed coordinate registration. Existing website captures remain available.",
    privateExport: false,
    localBasemap: false,
  },
];
export let sourcePolicies: Readonly<Record<string, Readonly<SourcePolicy>>> =
  Object.freeze(
    Object.fromEntries(definitions.map((p) => [p.id, Object.freeze(p)])),
  );
/** Called only for the explicitly enabled owner-local capture manifest, never an imported snapshot. */
export function authorizeLocalCapture(sourceId: string, declaration: string) {
  const previous = sourcePolicies[sourceId];
  if (!previous || sourceId === "official" || !declaration.trim())
    throw new Error("Invalid local source authorization.");
  sourcePolicies = Object.freeze({
    ...sourcePolicies,
    [sourceId]: Object.freeze({
      ...previous,
      capability: "authorizedFileImport" as const,
      revision: "owner-authorized-local-capture-v1",
      reason:
        "Owner-authorized local capture. Acquisition requires the separate local update opt-in; no redistribution permission is enabled.",
    }),
  });
}
export function requireCapability(
  sourceId: string,
  kind: "snapshot" | "basemap",
): Readonly<SourcePolicy> {
  if (sourceId === "owned" && kind === "basemap")
    return Object.freeze({
      id: "owned",
      name: "My authorized background",
      page: "",
      capability: "authorizedFileImport",
      revision: "owned-background-v1",
      reason: "Owner-supplied and expressly authorized local background.",
      privateExport: false,
      localBasemap: true,
    });
  const policy = Object.hasOwn(sourcePolicies, sourceId)
    ? sourcePolicies[sourceId]
    : undefined;
  if (
    !policy ||
    policy.capability === "referenceOnly" ||
    (kind === "basemap" && !policy.localBasemap)
  )
    throw new Error(policy?.reason ?? "Unknown source.");
  return policy;
}
