import { init, state, $, esc, error, persist, status } from "./common.mjs";
import { planShared } from "../domain/shared-plan.mjs";
let mode = "strict";
function records() {
  return [...state.pack.recipes, ...state.pack.objectives].filter(
    (r) => r.track !== "campaign" && (!r.spoiler || state.profile.spoilers),
  );
}
function render() {
  const all = records();
  $("#goal-select").innerHTML =
    '<option value="">Choose a goal</option>' +
    all
      .map((r) => `<option value="${esc(r.id)}">${esc(r.name)}</option>`)
      .join("");
  const requested = new URL(location.href).searchParams.get("goal");
  if (requested && all.some((r) => r.id === requested))
    $("#goal-select").value = requested;
  $("#goals-list").innerHTML =
    state.profile.goals
      .map(
        (g, i) =>
          `<li class="panel"><strong>${i + 1}. ${esc(allName(g.id))}</strong><label>Additional output quantity<input data-goal-quantity="${esc(g.id)}" type="number" min="1" max="1000000" value="${g.quantity}"></label><div class="actions"><button data-move="${i}" data-delta="-1" ${i === 0 ? "disabled" : ""} aria-label="Move ${esc(allName(g.id))} up">Move up</button><button data-move="${i}" data-delta="1" ${i === state.profile.goals.length - 1 ? "disabled" : ""} aria-label="Move ${esc(allName(g.id))} down">Move down</button><button data-remove="${esc(g.id)}">Remove goal</button></div></li>`,
      )
      .join("") || "<li>No goals yet. Add a goal above.</li>";
  const outputs = [...new Set(state.pack.recipes.map((r) => r.output.itemId))];
  $("#route-fields").innerHTML = outputs
    .map(
      (id) =>
        `<label>${esc(state.pack.items.find((r) => r.id === id)?.name || id)}<select data-route="${esc(id)}"><option value="">Collect raw item (no craft expansion)</option>${state.pack.recipes
          .filter((r) => r.output.itemId === id)
          .map(
            (r) =>
              `<option value="${esc(r.id)}" ${state.profile.routes[id] === r.id ? "selected" : ""}>${esc(r.name)} · yield ${r.output.quantity}</option>`,
          )
          .join("")}</select></label>`,
    )
    .join("");
  renderPlan();
}
function safeText(value) {
  let text = String(value ?? "");
  if (!state.profile.spoilers)
    for (const r of [...state.pack.objectives, ...state.pack.guides].filter(
      (r) => r.spoiler,
    ))
      for (const name of [r.name, r.title].filter(Boolean))
        text = text.split(name).join("Spoiler-protected record");
  return text;
}
function renderPlan() {
  try {
    const p = planShared(state.pack, state.profile, { mode });
    $("#plan-output").innerHTML =
      `<section class="panel"><h2>Collect now / later</h2>${p.goals.map((g) => `<article><h3>${esc(safeText(g.name || allName(g.id)))}</h3><ul>${g.reasons.map((x) => `<li>${esc(safeText(x))}</li>`).join("")}</ul><p>Now: ${g.collectNow.map((x) => `${esc(x.name || x.id)} ${x.missing} consumed + ${x.retainedMissing || 0} retained (${esc(x.unit)})`).join(", ") || "No current shortage"}</p><p>Later: ${g.collectLater.map((x) => `${esc(x.name || x.id)} ${x.missing} consumed + ${x.retainedMissing || 0} retained (${esc(x.unit)})`).join(", ") || "No later shortage"}</p></article>`).join("")}</section><details class="panel"><summary>Full allocation and contingent-supply detail</summary><p class="eyebrow">SHARED REQUIREMENTS / NOT A GUARANTEE</p><h2>Your collection ledger</h2><p>Priority: ${mode === "strict" ? "strict reservations protect higher goals" : "work-conserving may use stock reserved for blocked higher goals"}. Projected surplus is not owned inventory. No profile stock is consumed.</p><div class="card-grid">${p.ledger.map((r) => `<article class="panel"><h3>${esc(r.name || r.id)}</h3><p>Unit ${esc(r.unit)} · owned ${r.owned} · protected ${r.reserved}</p><p>Consume ${r.consumed} · retain ${r.retained} · allocated ${r.allocated}</p><p><strong>Missing ${r.missing}</strong> · retained missing ${r.retainedMissing}</p><p>Projected produced ${r.produced || 0} · contingent surplus ${r.surplus || 0}</p><details><summary>Per-goal allocation</summary><ul>${r.perGoal.map((g) => `<li>${esc(allName(g.goalId))}: demand ${g.demand}, allocated ${g.allocated}, missing ${g.missing}</li>`).join("")}</ul></details></article>`).join("") || "<p>Add goals to calculate shared demand.</p>"}</div></details><section class="panel"><h2>Executable-now trial schedule</h2><p>This simulates whole goals against a copy of owned stock. Failed goals consume nothing.</p>${p.schedule.map((g) => `<article><h3>${esc(allName(g.goalId))}: ${g.executable ? "Executable in this manual model" : "Blocked"}</h3><ul>${g.reasons.map((x) => `<li>${esc(safeText(x))}</li>`).join("")}</ul><ol>${g.actions.map((a) => `<li>${esc(safeText(a.name || a.id))} · ${esc(a.type)} ${a.batches ?? ""}</li>`).join("")}</ol></article>`).join("")}</section>`;
  } catch (e) {
    $("#plan-output").textContent = e.message;
  }
}
function allName(id) {
  const r = [...state.pack.recipes, ...state.pack.objectives].find(
    (r) => r.id === id,
  );
  return r?.spoiler && !state.profile.spoilers
    ? "Spoiler-protected record"
    : r?.name || id;
}
$("#goal-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const id = $("#goal-select").value;
    if (!id) throw new Error("Choose a goal");
    if (state.profile.goals.some((g) => g.id === id))
      throw new Error(
        "This goal is already selected. Edit its quantity below.",
      );
    if (state.profile.goals.length >= 100)
      throw new Error("Maximum 100 goals. Remove one first.");
    const candidate = structuredClone(state.profile);
    candidate.goals.push({ id, quantity: Number($("#goal-quantity").value) });
    planShared(state.pack, candidate, { mode });
    state.profile = candidate;
    await persist();
    render();
  } catch (e) {
    error(e);
  }
});
$("#goals-list").addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const candidate = structuredClone(state.profile);
  if (b.dataset.remove)
    candidate.goals = candidate.goals.filter((g) => g.id !== b.dataset.remove);
  else if (b.dataset.move) {
    const i = Number(b.dataset.move),
      j = i + Number(b.dataset.delta);
    [candidate.goals[i], candidate.goals[j]] = [
      candidate.goals[j],
      candidate.goals[i],
    ];
  }
  state.profile = candidate;
  await persist();
  render();
});
$("#goals-list").addEventListener("change", async (e) => {
  if (!e.target.dataset.goalQuantity) return;
  try {
    const candidate = structuredClone(state.profile);
    candidate.goals.find(
      (g) => g.id === e.target.dataset.goalQuantity,
    ).quantity = Number(e.target.value);
    planShared(state.pack, candidate, { mode });
    state.profile = candidate;
    await persist();
    render();
  } catch (e) {
    error(e);
  }
});
$("#route-fields").addEventListener("change", async (e) => {
  if (!e.target.dataset.route) return;
  try {
    const candidate = structuredClone(state.profile);
    if (e.target.value)
      candidate.routes[e.target.dataset.route] = e.target.value;
    else delete candidate.routes[e.target.dataset.route];
    planShared(state.pack, candidate, { mode });
    state.profile = candidate;
    await persist();
    renderPlan();
  } catch (e) {
    error(e);
  }
});
$("#planning-mode").addEventListener("change", (e) => {
  mode = e.target.value;
  renderPlan();
});
init(render).catch(error);
