import { authorPath } from "../content/author-target.mjs";
import { escapeHTML as e, publicTitle, recordUrl } from "./render.mjs";

export const guidancePath = (key, id) =>
  `/contribute/${encodeURIComponent(key)}/${encodeURIComponent(id).replace(/%3A/gi, "--")}/`;
export function renderAuthorActions(record, { edit, images }) {
  return `<aside class="record-author-actions" aria-label="Repository editing"><a class="button" data-edit-record href="${e(edit)}">${record.recordType === "item" ? "Edit this item" : "Edit this record"}</a><a class="button" data-edit-images href="${e(images)}">Add/change image</a><p>Local Content Studio · review and save to your repository, not your private player profile.</p></aside>`;
}
export function renderAuthorGuidance(record, packKey) {
  const target = { packKey, packId: record.pack.id, id: record.id };
  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${e(recordUrl(record))}">Return to record</a></nav><h1>Edit ${e(publicTitle(record))}</h1><p class="lede">This website is read-only. Edit this record in your own local source checkout using Content Studio.</p><section class="panel"><h2>Start your local Content Studio</h2><ol><li>Use a current writable source checkout of DMZ Guide, not the static ZIP. Keep unrelated changes safe when updating it.</li><li>With Node.js 22 or newer, open a terminal in the repository folder and run <code>npm ci</code>, then <code>npm run author</code>.</li><li>Leave the terminal running. Once it prints the local Studio address, choose an action below. These links use the default port 4174; they do not check whether your server is running.</li></ol><p>No public content changes until you explicitly save repository files, rebuild, review and share them through Git. No account or private profile import is needed.</p><dl><dt>Catalog</dt><dd>${e(record.pack.id)} (${e(packKey)})</dd><dt>Stable record ID</dt><dd>${e(record.id)}</dd></dl></section>${[
    "edit",
    "images",
  ]
    .map((intent) => {
      const path = authorPath({ ...target, intent });
      return `<section class="panel" id="${intent}"><h2>${intent === "edit" ? "Edit this record" : "Add or change its pictures"}</h2><p>${intent === "edit" ? "Opens the matching saved record and its guided fields." : "Opens this record at the picture controls. Replace its primary image or add more pictures; other records keep their existing images. Use only pictures you may redistribute."}</p><a class="button primary" data-open-local="${intent}" href="${e("http://127.0.0.1:4174" + path)}" rel="noreferrer">Open ${intent === "edit" ? "this record" : "picture controls"} in local Content Studio ↗</a><details><summary>Using a different port, or link did not open?</summary><p>Start the author server first. For a custom port, append this exact destination to the local address printed by your server (replace its trailing slash). Do not use a public or shared server.</p><code class="author-destination">${e(path)}</code><p>If the catalog or record is missing, update the source checkout. The editor will not substitute another record.</p></details></section>`;
    })
    .join("")}`;
}
