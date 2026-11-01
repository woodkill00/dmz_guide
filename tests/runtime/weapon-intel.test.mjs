import test from "node:test";
import assert from "node:assert/strict";
import {
  readWeaponIntel,
  validateWeaponIntel,
  patchWeapon,
} from "../../src/content/weapon-intel.mjs";
import { renderArmory } from "../../src/ui/armory-page.mjs";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
const db = await readWeaponIntel();
test("048 FR001/002 actual roster and compatibility/effect coverage", () => {
  assert.equal(db.weapons.length, 33);
  assert.equal(db.attachments.filter((a) => a.kind === "standard").length, 615);
  assert.equal(db.attachments.filter((a) => a.kind === "apex").length, 28);
  assert.equal(
    db.attachments
      .flatMap((a) => Object.values(a.effects))
      .filter((v) => Object.keys(v).length).length,
    991,
  );
  const pack = loadFixturePack("official-starter");
  assert.equal(pack.items.filter((i) => i.kind === "weapon").length, 33);
  const profile = newProfile(pack);
  for (const id of ["mw4:m4", "mw4:han-86", "mw4:axion", "mw4:kastov-762"])
    assert(pack.items.some((i) => i.id === id));
  assert(profile);
});
test("048 scopes, publisher units and unknowns remain explicit", () => {
  assert.equal(
    db.weapons.find((w) => w.id === "krait-p68").official.rpm.unit,
    "BPM",
  );
  assert.equal(
    db.weapons.find((w) => w.category === "melee").official.magazine
      .applicability,
    "not-applicable",
  );
  assert.equal(
    db.weapons.find((w) => w.id === "han-86").official.rpm.value,
    740,
  );
  assert.equal(db.communityStats["han-86"].rpm, 741);
  assert(
    db.weapons
      .find((w) => w.id === "vel-46")
      .unlockReports.some((r) => r.endsWith("Level 5")),
  );
  assert(db.patches.length >= 65);
  assert(
    db.patches.some(
      (p) =>
        p.date === "2026-10-28" &&
        p.weapon === "han-86" &&
        p.mode === "multiplayer" &&
        p.metric === "Max Damage Range",
    ),
  );
});
test("048 intelligence validation rejects corruption instead of dropping rows", () => {
  for (const mutate of [
    (d) => d.attachments.push(d.attachments[0]),
    (d) => d.attachments[0].weapons.push("not-real"),
    (d) => (d.attachments[0].effects["not-real"] = {}),
    (d) => (d.communityStats["han-86"].ads = NaN),
    (d) => (d.weapons[0].official.rpm.applicability = "unknown"),
    (d) => (d.patches[0].sourceURL = "https://evil.invalid/"),
  ]) {
    const copy = structuredClone(db);
    mutate(copy);
    assert.throws(() => validateWeaponIntel(copy));
  }
});
test("048 compact reader escapes untrusted labels and retains source context", () => {
  const copy = structuredClone(db);
  copy.weapons[0].name = "<img src=x onerror=alert(1)>";
  const html = renderArmory(copy);
  assert(!html.includes("<img src=x"));
  assert(html.includes("&lt;img"));
  const detail = renderArmory(db, "han-86");
  assert(detail.includes("Multiplayer"));
  assert(detail.includes("uncertain mode"));
  assert(detail.includes("No effect reported; not zero"));
  assert(detail.includes("Official patch history"));
  assert(detail.includes("/items/mw4--han-86/"));
  assert(detail.includes("worse"));
});

test("048 patch variants require exact reviewed names, never arbitrary prefixes/suffixes", () => {
  for (const subject of [
    "M4not-a-real-weapon",
    "Han 86 - r Apex Attachment",
    "Oden - tinel Apex Attachment",
  ])
    assert.equal(patchWeapon(subject, db), null);
  assert.equal(patchWeapon("Oden - Sentinel Apex Attachment", db), "oden");
});
