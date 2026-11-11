// Independent journeys deliberately open UI disclosures before original actions.
export async function openParentDetails(locator) {
  const parents = await locator
    .first()
    .locator("xpath=ancestor::details")
    .all();
  for (const details of parents.reverse()) {
    if ((await details.getAttribute("open")) === null)
      await details.locator(":scope > summary").click();
  }
}

export async function revealReviewerControl(page, selector) {
  await openParentDetails(page.locator(selector));
}

export async function chooseCatalog(page, value) {
  await openParentDetails(page.locator("#pack-select"));
  return page.selectOption("#pack-select", value);
}

export async function clickCatalogBackup(page) {
  await openParentDetails(page.locator("#export-current-profile"));
  return page.click("#export-current-profile");
}

export async function openInventoryDetails(page, id) {
  const row = page
    .locator("[data-inventory-item]")
    .filter({
      has: page.locator(`[data-clear-stock="${id}"]`),
    })
    .first();
  if (!(await row.locator("[data-item-detail]").isVisible()))
    await row.locator("[data-show-use]").first().click();
}
