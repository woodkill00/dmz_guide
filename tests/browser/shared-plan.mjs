import assert from "node:assert/strict";
export async function runSharedPlanTests({ browser, base }) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto(base + "/planner/?pack=demo%3Atraining-pack");
  await page.waitForSelector('#goal-select option[value="demo:beacon-build"]', {
    state: "attached",
  });
  for (const id of ["demo:beacon-build", "demo:scanner-build"]) {
    await page.selectOption("#goal-select", id);
    await page.getByRole("button", { name: "Add goal", exact: true }).click();
    await page.waitForFunction(
      (id) => document.querySelector(`[data-goal-quantity="${id}"]`),
      id,
    );
  }
  await page
    .getByText("Choose intermediate crafting routes", { exact: true })
    .click();
  await page.selectOption('[data-route="demo:board"]', "demo:board-batch");
  await page.waitForFunction(() =>
    document.querySelector("#save-status").textContent.includes("revision"),
  );
  await page
    .getByText("Full allocation and contingent-supply detail", { exact: true })
    .click();
  const wire = page.locator("#plan-output article").filter({
    has: page.getByRole("heading", { name: "Training Wire", exact: true }),
  });
  await wire.waitFor();
  assert.match(await wire.textContent(), /Consume 3/);
  const credits = page.locator("#plan-output article").filter({
    has: page.getByRole("heading", { name: "Training Credits", exact: true }),
  });
  assert.match(await credits.textContent(), /Consume 30/);
  await page
    .getByRole("button", { name: "Move Training scanner up", exact: true })
    .click();
  await page.waitForFunction(() =>
    document
      .querySelector("#goals-list li strong")
      .textContent.includes("Training scanner"),
  );
  await page.reload();
  await page.waitForSelector("#goals-list li");
  assert.match(
    await page.locator("#goals-list li").first().textContent(),
    /Training scanner/,
  );
  await page.selectOption("#planning-mode", "work-conserving");
  assert.match(
    await page.locator("#plan-output").textContent(),
    /work-conserving/,
  );
  await page.screenshot({
    path: "test-results/shared-plan-390.png",
    fullPage: true,
  });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await page.goto(base + "/inventory/?pack=demo%3Atraining-pack");
  await page.waitForSelector('[data-field="inventory"]');
  for (const [id, quantity] of [
    ["demo:wire", 3],
    ["demo:cell", 1],
    ["demo:credits", 20],
    ["demo:tool", 1],
  ])
    await page
      .locator(`[data-field="inventory"][data-id="${id}"]`)
      .fill(String(quantity));
  await page.locator('[data-field="reserves"][data-id="demo:wire"]').fill("1");
  await page
    .getByRole("button", { name: "Save inventory", exact: true })
    .click();
  await page.waitForFunction(() =>
    document.querySelector("#save-status").textContent.includes("revision"),
  );
  await page.selectOption('[data-completion="demo:bench-unlock"]', "completed");
  await page.waitForFunction(
    () =>
      document.querySelector("main").getAttribute("aria-busy") !== "true" &&
      !document.querySelector('[data-completion="demo:bench-unlock"]')
        .disabled &&
      document.querySelector("#save-status").textContent.includes("revision"),
  );
  assert.equal(
    await page.evaluate(async () => {
      const { loadProfile } = await import("/assets/src/storage/store.mjs");
      return (await loadProfile("demo:training-pack")).value.completion[
        "demo:bench-unlock"
      ];
    }),
    "completed",
  );
  await page.goto(base + "/planner/?pack=demo%3Atraining-pack");
  await page.waitForSelector("#goals-list li strong");
  assert(
    !(await page
      .locator("#plan-output")
      .textContent()
      .then((s) => s.includes("Executable in this manual model"))),
  );
  await page.goto(base + "/inventory/?pack=demo%3Atraining-pack");
  await page.waitForSelector('[data-field="reserves"]');
  await page.locator('[data-field="reserves"][data-id="demo:wire"]').fill("0");
  await page
    .getByRole("button", { name: "Save inventory", exact: true })
    .click();
  await page.waitForFunction(() =>
    document.querySelector("#save-status").textContent.includes("revision"),
  );
  await page.goto(base + "/planner/?pack=demo%3Atraining-pack");
  await page.waitForSelector("#goals-list li strong");
  assert.equal(
    (await page.locator("#plan-output").textContent()).split(
      "Executable in this manual model",
    ).length - 1,
    2,
  );
  await page.locator('[data-goal-quantity="demo:scanner-build"]').fill("2");
  await page.locator('[data-goal-quantity="demo:scanner-build"]').press("Tab");
  await page.waitForFunction(() =>
    document.querySelector("#save-status").textContent.includes("revision"),
  );
  await page.reload();
  await page.waitForSelector('[data-goal-quantity="demo:scanner-build"]');
  assert.equal(
    await page
      .locator('[data-goal-quantity="demo:scanner-build"]')
      .inputValue(),
    "2",
  );
  await page.locator('[data-remove="demo:scanner-build"]').click();
  await page.waitForFunction(
    () => document.querySelectorAll("#goals-list li strong").length === 1,
  );
  await context.close();
}
