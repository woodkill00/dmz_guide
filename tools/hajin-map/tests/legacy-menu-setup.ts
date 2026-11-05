import assert from "node:assert/strict";
/** 067 source controls live inside named native disclosures, closed by default.
 * Open only the requested owner by a real summary click; do not change masks.
 */
export async function openLegacyMapSection(page, section: string) {
  const owner = page.locator(
    "#map-key details[data-menu-section=" + JSON.stringify(section) + "]",
  );
  await owner.waitFor({ state: "attached" });
  if (!(await owner.evaluate((node: HTMLDetailsElement) => node.open)))
    await owner.locator(":scope > summary").click();
  assert.equal(
    await owner.evaluate((node: HTMLDetailsElement) => node.open),
    true,
    "Requested native map owner must be open: " + section,
  );
}
