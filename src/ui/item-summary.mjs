import intel from "../content/tcno-item-intel.json" with { type: "json" };
import { spoilerGuard, projectSpoilerValue } from "../domain/progression.mjs";
const normalize = (text) =>
  String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
export function itemOverview(record, pack) {
  const earlier = String(record.description || "")
    .split("\n\nTroubleChute reference:")[0]
    .trim();
  const facts =
    pack.id === intel.packId && record.sourceIds?.includes(intel.sourceId)
      ? Object.keys(intel.mapping)
          .filter((id) => intel.mapping[id] === record.id)
          .map((id) =>
            projectSpoilerValue(
              intel.items[id],
              spoilerGuard(pack, Boolean(record.spoiler)),
            ),
          )
      : [];
  const descriptions = [
    ...new Set(facts.map((f) => f.description?.trim()).filter(Boolean)),
  ];
  const generic = [
    "Source-reported item reference; current-build behavior is not independently verified.",
    "TroubleChute-listed item. Current-build behavior is not independently verified.",
    "Listed as a FOB upgrade material by TroubleChute. Acquisition and live-build applicability are not independently verified.",
  ].some((text) => normalize(text) === normalize(earlier));
  const sourceTemplate = /^GameRant reports:/i.test(earlier);
  const summary =
    (!generic && !sourceTemplate ? earlier : "") ||
    descriptions[0] ||
    (!generic ? earlier : "") ||
    "No item description recorded.";
  const seen = new Set([normalize(summary)]);
  const notes = [!generic && earlier, ...descriptions]
    .filter(Boolean)
    .filter((text) => {
      const key = normalize(text);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return { summary, notes };
}
