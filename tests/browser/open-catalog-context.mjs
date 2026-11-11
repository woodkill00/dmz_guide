export async function openCatalogContext(page) {
  const context = page.locator(".catalog-context");
  if ((await context.count()) && !(await context.evaluate((node) => node.open)))
    await context.locator(":scope > summary").click();
}
