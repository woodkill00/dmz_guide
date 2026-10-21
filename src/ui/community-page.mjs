const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function featurePages(packs) {
  return [
    {
      path: "/community/",
      title: "Community corrections",
      page: "community",
      scripts: ["/assets/src/client/community.mjs"],
      body: `<header class="page-heading"><p class="eyebrow">CONTRIBUTE WITH EVIDENCE</p><h1>Make the next answer better.</h1><p>Prepare a correction, review evidence, and export it for human review. Nothing here uploads or publishes automatically.</p></header><label>Content pack<select id="pack-select">${packs.map((p) => `<option value="${esc(p.id)}">${esc(p.title)}</option>`).join("")}</select></label><p id="pack-note" class="notice"></p><p id="save-status" role="status"></p><p id="error" role="alert" tabindex="-1" hidden></p><section class="panel"><h2>Community destination</h2><p id="discord-status">No Discord invite configured. Reading and contributing drafts do not require Discord.</p></section><section class="panel"><h2>Draft a correction</h2><p>Use public game facts and rights-cleared text only. Do not include player names, private inventory, account data or screenshots. This draft is not saved automatically; export before leaving.</p><form id="correction-form"><label>Record<select id="correction-record"></select></label><label>Field name<input id="correction-field" required maxlength="100" value="description"></label><label>Current value<textarea id="correction-current" maxlength="8000"></textarea></label><label>Proposed value<textarea id="correction-proposed" required maxlength="8000"></textarea></label><label>Reason and uncertainty<textarea id="correction-reason" required maxlength="2000"></textarea></label><label>Public evidence URL<input id="correction-evidence" type="url" required maxlength="2000"></label><label>Attribution<input id="correction-attribution" required maxlength="500"></label><label>Rights / license<input id="correction-rights" required maxlength="500"></label><button type="submit">Preview correction</button></form><div id="correction-preview" hidden><h3>Exact export preview</h3><pre id="correction-json"></pre><button id="export-correction">Export correction JSON</button><button id="cancel-correction">Cancel preview</button></div></section><section class="panel"><h2>Review a correction locally</h2><p>Review labels are self-reported, not authenticated. Approval does not change a pack or publish anything. Apply accepted changes deliberately in the editor, export the pack and submit a normal repository pull request.</p><label>Correction JSON (256 KiB maximum)<input id="review-file" type="file" accept="application/json,.json"></label><div id="review-stage" hidden><p id="review-context" class="notice"></p><pre id="review-json"></pre><form id="review-form"><label>Decision<select id="review-decision"><option value="needs-evidence">Needs evidence</option><option value="approved">Approved locally</option><option value="rejected">Rejected</option></select></label><label>Reviewer label<input id="reviewer" required maxlength="200"></label><label>Review notes<textarea id="review-notes" required maxlength="2000"></textarea></label><button type="submit">Export reviewed packet</button><button id="cancel-review" type="button">Cancel review</button></form></div></section>`,
    },
  ];
}
