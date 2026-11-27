const e = (v) =>
  String(v).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function qualityRow(row) {
  return `<tr data-quality-id="${e(row.id)}"><th scope="row"><a href="${e(row.readerURL)}">${e(row.title)}</a><small>${e(row.kind)} · ${e(row.packId)}</small></th><td>${e(row.field)}<p>${e(row.message)}</p></td><td><label><span class="sr-only">Review ${e(row.title)} · ${e(row.field)}</span><select data-quality-state disabled><option value="pending">Not checked</option><option value="later">Fill later</option><option value="checked">Checked</option></select></label><small data-review-stale hidden>Record or source changed</small></td><td><a href="${e(row.editorURL)}">Edit exact record ↗</a></td></tr>`;
}
