import evidence from "./codcentral-x01-interiors.json" with { type: "json" };
const interiors = new Set(evidence.ids);
/** Preserve raw archives/player data; exclude only reviewed wrong-map source IDs. */
export function isQuarantinedHajinRecord(
  sourceId: string,
  id: string,
  kind = "source",
) {
  return kind === "source" && sourceId === "codcentral" && interiors.has(id);
}
