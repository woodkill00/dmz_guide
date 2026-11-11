// Owner-requested roster and default display order, 2026-11-09.
const supplied = [
  ["inflatable-decoy", "Inflatable Decoy"],
  ["ammo-box", "Ammo Box"],
  ["trophy-system", "Trophy System"],
  ["armor-box", "Armor Box"],
  ["defibrillator", "Defibrillator"],
  ["ddos", "DDOS"],
  ["recon-drone", "Recon Drone"],
  ["sam-airburst-turret", "SAM Airburst Turret"],
  ["consumable-box", "Consumable Box"],
  ["medical-box", "Medical Box"],
  ["hazmat-box", "Hazmat Box"],
  ["portable-radar", "Portable Radar"],
  ["razor-wire-trap", "Razor Wire Trap"],
  ["rebreather", "Rebreather"],
  ["riot-shield", "Riot Shield"],
  ["seeker-drone", "Seeker Drone"],
  ["smoke-wall", "Smoke Wall"],
  ["revive-pistol", "Revive Pistol"],
  ["fulton-drop-marker", "Fulton Drop Marker"],
  ["utility-box", "Utility Box"],
  ["survivor-box", "Survivor Box"],
];
const newBoxes = new Set([
  "consumable-box",
  "medical-box",
  "hazmat-box",
  "utility-box",
]);
export const FIELD_UPGRADE_ROSTER = Object.freeze(
  supplied.map(([slug, name]) =>
    Object.freeze({
      slug,
      name,
      starterId:
        slug === "survivor-box"
          ? "mw4:x01-survivor-box"
          : newBoxes.has(slug)
            ? "mw4:field-upgrade-" + slug
            : "mw4:printer-item-" + slug,
      reportedId: "reported:" + slug,
    }),
  ),
);
const ranks = new Map(
  FIELD_UPGRADE_ROSTER.flatMap((item, index) => [
    [item.starterId, index],
    [item.reportedId, index],
  ]),
);
export const fieldUpgradeRank = (id) => ranks.get(id) ?? null;
