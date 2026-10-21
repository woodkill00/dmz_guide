import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planShared } from '../../src/domain/shared-plan.mjs';
import { newProfile } from '../../src/domain/profile.mjs';
const original = JSON.parse(readFileSync('content/packs/demo-training.json'));
function fixture() {
  const pack = structuredClone(original), profile = newProfile(pack);
  profile.goals = [{ id: 'demo:beacon-build', quantity: 1 }, { id: 'demo:scanner-build', quantity: 1 }];
  profile.routes['demo:board'] = 'demo:board-batch';
  return { pack, profile };
}
const row = (r, id) => r.ledger.find(x => x.id === `demo:${id}`);
const amount = (g, when, id) => g[when].filter(x => x.id === `demo:${id}`).reduce((n, x) => n + x.missing + x.retainedMissing, 0);
function supply(p, entries) { for (const [id, n] of Object.entries(entries)) p.inventory[`demo:${id}`] = n; }
function bare(pack) { for (const k of ['sources', 'items', 'recipes', 'objectives', 'guides', 'maps', 'locations', 'claims', 'assets']) pack[k] = []; }
function item(id) { return { id, name: id, kind: 'item', unit: 'count', status: 'fictional' }; }
function objective(id, requirements = [], prerequisites = []) { return { id, name: id, requirements, prerequisites, requirementsKnown: true, status: 'fictional', oneTime: true }; }

test('shared batch and once-only objective closure: 3 wire, 30 credits, one retained tool', () => {
  const { pack, profile } = fixture(); const before = JSON.stringify({ pack, profile }); const r = planShared(pack, profile);
  assert.equal(row(r, 'wire').consumed, 3); assert.equal(row(r, 'credits').consumed, 30);
  assert.equal(row(r, 'board').produced, 2); assert.equal(row(r, 'tool').retained, 1);
  assert.equal(JSON.stringify({ pack, profile }), before);
  profile.completion['demo:bench-unlock'] = 'completed'; assert.equal(row(planShared(pack, profile), 'credits').consumed, 20);
});
test('actual held intermediates reduce expansion; projected stock never becomes owned', () => {
  const { pack, profile } = fixture(); supply(profile, { board: 1 }); let r = planShared(pack, profile);
  assert.equal(row(r, 'board').allocated, 1); assert.equal(row(r, 'wire').consumed, 3); assert.equal(row(r, 'board').surplus, 1);
  supply(profile, { board: 2 }); r = planShared(pack, profile); assert.equal(row(r, 'board').produced, 0); assert.equal(row(r, 'wire'), undefined);
});
test('additional root production does not use held final output; root route alternatives conflict', () => {
  const { pack, profile } = fixture(); profile.goals = [{ id: 'demo:board-batch', quantity: 3 }]; supply(profile, { board: 100, wire: 6 });
  const r = planShared(pack, profile); assert.equal(row(r, 'wire').consumed, 6); assert.equal(row(r, 'board').produced, 4); assert.equal(r.remainingInventory['demo:board'], 104);
  const alt = { ...structuredClone(pack.recipes[0]), id: 'demo:alternative' }; pack.recipes.push(alt);
  profile.goals.push({ id: alt.id, quantity: 1 }); assert.throws(() => planShared(pack, profile), /Conflicting recipes/);
  profile.goals.pop(); profile.routes['demo:board'] = alt.id; assert.throws(() => planShared(pack, profile), /choose one alternative/);
});
test('A25 now/later batch attribution redistributes with one owned board', () => {
  const { pack, profile } = fixture(); pack.recipes.find(r => r.id === 'demo:beacon-build').prerequisites = [];
  let r = planShared(pack, profile); assert.equal(amount(r.goals[0], 'collectNow', 'wire'), 3); assert.equal(amount(r.goals[1], 'collectLater', 'wire'), 0);
  supply(profile, { board: 1 }); r = planShared(pack, profile); assert.equal(amount(r.goals[0], 'collectNow', 'wire'), 0); assert.equal(amount(r.goals[1], 'collectLater', 'wire'), 3);
});
test('executable schedule shares craft surplus and objective completion, preserves tool and input profile', () => {
  const { pack, profile } = fixture(); supply(profile, { wire: 3, credits: 30, tool: 1, cell: 1 }); const before = JSON.stringify(profile);
  const r = planShared(pack, profile); assert.deepEqual(r.schedule.map(x => x.executable), [true, true]);
  const actions = r.schedule.flatMap(s => s.actions); assert.equal(actions.filter(a => a.id === 'demo:bench-unlock').length, 1); assert.equal(actions.filter(a => a.id === 'demo:board-batch').length, 1);
  assert.equal(r.remainingInventory['demo:tool'], 1); assert.equal(r.remainingInventory['demo:wire'], 0); assert.equal(r.remainingInventory['demo:credits'], 0); assert.equal(JSON.stringify(profile), before);
});
test('strict priority protects blocked higher allocations; explicit work conservation rolls back entire failed goal', () => {
  const { pack, profile } = fixture(); supply(profile, { board: 1, credits: 30, tool: 1 });
  let r = planShared(pack, profile); assert.deepEqual(r.schedule.map(s => s.executable), [false, false]);
  assert.equal(r.remainingInventory['demo:board'], 1); assert.equal(r.remainingInventory['demo:credits'], 30); assert.deepEqual(r.completedObjectives, []); assert.deepEqual(r.schedule[0].actions, []);
  r = planShared(pack, profile, { mode: 'work-conserving' }); assert.deepEqual(r.schedule.map(s => s.executable), [false, true]); assert.equal(r.remainingInventory['demo:credits'], 0);
  assert.equal(r.schedule[1].actions.filter(a => a.id === 'demo:bench-unlock').length, 1);
});
test('retained + consumed same item protects shared floor and can craft missing retained tools explicitly', () => {
  const { pack, profile } = fixture(); profile.goals = [{ id: 'demo:board-batch', quantity: 2 }];
  pack.recipes[0].inputs = [{ itemId: 'demo:wire', quantity: 2, consumed: true }, { itemId: 'demo:wire', quantity: 1, consumed: false }];
  supply(profile, { wire: 2 }); let r = planShared(pack, profile); assert.equal(row(r, 'wire').allocated, 1); assert.equal(row(r, 'wire').missing, 1); assert.equal(r.schedule[0].executable, false);
  supply(profile, { wire: 3 }); r = planShared(pack, profile); assert.equal(r.schedule[0].executable, true); assert.equal(r.remainingInventory['demo:wire'], 1);
  const f = fixture(); f.pack.recipes.push({ ...structuredClone(f.pack.recipes[0]), id: 'demo:tool-build', output: { itemId: 'demo:tool', quantity: 1 } }); f.profile.routes['demo:tool'] = 'demo:tool-build'; supply(f.profile, { wire: 6, credits: 30, cell: 1 });
  r = planShared(f.pack, f.profile); assert.equal(row(r, 'wire').consumed, 6); assert.deepEqual(r.schedule.map(s => s.executable), [true, true]); assert.equal(r.remainingInventory['demo:tool'], 1);
});
test('unknown/disputed prerequisite evidence blocks even with manual completion; unknown recipe eligibility blocks', () => {
  for (const status of ['unknown', 'disputed', 'stale', 'unverified']) {
    const { pack, profile } = fixture(); pack.objectives[0].status = status; profile.completion['demo:bench-unlock'] = 'completed'; supply(profile, { board: 2, credits: 100, tool: 1, cell: 1 });
    const r = planShared(pack, profile); assert(r.goals.every(g => g.reasons.some(s => s.includes(status)))); assert(r.schedule.every(s => !s.executable));
  }
  const { pack, profile } = fixture(); pack.recipes[1].eligibility = 'unknown'; supply(profile, { board: 2, credits: 100, tool: 1, cell: 1 }); assert.equal(planShared(pack, profile).schedule[0].executable, false);
});
test('typed currency, scope joins, unresolved references, duplicates and malformed quantities reject', () => {
  const cases = [
    ({ pack }) => { pack.items.find(i => i.id === 'demo:credits').unit = 'count'; },
    ({ pack }) => { pack.items[0].scope = { gameId: 'fictional-training', mode: 'other', build: 'test-only-v1' }; },
    ({ profile }) => { profile.inventory['missing:item'] = 1; },
    ({ profile }) => { profile.reserves['missing:item'] = 1; },
    ({ profile }) => { profile.completion['missing:objective'] = 'completed'; },
    ({ profile }) => { profile.routes['demo:wire'] = 'demo:board-batch'; },
    ({ profile }) => { profile.goals.push(profile.goals[0]); },
    ({ pack }) => { pack.recipes[0].inputs[0].quantity = 1.5; },
    ({ pack }) => { pack.recipes[0].prerequisites = ['missing:objective']; },
    ({ profile }) => { profile.goals.push({ id: 'demo:campaign-chapter', quantity: 1 }); },
    ({ profile }) => { profile.goals = [{ id: 'demo:bench-unlock', quantity: 2 }]; }
  ];
  for (const change of cases) { const f = fixture(); change(f); assert.throws(() => planShared(f.pack, f.profile)); }
});
test('unused alternative cycles tolerated, selected cycles explain stable path', () => {
  const { pack, profile } = fixture(); pack.recipes.push({ ...structuredClone(pack.recipes[0]), id: 'demo:cycle', inputs: [{ itemId: 'demo:board', quantity: 1, consumed: true }] });
  assert.doesNotThrow(() => planShared(pack, profile)); profile.routes['demo:board'] = 'demo:cycle'; assert.throws(() => planShared(pack, profile), /cycle.*demo:board.*demo:board/);
});
test('goal bounds permit 100 and reject 200; aggregates reject explosive selected chains', () => {
  const { pack, profile } = fixture(); bare(pack);
  for (let i = 0; i < 200; i++) pack.objectives.push(objective(`demo:o${i}`));
  profile.routes = {}; profile.goals = pack.objectives.slice(0, 100).map(r => ({ id: r.id, quantity: 1 })); assert.equal(planShared(pack, profile).goals.length, 100);
  profile.goals = pack.objectives.map(r => ({ id: r.id, quantity: 1 })); assert.throws(() => planShared(pack, profile), /Goal limit/);
  const f = fixture(); f.profile.goals = [{ id: 'demo:beacon-build', quantity: 1000000 }]; f.pack.recipes[1].inputs[0].quantity = 1000000; f.pack.recipes[0].inputs[0].quantity = 1000000; assert.throws(() => planShared(f.pack, f.profile), /overflow/);
});
test('20k-node DAG validates and executes iteratively with linear bounded work', () => {
  const { pack, profile } = fixture(); bare(pack); profile.routes = {};
  for (let i = 0; i < 20000; i++) pack.objectives.push(objective(`demo:o${i}`, [], i ? [`demo:o${i - 1}`] : []));
  profile.goals = [{ id: 'demo:o19999', quantity: 1 }]; const r = planShared(pack, profile); assert.equal(r.schedule[0].executable, true); assert.equal(r.schedule[0].actions.length, 20000); assert(r.work < 300000);
  pack.objectives.push(objective('demo:too-many')); assert.throws(() => planShared(pack, profile), /record limit/);
});
test('1000 seeded randomized inventory/reserve trials conserve allocation, currency, horizons and input', () => {
  let seed = 0x4d5a2026; const rand = max => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max; };
  for (let trial = 0; trial < 1000; trial++) {
    const { pack, profile } = fixture(); profile.goals[0].quantity = 1 + rand(10); profile.goals[1].quantity = 1 + rand(10);
    if (rand(2)) profile.goals.reverse(); if (rand(2)) profile.completion['demo:bench-unlock'] = 'completed';
    for (const item of pack.items) { profile.inventory[item.id] = rand(40); profile.reserves[item.id] = rand(20); }
    const before = JSON.stringify({ pack, profile }); const r = planShared(pack, profile, { mode: rand(2) ? 'strict' : 'work-conserving' });
    assert.equal(JSON.stringify({ pack, profile }), before);
    for (const entry of r.ledger) {
      const avail = Math.max(0, entry.owned - entry.reserved);
      assert(entry.allocated + Math.min(entry.retained, avail) <= avail); assert.equal(entry.allocated + entry.missing, entry.consumed);
      assert.equal(entry.perGoal.reduce((n, p) => n + p.demand, 0), entry.consumed); assert.equal(entry.perGoal.reduce((n, p) => n + p.allocated, 0), entry.allocated); assert.equal(entry.perGoal.reduce((n, p) => n + p.missing, 0), entry.missing);
      assert(Number.isSafeInteger(entry.produced)); assert(entry.surplus >= 0); assert(entry.retainedMissing >= 0);
      if (!profile.routes[entry.id] && !['demo:beacon', 'demo:scanner'].includes(entry.id)) {
        const total = r.goals.reduce((n, g) => n + amount(g, 'collectNow', entry.id.slice(5)) + amount(g, 'collectLater', entry.id.slice(5)), 0);
        assert.equal(total, entry.missing + entry.retainedMissing);
      }
    }
    const replay = Object.fromEntries(pack.items.map(x => [x.id, Math.max(0, profile.inventory[x.id] - profile.reserves[x.id])]));
    const completed = new Set(Object.keys(profile.completion).filter(id => ['completed', 'unlocked'].includes(profile.completion[id])));
    for (const action of r.schedule.flatMap(s => s.actions)) {
      const record = [...pack.recipes, ...pack.objectives].find(x => x.id === action.id);
      for (const id of record.prerequisites) assert(completed.has(id));
      for (const cost of record.inputs || record.requirements) {
        const q = cost.quantity * (cost.consumed ? action.batches : 1); assert(replay[cost.itemId] >= q);
        if (cost.consumed) replay[cost.itemId] -= q;
      }
      if (record.output) replay[record.output.itemId] += record.output.quantity * action.batches;
      else { assert(!completed.has(record.id)); completed.add(record.id); }
    }
    assert.deepEqual(r.remainingInventory, replay);
    for (const n of Object.values(r.remainingInventory)) assert(Number.isSafeInteger(n) && n >= 0);
    for (const s of r.schedule) if (!s.executable) assert.deepEqual(s.actions, []);
    assert(r.remainingInventory['demo:tool'] >= Math.max(0, (profile.inventory['demo:tool'] || 0) - (profile.reserves['demo:tool'] || 0)));
  }
});

test('shared diamond aggregates deepest batches and deduplicates nested unlock closure', () => {
  const { pack, profile } = fixture();
  pack.items.push(item('demo:part'));
  pack.recipes.push({ ...structuredClone(pack.recipes[0]), id: 'demo:part-build', output: { itemId: 'demo:part', quantity: 1 }, inputs: [{ itemId: 'demo:board', quantity: 1, consumed: true }] });
  pack.recipes[1].inputs.push({ itemId: 'demo:part', quantity: 1, consumed: true });
  pack.recipes[2].inputs.push({ itemId: 'demo:part', quantity: 1, consumed: true });
  pack.objectives.push(objective('demo:lower-unlock', [{ itemId: 'demo:credits', quantity: 7, consumed: true }]));
  pack.objectives[0].prerequisites = ['demo:lower-unlock']; profile.routes['demo:part'] = 'demo:part-build';
  const r = planShared(pack, profile); assert.equal(row(r, 'board').consumed, 4); assert.equal(row(r, 'wire').consumed, 6); assert.equal(row(r, 'credits').consumed, 37);
  profile.goals.reverse(); const reverse = planShared(pack, profile);
  assert.deepEqual(Object.fromEntries(r.ledger.map(r => [r.id, r.consumed])), Object.fromEntries(reverse.ledger.map(r => [r.id, r.consumed])));
  supply(profile, { wire: 6, credits: 37, cell: 1, tool: 1 }); const executed = planShared(pack, profile); assert(executed.schedule.every(s => s.executable));
  assert.equal(executed.schedule.flatMap(s => s.actions).filter(a => a.id === 'demo:lower-unlock').length, 1);
});
test('missing route remains raw acquisition and completed objective costs nothing', () => {
  const { pack, profile } = fixture(); profile.routes = {}; let r = planShared(pack, profile); assert.equal(row(r, 'wire'), undefined); assert.equal(row(r, 'board').produced, 0);
  assert.equal(r.goals.reduce((n, g) => n + amount(g, 'collectLater', 'board'), 0), 2);
  profile.goals = [{ id: 'demo:bench-unlock', quantity: 1 }]; profile.completion['demo:bench-unlock'] = 'completed'; r = planShared(pack, profile); assert.deepEqual(r.ledger, []); assert.equal(r.schedule[0].executable, true); assert.deepEqual(r.schedule[0].actions, []);
});
test('completed prerequisite does not conceal disputed ancestor evidence', () => {
  const { pack, profile } = fixture(); pack.objectives[0].prerequisites = ['demo:delivery-order']; pack.objectives[1].prerequisites = []; pack.objectives[1].requirements = []; pack.objectives[1].status = 'disputed';
  profile.completion['demo:bench-unlock'] = 'completed'; profile.completion['demo:delivery-order'] = 'completed'; supply(profile, { board: 2, credits: 100, tool: 1, cell: 1 });
  assert(planShared(pack, profile).schedule.every(s => !s.executable));
});

test('root targets are earmarked; only newly produced batch surplus can serve other goals', () => {
  for (const reverse of [false, true]) {
    const { pack, profile } = fixture(); profile.goals = [{ id: 'demo:board-batch', quantity: 2 }, { id: 'demo:beacon-build', quantity: 1 }];
    if (reverse) profile.goals.reverse(); supply(profile, { wire: 6, cell: 1, tool: 1, credits: 10 });
    const r = planShared(pack, profile); assert(r.schedule.every(s => s.executable)); assert.equal(row(r, 'wire').consumed, 6); assert.equal(row(r, 'board').rootReserved, 2);
    assert.equal(r.remainingInventory['demo:board'], 3); assert.equal(r.remainingInventory['demo:wire'], 0);
  }
  const { pack, profile } = fixture(); profile.goals = [{ id: 'demo:beacon-build', quantity: 1 }, { id: 'demo:board-batch', quantity: 1 }]; supply(profile, { wire: 3, cell: 1, tool: 1, credits: 10 });
  const r = planShared(pack, profile); assert(r.schedule.every(s => s.executable)); assert.equal(row(r, 'wire').consumed, 3); assert.equal(r.schedule[1].actions.length, 0); assert.equal(r.remainingInventory['demo:board'], 1);
});


test('retained floor increases are attributed by goal/horizon without charging later needs to now', () => {
  for (const owned of [0, 1, 3, 5, 6]) for (const consumed of [0, 2]) {
    const { pack, profile } = fixture();
    pack.recipes[1].prerequisites = [];
    pack.recipes[2].inputs.find(c => c.itemId === 'demo:tool').quantity = 5;
    if (consumed) pack.recipes[1].inputs.push({ itemId: 'demo:tool', quantity: consumed, consumed: true });
    supply(profile, { tool: owned }); const before = JSON.stringify(profile);
    const r = planShared(pack, profile), tool = row(r, 'tool');
    const firstRetainedMissing = Math.max(0, 1 - owned);
    const laterRetainedMissing = Math.max(0, 5 - owned) - firstRetainedMissing;
    const allocated = Math.min(consumed, Math.max(0, owned - 5));
    assert.equal(tool.retained, 5); assert.equal(tool.retainedMissing, Math.max(0, 5 - owned));
    assert.equal(tool.allocated, allocated); assert.equal(tool.missing, consumed - allocated);
    assert.equal(amount(r.goals[0], 'collectNow', 'tool'), firstRetainedMissing + consumed - allocated);
    assert.equal(amount(r.goals[1], 'collectLater', 'tool'), laterRetainedMissing);
    assert.equal(amount(r.goals[0], 'collectLater', 'tool'), 0); assert.equal(amount(r.goals[1], 'collectNow', 'tool'), 0);
    assert.equal(tool.perGoal.reduce((n, p) => n + p.retainedMissing, 0), tool.retainedMissing);
    assert(tool.allocated + Math.min(owned, tool.retained) <= owned);
    assert.equal(JSON.stringify(profile), before);
  }
});
