import { assert, ID } from '../content/limits.mjs';
import { validateProfile } from './profile.mjs';
import { scopeOf } from '../content/validate.mjs';

const MAX = 1e12;
const badStatuses = new Set(['unknown', 'unverified', 'disputed', 'stale']);
const number = (n, max = MAX) => { assert(Number.isSafeInteger(n) && n >= 0 && n <= max, 'Unsafe quantity or aggregate overflow'); return n; };
const add = (a, b) => number(a + b);
const mul = (a, b) => number(a * b);
const done = (profile, id) => ['completed', 'unlocked'].includes(profile.completion[id]);
const warnings = r => [
  ...(badStatuses.has(r.status) ? [`${r.name || r.id}: content is ${r.status}`] : []),
  ...(r.ingredientsKnown === false || r.requirementsKnown === false ? [`${r.name || r.id}: requirements are unknown`] : []),
  ...(r.eligibility === 'unknown' ? [`${r.name || r.id}: input-pool eligibility is unknown`] : [])
];

/** Pure, bounded shared requirements accounting and separate copied execution trials. */
export function planShared(pack, profile, { mode = 'strict' } = {}) {
  assert(['strict', 'work-conserving'].includes(mode), 'Unknown scheduling mode');
  validateProfile(profile);
  assert(pack?.schemaVersion === 1 && profile.packId === pack.id && profile.contentVersion === pack.contentVersion, 'Content version mismatch. Preview and rebind in settings.');
  let work = 0;
  const tick = () => assert(++work <= 500000, 'Planner graph/action work limit exceeded');
  const groups = ['sources', 'items', 'recipes', 'objectives', 'guides', 'maps', 'locations', 'claims', 'assets'];
  const records = new Map();
  for (const group of groups) {
    assert(Array.isArray(pack[group]), `Invalid ${group}`);
    for (const r of pack[group]) {
      tick(); assert(r && typeof r.id === 'string' && r.id.length <= 100 && ID.test(r.id) && !records.has(r.id), `Invalid or duplicate record ID ${r?.id}`);
      records.set(r.id, r); assert(records.size <= 20000, 'Total record limit exceeded');
    }
  }
  const items = new Map(pack.items.map(r => [r.id, r]));
  const recipes = new Map(pack.recipes.map(r => [r.id, r]));
  const objectives = new Map(pack.objectives.map(r => [r.id, r]));
  for (const item of items.values()) assert(item.unit === (item.kind === 'currency' ? 'dmz-cash' : item.kind === 'resource' ? 'resource-unit' : 'count'), `Item kind/unit mismatch ${item.id}`);
  const join = (map, id, from) => {
    tick(); const r = map.get(id); assert(r, `Unknown reference ${id}`);
    assert(scopeOf(pack, r) === scopeOf(pack, from), `Scope mismatch ${from.id} -> ${id}`); return r;
  };
  for (const r of [...recipes.values(), ...objectives.values()]) {
    assert(['verified', 'observed', 'unverified', 'unknown', 'disputed', 'stale', 'fictional'].includes(r.status), `Unsupported evidence status ${r.id}`);
    assert(typeof (r.output ? r.ingredientsKnown : r.requirementsKnown) === 'boolean', `Invalid requirement certainty ${r.id}`);
    if (r.output) assert(['unknown', 'stash', 'carried', 'bank', 'resources'].includes(r.eligibility), `Unsupported input-pool eligibility ${r.id}`);
    assert(Array.isArray(r.prerequisites) && Array.isArray(r.output ? r.inputs : r.requirements), `Invalid requirements ${r.id}`);
    if (r.output) { join(items, r.output.itemId, r); assert(number(r.output.quantity, 1e6) > 0, 'Output must be positive'); }
    for (const c of r.inputs || r.requirements) { join(items, c.itemId, r); assert(number(c.quantity, 1e6) > 0 && typeof c.consumed === 'boolean', 'Invalid input quantity/consumption'); }
    for (const id of r.prerequisites) join(objectives, id, r);
  }
  for (const key of ['inventory', 'reserves']) for (const id of Object.keys(profile[key])) assert(items.has(id), `Unknown ${key} reference ${id}`);
  for (const id of Object.keys(profile.completion)) assert(objectives.has(id), `Unknown completion reference ${id}`);
  const routes = new Map();
  for (const [id, rid] of Object.entries(profile.routes)) {
    const item = items.get(id), recipe = recipes.get(rid);
    assert(item && recipe && recipe.output.itemId === id, `Invalid route ${id} -> ${rid}`);
    join(items, id, recipe); routes.set(id, recipe);
  }
  const goals = profile.goals.map(g => {
    const r = recipes.get(g.id) || objectives.get(g.id); assert(r, `Unknown goal reference ${g.id}`);
    if (!r.output) assert(g.quantity === 1, 'One-time objective quantity must be 1');
    if (r.output) {
      const old = routes.get(r.output.itemId);
      assert(!old || old.id === r.id, `Conflicting recipes for ${r.output.itemId}; choose one alternative`);
      routes.set(r.output.itemId, r);
    }
    return { ...g, name: r.name, reasons: [], collectNow: [], collectLater: [], record: r };
  });
  if (goals.length) for (const g of goals) assert(scopeOf(pack, g.record) === scopeOf(pack, goals[0].record), 'Goals cannot mix scopes/modes/builds');

  // Nodes are output items and once-only objectives. Only explicitly chosen recipes have edges.
  const nodes = new Map();
  for (const item of items.values()) nodes.set(item.id, { id: item.id, item, record: routes.get(item.id), edges: [], demand: new Map(), retained: new Map(), forced: new Map(), owners: new Set() });
  for (const r of objectives.values()) nodes.set(r.id, { id: r.id, record: r, edges: [], owners: new Set() });
  for (const n of nodes.values()) if (n.record) {
    n.edges = [...new Set([...(n.record.inputs || n.record.requirements).map(c => c.itemId), ...n.record.prerequisites])];
  }
  const colors = new Map(), order = [];
  for (const root of nodes.keys()) {
    if (colors.get(root) === 2) continue;
    const stack = [{ id: root, next: 0 }];
    while (stack.length) {
      tick(); const f = stack.at(-1); colors.set(f.id, 1); const n = nodes.get(f.id);
      if (f.next === n.edges.length) { colors.set(f.id, 2); order.push(f.id); stack.pop(); continue; }
      const id = n.edges[f.next++];
      if (colors.get(id) === 1) throw new Error(`Selected dependency cycle: ${stack.map(x => x.id).join(' -> ')} -> ${id}`);
      if (colors.get(id) !== 2) stack.push({ id, next: 0 });
    }
  }
  order.reverse();
  const put = (map, slot, q) => { if (q) map.set(slot, add(map.get(slot) || 0, q)); };
  const reasonSets = goals.map(() => new Set());
  const reason = (i, text) => { tick(); if (!reasonSets[i].has(text)) { reasonSets[i].add(text); goals[i].reasons.push(text); } };
  const slots = map => [...map.entries()].sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < goals.length; i++) {
    const g = goals[i]; if (g.record.output) put(nodes.get(g.record.output.itemId).forced, i * 2, g.quantity);
    else nodes.get(g.id).owners.add(i);
  }
  const ledger = [];
  function expand(n, batches) {
    const r = n.record;
    const contributors = [...new Set([...batches.keys()].map(s => Math.floor(s / 2)))];
    for (const i of contributors) for (const text of warnings(r)) reason(i, text);
    for (const id of r.prerequisites) for (const i of contributors) {
      nodes.get(id).owners.add(i);
      if (!done(profile, id)) reason(i, `${objectives.get(id).name || id}: unfinished prerequisite`);
    }
    const later = warnings(r).length > 0 || r.prerequisites.some(id => !done(profile, id) || warnings(objectives.get(id)).length > 0);
    for (const c of r.inputs || r.requirements) for (const [slot, count] of slots(batches)) {
      tick(); const target = nodes.get(c.itemId), s = Math.floor(slot / 2) * 2 + (later || slot % 2 ? 1 : 0);
      if (c.consumed) put(target.demand, s, mul(c.quantity, count));
      else target.retained.set(s, Math.max(target.retained.get(s) || 0, c.quantity));
    }
  }
  for (const id of order) {
    tick(); const n = nodes.get(id);
    if (!n.item) {
      if (!n.owners.size) continue;
      assert(n.record.oneTime === true, `Unsupported repeatable objective ${id}`);
      for (const i of n.owners) for (const text of warnings(n.record)) reason(i, text);
      // Evidence uncertainty survives manual completion; completed costs do not.
      if (done(profile, id)) continue;
      const first = Math.min(...n.owners); expand(n, new Map([[first * 2, 1]])); continue;
    }
    if (!n.demand.size && !n.retained.size && !n.forced.size) continue;
    const owned = profile.inventory[id] || 0, reserved = profile.reserves[id] || 0, available = Math.max(0, owned - reserved);
    const retained = Math.max(0, ...n.retained.values());
    const retainedMissing = Math.max(0, retained - available);
    let stock = Math.max(0, available - retained), consumed = 0, allocated = 0, produced = 0, rootDemand = 0;
    const parts = new Map(), craftNeed = new Map();
    for (const [s, q] of slots(n.demand)) {
      const a = Math.min(q, stock); stock -= a; consumed = add(consumed, q); allocated = add(allocated, a);
      parts.set(s, { demand: q, allocated: a, missing: q - a, retainedMissing: 0 }); put(craftNeed, s, q - a);
    }
    for (const [s, q] of slots(n.forced)) { put(craftNeed, s, q); rootDemand = add(rootDemand, q); }
    if (retainedMissing) {
      // A shared floor is counted once, owned stock is protected before consumption.
      const s = slots(n.retained)[0][0]; const p = parts.get(s) || { demand: 0, allocated: 0, missing: 0, retainedMissing: 0 };
      p.retainedMissing = retainedMissing; parts.set(s, p); put(craftNeed, s, retainedMissing);
    }
    const batchParts = new Map(); let cumulative = 0, batches = 0;
    if (n.record) for (const [s, q] of slots(craftNeed)) {
      cumulative = add(cumulative, q); const next = Math.ceil(cumulative / n.record.output.quantity);
      if (next > batches) batchParts.set(s, next - batches); batches = next;
    }
    if (n.record) { produced = mul(batches, n.record.output.quantity); if (batches) expand(n, batchParts); }
    const perGoal = goals.map((g, i) => {
      tick(); const ps = [parts.get(i * 2), parts.get(i * 2 + 1)].filter(Boolean);
      return { goalId: g.id, demand: ps.reduce((v, p) => add(v, p.demand), 0), allocated: ps.reduce((v, p) => add(v, p.allocated), 0), missing: ps.reduce((v, p) => add(v, p.missing), 0), retainedMissing: ps.reduce((v, p) => add(v, p.retainedMissing), 0) };
    }).filter((p, i) => p.demand || p.retainedMissing || n.forced.has(i * 2));
    const row = { id, name: n.item.name, unit: n.item.unit, owned, reserved, consumed, demand: consumed, retained, allocated, missing: consumed - allocated, retainedMissing, produced, rootDemand, rootReserved: rootDemand, surplus: Math.max(0, produced - cumulative), perGoal };
    ledger.push(row);
    if (!n.record) for (const [s, p] of parts) if (p.missing || p.retainedMissing) goals[Math.floor(s / 2)][s % 2 ? 'collectLater' : 'collectNow'].push({ id, name: n.item.name, unit: n.item.unit, missing: p.missing, retainedMissing: p.retainedMissing });
  }

  const floors = new Map(ledger.map(r => [r.id, r.retained]));
  let stock = new Map([...items.keys()].map(id => [id, Math.max(0, (profile.inventory[id] || 0) - (profile.reserves[id] || 0))]));
  let fresh = new Map(), delivered = new Map();
  let completed = new Set([...objectives.keys()].filter(id => done(profile, id)));
  const protectedStock = new Map(), schedule = [];
  class Blocked extends Error {}
  const block = message => { throw new Blocked(message); };
  for (let i = 0; i < goals.length; i++) {
    const g = goals[i], trial = new Map(stock), finished = new Set(completed), trialFresh = new Map(fresh), actions = [], audited = new Set();
    // Strict mode hides only actually held allocations reserved by failed earlier goals.
    for (const [id, q] of protectedStock) trial.set(id, Math.max(0, (trial.get(id) || 0) - q));
    const rootOutput = g.record.output;
    // Only newly produced, unclaimed surplus can satisfy an additional-output goal.
    const rootMissing = rootOutput ? Math.max(0, g.quantity - (trialFresh.get(rootOutput.itemId) || 0)) : 1;
    const tasks = rootMissing ? [{ type: 'record', r: g.record, batches: rootOutput ? Math.ceil(rootMissing / rootOutput.quantity) : 1, phase: 0 }] : [];
    let failure;
    try {
      while (tasks.length) {
        tick(); const f = tasks.at(-1);
        if (f.type === 'audit') {
          tasks.pop(); if (audited.has(f.id)) continue; audited.add(f.id);
          const r = objectives.get(f.id), uncertain = warnings(r); if (uncertain.length) block(uncertain.join('; '));
          for (const id of r.prerequisites) tasks.push({ type: 'audit', id });
          continue;
        }
        if (f.type === 'ensure') {
          const held = trial.get(f.id) || 0;
          if (held >= f.quantity) { tasks.pop(); continue; }
          if (f.attempted) block(`Insufficient ${items.get(f.id).name || f.id}`);
          const r = routes.get(f.id); if (!r) block(`Collect ${f.quantity - held} ${items.get(f.id).name || f.id}`);
          f.attempted = true; tasks.push({ type: 'record', r, batches: Math.ceil((f.quantity - held) / r.output.quantity), phase: 0 }); continue;
        }
        const r = f.r;
        if (f.phase === 0) {
          const uncertain = warnings(r); if (uncertain.length) block(uncertain.join('; '));
          if (!r.output && finished.has(r.id)) { tasks.pop(); tasks.push({ type: 'audit', id: r.id }); continue; }
          f.phase = 1; f.next = 0;
        }
        if (f.phase === 1) {
          if (f.next < r.prerequisites.length) { const p = objectives.get(r.prerequisites[f.next++]); tasks.push({ type: 'record', r: p, batches: 1, phase: 0 }); continue; }
          const costs = new Map();
          for (const c of r.inputs || r.requirements) {
            const cost = costs.get(c.itemId) || { id: c.itemId, consumed: 0, retained: 0 };
            if (c.consumed) cost.consumed = add(cost.consumed, mul(c.quantity, f.batches)); else cost.retained = Math.max(cost.retained, c.quantity);
            costs.set(c.itemId, cost);
          }
          f.costs = [...costs.values()]; f.next = 0; f.phase = 2;
        }
        if (f.phase === 2 && f.next < f.costs.length) {
          const c = f.costs[f.next];
          const need = add(c.consumed, Math.max(c.retained, floors.get(c.id) || 0));
          if (!f.ensured) { f.ensured = true; tasks.push({ type: 'ensure', id: c.id, quantity: need }); continue; }
          if ((trial.get(c.id) || 0) < need) block(`Insufficient ${items.get(c.id).name || c.id}`);
          const newlyMade = trialFresh.get(c.id) || 0;
          const oldHeld = Math.max(0, trial.get(c.id) - newlyMade);
          trialFresh.set(c.id, Math.max(0, newlyMade - Math.max(0, c.consumed - oldHeld)));
          trial.set(c.id, trial.get(c.id) - c.consumed); f.next++; f.ensured = false; continue;
        }
        if (r.output) {
          const q = mul(r.output.quantity, f.batches);
          trial.set(r.output.itemId, add(trial.get(r.output.itemId) || 0, q));
          trialFresh.set(r.output.itemId, add(trialFresh.get(r.output.itemId) || 0, q));
        }
        else finished.add(r.id);
        actions.push({ id: r.id, name: r.name, type: r.output ? 'craft' : 'objective', batches: f.batches, ...(r.output ? { output: { itemId: r.output.itemId, quantity: mul(r.output.quantity, f.batches) } } : {}) });
        tasks.pop();
      }
    } catch (error) { if (!(error instanceof Blocked)) throw error; failure = error.message; }
    if (!failure) {
      if (rootOutput) {
        const id = rootOutput.itemId;
        assert((trialFresh.get(id) || 0) >= g.quantity && (trial.get(id) || 0) >= g.quantity, 'Additional root output conservation failure');
        trial.set(id, trial.get(id) - g.quantity);
        trialFresh.set(id, trialFresh.get(id) - g.quantity);
        delivered.set(id, add(delivered.get(id) || 0, g.quantity));
      }
      for (const [id, q] of protectedStock) trial.set(id, add(trial.get(id) || 0, q));
      stock = trial; fresh = trialFresh; completed = finished;
    } else if (mode === 'strict') {
      for (const row of ledger) {
        const q = row.perGoal.find(p => p.goalId === g.id)?.allocated || 0;
        const old = protectedStock.get(row.id) || 0;
        protectedStock.set(row.id, Math.min(stock.get(row.id) || 0, add(old, q)));
      }
    }
    schedule.push({ goalId: g.id, executable: !failure, reasons: failure ? [failure] : [], actions: failure ? [] : actions, ...(!failure && rootOutput ? { delivered: { itemId: rootOutput.itemId, quantity: g.quantity } } : {}) });
  }
  const remainingInventory = Object.fromEntries(stock);
  for (const [id, q] of delivered) remainingInventory[id] = add(remainingInventory[id] || 0, q);
  return { ledger, goals: goals.map(({ record, ...g }) => g), schedule, mode, contentVersion: pack.contentVersion, profileRevision: profile.revision, versions: { schema: 1, content: pack.contentVersion, profileRevision: profile.revision }, remainingInventory, completedObjectives: [...completed], work };
}
