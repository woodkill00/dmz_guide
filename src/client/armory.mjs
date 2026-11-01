import { weaponPreview } from "../ui/gunsmith-presentation.mjs";

const rosterElement = document.querySelector("#gunsmith-roster-data");
const rosterData = rosterElement ? JSON.parse(rosterElement.textContent) : null;
function setup(
  formSelector,
  rowSelector,
  searchSelector,
  selectSelector,
  countSelector,
  attribute,
  label,
  changed = () => {},
) {
  const form = document.querySelector(formSelector);
  if (!form) return;
  const rows = [...form.parentElement.querySelectorAll(rowSelector)],
    search = form.querySelector(searchSelector),
    select = form.querySelector(selectSelector),
    count = form.querySelector(countSelector);
  const update = () => {
    const term = search.value.trim().toLocaleLowerCase();
    let visible = 0;
    for (const row of rows) {
      row.hidden = !(
        row.dataset.search.includes(term) &&
        (!select.value || row.getAttribute(attribute) === select.value)
      );
      if (!row.hidden) visible++;
    }
    count.textContent = `${visible} of ${rows.length} ${label}`;
    const empty = form.parentElement.querySelector("[data-armory-empty]");
    if (empty) empty.hidden = visible > 0;
    changed();
  };
  form.addEventListener("submit", (e) => e.preventDefault());
  form.addEventListener("input", update);
  form.addEventListener("change", update);
  update();
  form.dataset.enhanced = "true";
}
setup(
  "[data-armory-filter]",
  "[data-armory-row]",
  "[data-armory-search]",
  "[data-armory-slot]",
  "[data-armory-count]",
  "data-slot",
  "attachments",
);
setup(
  "[data-weapon-filter]",
  "[data-weapon-row]",
  "[data-weapon-search]",
  "[data-weapon-class]",
  "[data-weapon-count]",
  "data-class",
  "weapons",
  updateWeaponPreview,
);

function updateWeaponPreview() {
  const data = document.querySelector("#gunsmith-roster-data");
  if (!data) return;
  const { db, figures } = rosterData,
    preview = document.querySelector("#weapon-preview"),
    rows = [...document.querySelectorAll("[data-weapon-row]")];
  const visible = rows.filter((row) => !row.hidden);
  let selected = preview.dataset.selectedWeapon;
  if (
    !visible.some(
      (row) =>
        row.querySelector("[data-preview-weapon]").dataset.previewWeapon ===
        selected,
    )
  )
    selected = visible[0]?.querySelector("[data-preview-weapon]").dataset
      .previewWeapon;
  document.querySelector("[data-gs-empty]").hidden = visible.length > 0;
  preview.hidden = !selected;
  for (const row of rows) {
    const button = row.querySelector("[data-preview-weapon]");
    const current = button.dataset.previewWeapon === selected;
    button.setAttribute("aria-pressed", String(current));
    row.classList.toggle("is-selected", current);
  }
  preview.dataset.selectedWeapon = selected || "";
  if (selected)
    preview.innerHTML = weaponPreview(
      db,
      db.weapons.find((w) => w.id === selected),
      figures,
    );
  const chosen = document.querySelector("[data-weapon-class]").value;
  document
    .querySelectorAll("[data-gs-class]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.gsClass === chosen)),
    );
}
document.querySelector(".gs-class-menu")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-gs-class]");
  if (!button) return;
  document.querySelector("[data-weapon-class]").value = button.dataset.gsClass;
  document
    .querySelector("[data-weapon-filter]")
    .dispatchEvent(new Event("change", { bubbles: true }));
});
document
  .querySelector(".gs-weapon-list")
  ?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-preview-weapon]");
    if (!button) return;
    document.querySelector("#weapon-preview").dataset.selectedWeapon =
      button.dataset.previewWeapon;
    updateWeaponPreview();
  });
document.querySelectorAll("[data-focus-slot]").forEach((link) =>
  link.addEventListener("click", () => {
    const select = document.querySelector("[data-armory-slot]"),
      search = document.querySelector("[data-armory-search]");
    search.value = "";
    select.value = link.dataset.focusSlot;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    select.focus({ preventScroll: true });
  }),
);
document.addEventListener(
  "error",
  (event) => {
    const target = event.target;
    if (!target?.matches?.("[data-local-weapon-art]")) return;
    const svg = target.closest("svg");
    svg.hidden = true;
    const notice = svg.nextElementSibling;
    if (notice) notice.hidden = false;
  },
  true,
);
