import { resolveWeaponEntry } from "../domain/weapon-routes.mjs";
const link = document.querySelector("#weapon-alias"),
  entry = resolveWeaponEntry(
    location.href,
    JSON.parse(document.querySelector("#weapon-alias-ids").textContent),
    link.dataset.weaponSection,
  );
link.href = entry.href;
if (entry.notice) {
  document.querySelector("#weapon-alias-notice").textContent = entry.notice;
} else location.replace(entry.href);
