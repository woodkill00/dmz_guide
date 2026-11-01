function setup(
  formSelector,
  rowSelector,
  searchSelector,
  selectSelector,
  countSelector,
  attribute,
  label,
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
);
