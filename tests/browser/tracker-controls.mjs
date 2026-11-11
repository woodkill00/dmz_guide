// Follow the actual disclosure controls instead of force-clicking hidden inputs.
export async function revealTrackerControl(page, selector) {
  const target = page.locator(selector).first();
  const itemDetail = target.locator("xpath=ancestor::div[@data-item-detail]");
  if (
    (await itemDetail.count()) &&
    (await itemDetail.getAttribute("hidden")) !== null
  ) {
    const id = await itemDetail.getAttribute("data-item-detail");
    await page.locator('[data-show-use="' + id + '"][aria-expanded]').click();
  }
  const ancestors = target.locator("xpath=ancestor::details");
  for (let index = 0; index < (await ancestors.count()); index++) {
    const details = ancestors.nth(index);
    if (!(await details.evaluate((node) => node.open)))
      await details.locator(":scope > summary").click();
  }
}
