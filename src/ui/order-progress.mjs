const e = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function orderCompletionCheck(
  key,
  label,
  { complete = false, partial = false, total = 1, readonly = false } = {},
) {
  return `<label class="order-completion"><input type="checkbox" data-order-complete="${e(key)}" aria-label="${partial ? "Partly done" : "Done"}: ${e(label)}"${complete ? " checked" : ""}${partial ? ' data-order-partial="true"' : ""}${!total || readonly ? " disabled data-order-readonly" : ""}><span>${partial ? "Partly done" : "Done"}</span></label>`;
}
export function hydrateOrderChecks(root) {
  for (const control of root.querySelectorAll("[data-order-complete]"))
    control.indeterminate = control.hasAttribute("data-order-partial");
}
