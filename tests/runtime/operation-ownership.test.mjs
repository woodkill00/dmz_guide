import test from "node:test";
import assert from "node:assert/strict";
import {
  createOperationOwnership,
  routeBindingMatches,
} from "../../src/ui/operation-ownership.mjs";

const context = (change = {}) => ({
  workspace: "map",
  pack: "pack-a",
  profile: "profile-a",
  revision: 7,
  ...change,
});
const departure = (target = "route") => ({
  kind: "task",
  target,
  originTask: "layers",
  focusKey: "layer-switch",
});
const harness = () => {
  let time = 100;
  const owner = createOperationOwnership({
    ownerId: "synthetic-owner",
    context: context(),
    now: () => time,
  });
  return {
    owner,
    advance: (ms) => {
      time += ms;
    },
  };
};
const verified = {
  verifyReceipt: (receipt, ticket) =>
    receipt.operationId === ticket.id && receipt.revision === 8,
  validateDestination: (intent) => intent.target === "route",
};

// Synthetic observers only: no storage, DOM, timers or domain writes.
test("071 operation owner freezes captured identity and refuses forged/foreign tickets", () => {
  const { owner } = harness(),
    ticket = owner.begin({ kind: "search", phase: "reading" });
  assert(Object.isFrozen(ticket));
  assert(Object.isFrozen(ticket.context));
  assert.equal(ticket.context.revision, 7);
  assert.equal(owner.canPublish(ticket), true);
  assert.equal(owner.canPublish({ ...ticket }), false);
  const other = harness().owner;
  assert.equal(other.canPublish(ticket), false);
});
test("071 newer read supersedes old read without allowing old result or focus to publish", () => {
  const { owner } = harness(),
    a = owner.begin({ kind: "search", phase: "reading" }),
    b = owner.begin({ kind: "search", phase: "reading" });
  assert.equal(owner.canPublish(a), false);
  assert.equal(owner.canPublish(b), true);
  assert.equal(owner.settle(a, { outcome: "confirmed" }).accepted, false);
  assert.equal(owner.settle(b, { outcome: "confirmed" }).publish, true);
  assert.equal(owner.settle(b, { outcome: "confirmed" }).accepted, false);
});
test("071 pack/profile/revision/workspace and draft changes invalidate UI without restoring domain data", () => {
  for (const delta of [
    { pack: "pack-b" },
    { profile: "profile-b" },
    { revision: 8 },
    { workspace: "safe-runs" },
  ]) {
    const { owner } = harness(),
      ticket = owner.begin({ kind: "search", phase: "reading" });
    owner.setContext(context(delta));
    assert.equal(owner.canPublish(ticket), false);
  }
  const { owner } = harness(),
    ticket = owner.begin({ kind: "save", phase: "preparing" });
  owner.invalidate({ draft: true });
  assert.equal(owner.canPublish(ticket), false);
  assert.equal(owner.snapshot().draftGeneration, 1);
});
test("071 newer user focus prevents only stale focus effects while current data results remain eligible", () => {
  const { owner } = harness(),
    ticket = owner.begin({ kind: "search", phase: "reading" });
  owner.focusChanged();
  assert.equal(owner.canPublish(ticket), true);
  assert.equal(owner.canPublish(ticket, { focus: true }), false);
});
test("071 first departure is frozen; modified/new-tab navigation does not replace current intent", () => {
  const { owner } = harness(),
    first = owner.requestDeparture(departure());
  assert(Object.isFrozen(first));
  assert.equal(first.context.revision, 7);
  assert.equal(owner.requestDeparture(departure("search")), first);
  assert.equal(
    owner.requestDeparture(departure("new-tab"), { modified: true }),
    null,
  );
  assert.equal(owner.snapshot().pendingIntent, first);
});
test("071 Stay clears navigation intent only and does not cancel operation or discard draft generation", () => {
  const { owner } = harness();
  owner.invalidate({ draft: true });
  const ticket = owner.begin({ kind: "save", phase: "preparing" });
  owner.requestDeparture(departure());
  owner.stay();
  assert.equal(owner.snapshot().pendingIntent, null);
  assert.equal(owner.snapshot().draftGeneration, 1);
  assert.equal(owner.canPublish(ticket), true);
  assert.equal(owner.snapshot().operation.phase, "preparing");
});
test("071 preparation cancellation requests actual capability once; it never claims a rolled-back write", () => {
  let calls = 0;
  const { owner } = harness(),
    ticket = owner.begin({
      kind: "prepare",
      phase: "preparing",
      cancel: () => {
        calls++;
      },
    });
  assert.equal(owner.requestCancel(ticket), true);
  assert.equal(owner.requestCancel(ticket), false);
  assert.equal(calls, 1);
  assert.equal(owner.snapshot().operation.phase, "preparing");
  assert.equal(owner.snapshot().operation.cancelRequested, true);
  assert.equal(owner.canPublish(ticket), false);
  const without = harness().owner,
    t = without.begin({ kind: "prepare", phase: "preparing" });
  assert.equal(without.requestCancel(t), false);
});
test("071 committing cannot be cancelled, replaced or restarted; disposing UI never aborts commit", () => {
  let calls = 0;
  const { owner } = harness(),
    ticket = owner.begin({
      kind: "save",
      phase: "preparing",
      cancel: () => {
        calls++;
      },
    });
  assert.equal(owner.commit(ticket), true);
  assert.equal(owner.requestCancel(ticket), false);
  assert.throws(
    () => owner.begin({ kind: "save", phase: "preparing" }),
    /commit|unconfirmed|pending/i,
  );
  owner.dispose();
  assert.equal(calls, 0);
  assert.equal(owner.canPublish(ticket), false);
  assert.equal(owner.snapshot().operation.phase, "committing");
});
test("071 observer flags ten-second unconfirmed wait without confirming/failing/replaying domain operation", () => {
  const { owner, advance } = harness(),
    ticket = owner.begin({ kind: "save", phase: "preparing" });
  owner.commit(ticket);
  advance(9999);
  assert.equal(owner.observe(ticket).slow, false);
  advance(1);
  const view = owner.observe(ticket);
  assert.equal(view.slow, true);
  assert.equal(view.phase, "committing");
  assert.equal(view.outcome, "unconfirmed");
  assert.equal(owner.snapshot().operation.phase, "committing");
  assert.equal(owner.snapshot().pendingIntent, null);
});
test("071 only verified durable receipt confirms commit; valid frozen destination is returned once, not executed", () => {
  const { owner } = harness(),
    ticket = owner.begin({ kind: "save", phase: "preparing" });
  owner.requestDeparture(departure());
  owner.commit(ticket);
  assert.equal(
    owner.settle(
      ticket,
      {
        outcome: "confirmed",
        receipt: { operationId: ticket.id, revision: 99 },
      },
      verified,
    ).accepted,
    false,
  );
  assert.equal(owner.snapshot().operation.phase, "committing");
  const result = owner.settle(
    ticket,
    { outcome: "confirmed", receipt: { operationId: ticket.id, revision: 8 } },
    verified,
  );
  assert.equal(result.accepted, true);
  assert.equal(result.publish, true);
  assert.equal(result.navigate.target, "route");
  assert.equal(owner.snapshot().pendingIntent, null);
  assert.equal(
    owner.settle(
      ticket,
      {
        outcome: "confirmed",
        receipt: { operationId: ticket.id, revision: 8 },
      },
      verified,
    ).accepted,
    false,
  );
});
test("071 failed and unknown outcomes retain frozen destination; unknown commit forbids blind retry but permits real reconciliation", () => {
  const failed = harness().owner,
    a = failed.begin({ kind: "save", phase: "preparing" });
  failed.requestDeparture(departure());
  failed.commit(a);
  const failure = failed.settle(a, { outcome: "failed" });
  assert.equal(failure.navigate, null);
  assert.equal(failed.snapshot().pendingIntent.target, "route");
  const { owner } = harness(),
    ticket = owner.begin({ kind: "save", phase: "preparing" });
  owner.requestDeparture(departure());
  owner.commit(ticket);
  assert.equal(owner.settle(ticket, { outcome: "unconfirmed" }).navigate, null);
  assert.equal(owner.snapshot().pendingIntent.target, "route");
  assert.throws(
    () => owner.begin({ kind: "save", phase: "preparing" }),
    /commit|unconfirmed|pending/i,
  );
  assert.equal(owner.requestCancel(ticket), false);
  assert.equal(
    owner.settle(
      ticket,
      {
        outcome: "confirmed",
        receipt: { operationId: ticket.id, revision: 8 },
      },
      verified,
    ).navigate.target,
    "route",
  );
});
test("071 unavailable destination after confirmed receipt stays with explanation instead of substitute navigation", () => {
  const { owner } = harness(),
    ticket = owner.begin({ kind: "save", phase: "preparing" });
  owner.requestDeparture(departure("removed"));
  owner.commit(ticket);
  const result = owner.settle(
    ticket,
    { outcome: "confirmed", receipt: { operationId: ticket.id, revision: 8 } },
    verified,
  );
  assert.equal(result.accepted, true);
  assert.equal(result.navigate, null);
  assert.equal(result.reason, "destination-unavailable");
});
test("071 receipt reconciliation after context/draft departure or dispose cannot publish or navigate stale UI", () => {
  for (const invalidate of [
    (owner) => owner.setContext(context({ profile: "new-profile" })),
    (owner) => owner.invalidate({ draft: true }),
    (owner) => owner.dispose(),
  ]) {
    const { owner } = harness(),
      ticket = owner.begin({ kind: "save", phase: "preparing" });
    owner.requestDeparture(departure());
    owner.commit(ticket);
    invalidate(owner);
    const result = owner.settle(
      ticket,
      {
        outcome: "confirmed",
        receipt: { operationId: ticket.id, revision: 8 },
      },
      verified,
    );
    assert.equal(result.accepted, true);
    assert.equal(result.publish, false);
    assert.equal(result.navigate, null);
  }
});
test("071 failed reads do not erase newer feedback ownership; dispose requests only supported preparation abort", () => {
  let cancelled = 0;
  const { owner } = harness(),
    old = owner.begin({ kind: "search", phase: "reading" });
  owner.begin({
    kind: "prepare",
    phase: "preparing",
    cancel: () => {
      cancelled++;
    },
  });
  assert.equal(owner.settle(old, { outcome: "failed" }).accepted, false);
  owner.dispose();
  assert.equal(cancelled, 1);
  owner.dispose();
  assert.equal(cancelled, 1);
});
test("071 route binding validates exact route revision and stable waypoint inside caller-owned mutation boundary", () => {
  const binding = {
      routeId: "route-a",
      expectedRevision: 7,
      waypointToken: "stop-a",
      action: "reached",
    },
    current = {
      routeId: "route-a",
      revision: 7,
      waypointTokens: ["stop-a", "stop-b"],
    };
  assert.equal(routeBindingMatches(binding, current), true);
  for (const delta of [
    { routeId: "route-b" },
    { revision: 8 },
    { waypointTokens: ["stop-b"] },
  ])
    assert.equal(routeBindingMatches(binding, { ...current, ...delta }), false);
  assert.equal(
    routeBindingMatches(binding, {
      ...current,
      roadState: "failed",
      selectedMarker: "unrelated",
    }),
    true,
    "road state and inspected marker do not authorize manual progress",
  );
  assert.equal(
    routeBindingMatches(
      { ...binding, action: "undo", priorActionId: "action-a" },
      { ...current, lastActionId: "action-b" },
    ),
    false,
  );
  assert.equal(
    routeBindingMatches(
      { ...binding, action: "undo", priorActionId: "action-a" },
      { ...current, lastActionId: "action-a" },
    ),
    true,
  );
});
test("071 malformed context/generation inputs and unsupported transitions fail closed", () => {
  assert.throws(() =>
    createOperationOwnership({ ownerId: "", context: context() }),
  );
  assert.throws(() =>
    createOperationOwnership({
      ownerId: "synthetic",
      context: context({ revision: NaN }),
    }),
  );
  const { owner } = harness(),
    ticket = owner.begin({ kind: "search", phase: "reading" });
  assert.equal(owner.commit(ticket), false);
  assert.throws(() => owner.begin({ kind: "save", phase: "confirmed" }));
  assert.equal(
    routeBindingMatches(
      {
        routeId: "a",
        expectedRevision: NaN,
        waypointToken: "b",
        action: "reached",
      },
      { routeId: "a", revision: NaN, waypointTokens: ["b"] },
    ),
    false,
  );
});

test("071 read/preparation success cannot consume or fulfill a dirty departure", () => {
  for (const phase of ["reading", "preparing"]) {
    const { owner } = harness(),
      ticket = owner.begin({ kind: "search", phase });
    const first = owner.requestDeparture(departure());
    const result = owner.settle(
      ticket,
      { outcome: "confirmed" },
      { validateDestination: () => true },
    );
    assert.equal(result.accepted, true);
    assert.equal(result.navigate, null);
    assert.equal(owner.snapshot().pendingIntent, first);
  }
});
test("071 missing, throwing or async receipt verifiers never confirm a durable write", () => {
  for (const verifyReceipt of [
    undefined,
    () => {
      throw new Error("Synthetic invalid receipt");
    },
    () => Promise.resolve(true),
  ]) {
    const { owner } = harness(),
      ticket = owner.begin({ kind: "save", phase: "preparing" });
    owner.commit(ticket);
    const result = owner.settle(
      ticket,
      { outcome: "confirmed", receipt: {} },
      { verifyReceipt },
    );
    assert.equal(result.accepted, false);
    assert.equal(owner.snapshot().operation.phase, "committing");
  }
});
test("071 clocks and captured mutable context cannot alter already issued tickets", () => {
  const source = context(),
    owner = createOperationOwnership({
      ownerId: "synthetic",
      context: source,
      now: () => 1,
    }),
    ticket = owner.begin({ kind: "read" });
  source.profile = "mutated";
  assert.equal(ticket.context.profile, "profile-a");
  assert.throws(() =>
    createOperationOwnership({
      ownerId: "synthetic",
      context: context(),
      now: () => NaN,
    }).begin({ kind: "read" }),
  );
});
