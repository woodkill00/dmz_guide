// Page rewards are community reports, not proof of a current-build unlock.
// Variable chapter pages are keyed by their roster, not their displayed page number.
export const missionSources = {
  codcentral: "https://codcentral.net/blog/mw4-dmz-orders/",
  radar: "https://dmzradar.com/orders.html",
  game8: "https://game8.co/games/Call-of-Duty-Modern-Warfare-4/archives/632467",
};

const rewards = [
  ["Medkit", "2-Plate Armor Vest"],
  ["Flash recipe", "Basic Triage Kit"],
  ["UAV", "Operator Rescue Beacon", "Weapon Insurance Contract"],
  ["Medium Backpack", "Ammo Box"],
  ["Recon Drone recipe", "Explosives Equipment Kit"],
  ["Operator Rescue Beacon", "Weapon Insurance Contract"],
  ["UAV", "Armor Box"],
  ["DDOS recipe", "Decoy Grenade recipe", "Night Vision Goggles recipe"],
  ["Basic Restock Kit", "Operator Rescue Beacon", "Weapon Insurance Contract"],
  ["Large Backpack", "Basic Triage Kit"],
  ["Defibrillator", "Inflatable Decoy", "C4 recipe"],
  ["3-Plate Armor Vest recipe", "Triage Kit"],
  [
    "Recon Equipment Kit",
    "Operator Rescue Beacon",
    "Weapon Insurance Contract",
  ],
  ["Structural Alloy ×2", "Stock Rod ×2"],
  ["CPU ×2", "Nylon Cloth ×2", "Inflatable Decoy"],
  ["Large Backpack recipe", "Weapon Restock Kit"],
  ["Helmeted Armor Kit", "Operator Rescue Beacon", "Weapon Insurance Contract"],
  ["Nitro Compounds ×2", "SERE Kit"],
  ["Binding Catalyst ×2", "Explosives Equipment Kit"],
  ["3-Plate Armor Vest", "Bomb Glider"],
  ["Triage Kit", "Operator Rescue Beacon", "Weapon Insurance Contract"],
  ["High-Tenacity Fibers ×2", "Trap Equipment Kit"],
  ["Printed Circuit Board ×2", "Recon Equipment Kit"],
  ["Gold Bar ×2", "Advanced SERE Kit"],
];

export const hajinPageIntel = rewards.map((items, index) => ({
  page: index + 1,
  rewards: [...items, "20,000 DMZ Cash"],
  sourceKeys: [
    "radar",
    "codcentral",
    ...(index <= 5 || index === 7 || index === 8 ? ["game8"] : []),
  ],
  reviewedAt: "2026-11-14",
  ...(index === 8
    ? {
        notes:
          "DMZ Radar also reports a Coin Mining Den Key for this chapter; Game8 does not list it. Check the current game reward screen.",
      }
    : {}),
}));
