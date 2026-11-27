import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

// Fictional forward-test setup only. Agents supply actual behavior/evidence.
export async function createPilotFixtures() {
  const root = await mkdtemp(join(tmpdir(), "mw4-agent-pilot-"));
  const repo = resolve(fileURLToPath(new URL("../../", import.meta.url)));
  const playwright = pathToFileURL(
    resolve(repo, "node_modules/playwright/index.mjs"),
  ).href;
  const files = {
    "README.md":
      "# FICTIONAL AGENT EXERCISES\nNo real game data, player state or credentials. Work only in this temporary bundle. Each request states approved scope and test boundaries. Preserve raw before/after evidence; no GitHub publication.\n",
    "package.json": JSON.stringify({ private: true, type: "module" }),
    "bug/request.md":
      "Fix the fictional collector: its missing amount is incorrect when stock is below the required quantity. Use the project workflow helpers you discover from the checkout. The public missing() interface and its test are approved boundaries. Record the original failure, diagnosis, minimal change, green verification and a short interface assessment. Do not change the oracle.\n",
    "bug/inventory.mjs":
      "export function missing({required, owned}) { return Math.max(0, owned - required); }\n",
    "bug/check.mjs":
      "import assert from 'node:assert/strict';import {missing} from './inventory.mjs';assert.equal(missing({required:8,owned:3}),5);assert.equal(missing({required:3,owned:8}),0);assert.equal(missing({required:0,owned:0}),0);console.log('Fictional missing-stock behavior PASS');\n",
    "ui/request.md":
      "The fictional item card overflows a 220px container. Prototype a local solution and fix it while preserving the + button behavior and readable wrapping. Compare current/proposed ownership in a bounded architecture note. Use the real browser check.mjs at normal and enlarged text; retain failure/pass outputs. No production UI files or player storage may change.\n",
    "ui/index.html":
      '<!doctype html><html lang="en"><meta charset="utf-8"><title>Fictional card prototype</title><style>body{background:#17201c;color:#fff;font:1rem sans-serif}.host{width:220px}.card{min-width:350px;border:1px solid #8ca78f;padding:12px}.controls{display:flex;gap:8px}button{min-width:36px;min-height:36px}</style><h1>FICTIONAL card prototype</h1><div class="host"><article class="card"><h2>Training relay collector with a long fictional label</h2><div class="controls"><span>Owned <output>0</output></span><button aria-label="Add fictional stock">+</button></div></article></div><script>document.querySelector("button").onclick=()=>{const o=document.querySelector("output");o.textContent=Number(o.textContent)+1}</script></html>',
    "ui/check.mjs": `import assert from 'node:assert/strict';import {chromium} from ${JSON.stringify(playwright)};import {pathToFileURL} from 'node:url';import {resolve} from 'node:path';const browser=await chromium.launch({headless:true});try{const page=await browser.newPage();await page.goto(pathToFileURL(resolve(import.meta.dirname,'index.html')).href);for(const size of ['16px','32px']){await page.evaluate(size=>document.documentElement.style.fontSize=size,size);assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).fontSize),size,'Actual body font must enlarge');const m=await page.locator('.host').evaluate(e=>({client:e.clientWidth,scroll:e.scrollWidth}));assert(m.scroll<=m.client+1,JSON.stringify({size,...m}));}await page.getByRole('button',{name:'Add fictional stock'}).click();assert.equal(await page.locator('output').innerText(),'1');console.log('Fictional card layout and interaction PASS');}finally{await browser.close();}\n`,
    "content/request.md":
      "Update the fictional mission record to match the supplied primary source, retaining unknown fields as unknown. Research/cite the source and define useful terms in a domain-only glossary. The record validator is an approved test boundary. Do not edit its expected values or use real game facts. Record original failure and final pass.\n",
    "content/source.md":
      "# FICTIONAL PRIMARY SOURCE\nRevision training-1, 2026-11-27. The Relay exercise requires collecting three Training Relays. Rarity is unconfirmed. This fixture asserts nothing about a real game.\n",
    "content/mission.json": JSON.stringify({
      id: "training:relay",
      title: "Relay exercise",
      objective: "Collect 2 Training Relays",
      count: 2,
      rarity: null,
      source: "source.md",
    }),
    "content/check.mjs":
      "import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';const m=JSON.parse(await readFile(new URL('./mission.json',import.meta.url)));assert.equal(m.count,3);assert.equal(m.objective,'Collect 3 Training Relays');assert.equal(m.rarity,null);assert.equal(m.source,'source.md');console.log('Fictional source-backed content PASS');\n",
    "continuity/request.md":
      "Independently review the completed fictional work against these request files and repository standards at a recorded fixed point. Keep standards/spec findings separate; draft a PR body locally using the repository template. Create a concise sanitized handoff for a fresh resumer. Improve one agent-facing instruction with the writing helper, and produce an evidence-based retrospective. No external writes.\n",
    "review/request.md":
      "Independently review candidate/card.mjs against spec.md, standards.md and the fixed base/card.mjs snapshot. Select the appropriate project helpers yourself. Keep supported standards and specification findings separate with exact file locations; do not edit the candidate. Draft a PR body locally using the repository template, showing actual evidence and any unrun checks. Do not publish anything.\n",
    "review/spec.md":
      "# FICTIONAL CARD CONTRACT\nThe renderCard(label, quantity) interface displays both a readable item label and its numeric quantity. Unknown quantity must display the literal Unknown. User labels are untrusted text. This is a fictional exercise, not game data.\n",
    "review/standards.md":
      "# FICTIONAL RENDERER STANDARD\nEscape user-supplied text before placing it in HTML. Review requirements separately from coding standards. Keep changes scoped to the given interface; no network or storage writes.\n",
    "review/base/card.mjs":
      "const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');export function renderCard(label,quantity){return '<p>'+escape(label)+' '+(quantity??'Unknown')+'</p>';}\n",
    "review/candidate/card.mjs":
      "export function renderCard(label,quantity){return '<p class=green>'+label+'</p>';}\n",
  };
  for (const [path, body] of Object.entries(files)) {
    const target = join(root, path);
    await mkdir(resolve(target, ".."), { recursive: true });
    await writeFile(target, body, "utf8");
  }
  return {
    root,
    requests: ["bug", "ui", "content", "review", "continuity"].map((name) =>
      join(root, name, "request.md"),
    ),
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.log(JSON.stringify(await createPilotFixtures(), null, 2));
