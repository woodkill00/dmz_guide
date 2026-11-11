import { findRecord, recordVersion, type Waypoint } from "./field-guide.ts";
import type { ExplorerRecord } from "./explorer-index.ts";
import type { RoadLeg } from "./roads.ts";

const normalized = (value: string) => value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
/** These are evidence labels for a stop, not assertions that a door or road is passable. */
export function routeStopConstraints(
  stop: Waypoint,
  index: number,
  records: ExplorerRecord[],
  keyUses: readonly { locationName: string }[],
  mode: "road" | "direct",
  hasRoadNetwork: boolean,
  legs: readonly RoadLeg[],
): string[] {
  const messages: string[] = [];
  const record = stop.kind === "record" ? findRecord(records, stop.key) : null;
  if (record && stop.kind === "record" && recordVersion(record) === stop.identity) {
    const count = keyUses.filter((use) => normalized(use.locationName) === normalized(record.title)).length;
    if (count) messages.push(`${count} recorded key use${count === 1 ? "" : "s"} at this named area; check the exact room and key`);
    messages.push(record.floor === null ? "Floor unrecorded" : `Reported floor ${record.floor}; verify access in game`);
  } else if (stop.kind === "record") messages.push("Location capture changed or unavailable; review this stop");
  else messages.push("Manual point; floor and keyed access unrecorded");
  if (index > 0) {
    if (mode === "direct") messages.push("Incoming leg is a straight line, not roads");
    else if (!hasRoadNetwork) messages.push("Incoming road coverage unavailable");
    else {
      const leg = legs[index - 1];
      if (!leg) messages.push("Incoming road leg awaiting calculation");
      else if (leg.error) messages.push(`Incoming road gap: ${leg.error}`);
      else if (leg.connectorLength > 0) messages.push("Incoming leg includes an off-road connector");
      else messages.push("Incoming leg follows the recorded road centerline; passability unverified");
    }
  }
  return messages;
}
