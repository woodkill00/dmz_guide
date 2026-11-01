const $ = (s) => document.querySelector(s),
  e = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
let session = null,
  state = null,
  busy = false;
let busyPoll = null;
const error = (reason) => {
  $("#manager-error").hidden = false;
  $("#manager-error").textContent = reason.message || String(reason);
};
function buttons() {
  if (state?.busy && !busy && !busyPoll)
    busyPoll = setTimeout(() => {
      busyPoll = null;
      if (!busy) refresh().catch(error);
    }, 1000);
  const blocked =
    busy ||
    state?.busy ||
    !session ||
    Date.now() >= session.expiresAt ||
    state?.locked;
  $("#manager-check").disabled = blocked || state?.pendingRollback;
  $("#manager-build").disabled = blocked || state?.pendingRollback;
  $("#manager-apply").disabled =
    blocked ||
    state?.pendingRollback ||
    !state?.proposal ||
    !$("#manager-review").checked;
  $("#manager-rollback").disabled =
    blocked ||
    !(state?.backupAvailable || state?.pendingRollback) ||
    !$("#manager-rollback-review").checked;
  $("#manager-refresh").disabled = busy;
  const cod = state?.codmunity;
  $("#codmunity-check").disabled = blocked || cod?.locked;
  $("#codmunity-probe").disabled = blocked || cod?.locked;
  $("#codmunity-apply").disabled =
    blocked ||
    cod?.locked ||
    !cod?.proposal ||
    cod.proposal.stale ||
    cod.proposal.unchanged ||
    !$("#codmunity-review").checked;
}
window.addEventListener("pagehide", () => clearTimeout(busyPoll));
function render() {
  if (!state) return;
  $("#manager-summary").innerHTML =
    `<dt>Revision</dt><dd><code>${e(state.revision)}</code></dd><dt>Coverage</dt><dd>${state.weapons} weapons · ${state.attachments} attachments · ${state.reports} patch reports</dd><dt>Source dates</dt><dd>${e(
      Object.entries(state.sourceDates)
        .map(([k, v]) => k + ": " + v)
        .join(" · "),
    )}</dd><dt>Last check</dt><dd>${e(state.receipt?.lastCheck?.time || "Not checked by this dashboard yet")} · ${e(state.receipt?.lastCheck?.result || "unknown")}</dd><dt>Last operation</dt><dd>${e(state.receipt?.lastOperation ? `${state.receipt.lastOperation.action} · ${state.receipt.lastOperation.result} · ${state.receipt.lastOperation.time}` : "None recorded")}</dd><dt>Recovery</dt><dd>${state.locked ? "Writer lock exists: inspect before continuing." : state.pendingRollback ? "Interrupted rollback target retained; explicitly resume." : "No pending writer/rollback lock."} Backup ${state.backupAvailable ? "available" : "not available"}.</dd>`;
  const proposal = state.proposal;
  const cod = state.codmunity;
  $("#codmunity-review").checked = false;
  if (cod) {
    const monitor = cod.monitor;
    $("#codmunity-status").innerHTML =
      `<p>Accepted MW4: ${cod.coverage.mw4.weapons}/${cod.coverage.mw4.total} weapons; ${cod.coverage.mw4.damage}/${cod.coverage.mw4.total} damage profiles. Accepted DMZ: ${cod.coverage.dmz.damage}/${cod.coverage.dmz.total} damage profiles (${e(cod.coverage.dmz.status)}).</p><p>Background DMZ probe: ${state.monitorPolicy?.enabled ? `startup and every ${e(state.monitorPolicy.intervalHours)} hours while this service runs` : "disabled for this service"}. Latest source check / probe attempt: ${e(monitor?.latestAttempt || "none")}. ${monitor?.error ? `Failed — ${e(monitor.error)}; previous successful result below is stale.` : ""}</p><p>Last successful DMZ probe: ${e(monitor?.lastSuccess?.time || "none")} · ${e(monitor?.lastSuccess?.result?.coverage?.status || "not checked")} · ${e(monitor?.lastSuccess?.result?.warning || "")}</p>`;
    $("#codmunity-proposal").innerHTML = cod.proposal
      ? `<p>${cod.proposal.stale ? "Stale proposal: check again before applying." : cod.proposal.unchanged ? "No normalized fact changes; no apply needed." : "Changes require review."}</p><p>Reviewed hash: <code>${e(cod.proposal.hash)}</code></p><pre class="cod-review" tabindex="0">${e(JSON.stringify(cod.proposal.diff, null, 2))}</pre><details><summary>Inspect exact prior and proposed source values</summary><pre class="cod-review" tabindex="0">${e(JSON.stringify({ accepted: cod.sources, proposed: cod.proposal.content?.modes }, null, 2))}</pre></details>`
      : "<p>No CODMunity proposal staged.</p>";
  }
  $("#manager-review").checked = false;
  $("#manager-rollback-review").checked = false;
  $("#manager-proposal").innerHTML = proposal
    ? `<p>${proposal.added.length} additions · ${proposal.changed.length} corrections · ${proposal.unchanged} unchanged.</p><p>Proposal hash: <code>${e(proposal.hash)}</code></p><p>Base revision: <code>${e(proposal.baseRevision)}</code></p><ul>${proposal.articles.map((url) => `<li><a href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(url)}</a></li>`).join("")}</ul><h3>Warnings requiring review</h3><ul>${proposal.warnings.map((w) => `<li>${e(w)}</li>`).join("") || "<li>No parser warnings.</li>"}</ul><div class="armory-table-wrap" role="region" aria-label="Proposed patch changes" tabindex="0"><table class="armory-table"><thead><tr><th>Change</th><th>Date / mode</th><th>Weapon / metric</th><th>Before → after</th></tr></thead><tbody>${[
        ["Add", proposal.added],
        ["Correct", proposal.changed],
      ]
        .flatMap(([label, rows]) =>
          rows.map(
            (r) =>
              `<tr><th scope="row">${label}</th><td>${e(r.date)} · ${e(r.mode)}</td><td>${e(r.variant)} · ${e(r.metric)}</td><td>${e(r.before)} → ${e(r.after)} (${e(r.unit)})</td></tr>`,
          ),
        )
        .join("")}</tbody></table></div>`
    : "<p>No staged proposal. Run an official check first.</p>";
  buttons();
}
async function request(path, body) {
  const r = await fetch(
    path,
    body
      ? {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Weapon-Token": session.token,
          },
          body: JSON.stringify(body),
        }
      : {},
  );
  const value = await r.json();
  if (!r.ok) throw new Error(value.message || "Local operation failed");
  return value;
}
async function refresh() {
  state = await request("/api/state");
  render();
}
async function run(action, fields = {}) {
  if (busy) return;
  busy = true;
  buttons();
  $("#manager-error").hidden = true;
  $("#manager-status").textContent =
    `${action} is running. Wait for its recorded result; do not repeat the action.`;
  try {
    const result = await request("/api/action", { action, ...fields });
    await refresh();
    $("#manager-status").textContent = result.message || `${action} finished.`;
  } catch (reason) {
    error(reason);
    $("#manager-status").textContent =
      "Operation did not report success. Refresh and inspect current state before retrying.";
    try {
      await refresh();
    } catch {}
  } finally {
    busy = false;
    buttons();
  }
}
$("#manager-review").addEventListener("change", buttons);
$("#codmunity-review").addEventListener("change", buttons);
$("#codmunity-check").addEventListener("click", () => run("codmunity-check"));
$("#codmunity-probe").addEventListener("click", () => run("codmunity-monitor"));
$("#codmunity-apply").addEventListener("click", () => {
  if (state?.codmunity?.proposal && $("#codmunity-review").checked)
    run("codmunity-apply", { proposalHash: state.codmunity.proposal.hash });
});
$("#manager-rollback-review").addEventListener("change", buttons);
$("#manager-refresh").addEventListener("click", () => refresh().catch(error));
$("#manager-check").addEventListener("click", () => run("check"));
$("#manager-build").addEventListener("click", () => run("build"));
$("#manager-apply").addEventListener("click", () => {
  if (state?.proposal && $("#manager-review").checked)
    run("apply", { proposalHash: state.proposal.hash });
});
$("#manager-rollback").addEventListener("click", () => {
  if ($("#manager-rollback-review").checked)
    run("rollback", { expectedRevision: state.revision });
});
try {
  session = await request("/api/session");
  if (Date.now() >= session.expiresAt)
    throw new Error(
      "Restart the expired local manager service, then reload this page.",
    );
  await refresh();
  $("#manager-status").textContent = state.monitorPolicy?.enabled
    ? "Local dashboard ready. DMZ monitoring runs on startup and every six hours; applying data remains explicit."
    : "Local dashboard ready. Background monitoring is disabled in this service.";
  document.querySelector("main").dataset.managerReady = "true";
} catch (reason) {
  error(reason);
}
