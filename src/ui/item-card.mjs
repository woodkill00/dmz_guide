// Pure item presentation. Images are admitted by inventory-icons; state changes
// remain with the page controller. Never pass HTML as a label, fact or note.
export const ITEM_CARD_SIZES = Object.freeze([
  "icon",
  "inline",
  "compact",
  "regular",
]);
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const sizeOf = (size, inherit = false) => {
  if (!ITEM_CARD_SIZES.includes(size) && !(inherit && size === "inherit"))
    throw Error("Unknown item-card size");
  return size;
};
const hidden = (item, reveal) => !!item?.spoiler && !reveal;
export function itemCardURL(packId, itemId) {
  return `/local/?pack=${encodeURIComponent(packId)}&id=${encodeURIComponent(itemId)}`;
}
export function renderItemIcon(
  item,
  {
    packId = item?.pack?.id,
    size = "inherit",
    className = "",
    tag = "span",
    decorative = false,
    reveal = false,
  } = {},
) {
  sizeOf(size, true);
  if (!["span", "div"].includes(tag)) throw Error("Invalid icon wrapper");
  const protectedItem = hidden(item, reveal);
  return `<${tag} class="${esc(className)} std-item-icon" data-item-size="${size}"${decorative ? ' aria-hidden="true"' : ""}${!protectedItem && item?.id ? ` data-inventory-icon="${esc(item.id)}"${packId ? ` data-icon-pack="${esc(packId)}"` : ""} data-icon-status="missing" title="Image needed"` : ""}><span aria-hidden="true">◇</span><small>${protectedItem ? "Protected" : "No image"}</small></${tag}>`;
}
export function renderItemIdentity(
  item,
  {
    packId = item?.pack?.id,
    size = "regular",
    name = item?.name,
    reveal = false,
    iconClass = "",
    classes = {},
  } = {},
) {
  sizeOf(size);
  const label = hidden(item, reveal) ? "Protected item" : name;
  return `<span class="item-card__heading ${esc(classes.heading || "")}">${renderItemIcon(item, { packId, size, decorative: true, reveal, className: iconClass })} <span class="item-card__name ${esc(classes.name || "")}${size === "icon" ? " sr-only" : ""}">${esc(label || "Item")}</span></span>`;
}
export function renderItemCardBody(
  item,
  {
    packId = item?.pack?.id,
    size = "regular",
    name = item?.name,
    reveal = false,
    quantityLabel = "",
    quantityValue = "",
    rarity = item?.rarity,
    notes = [],
    facts = [],
    classes = {},
    iconClass = "",
  } = {},
) {
  const heading = renderItemIdentity(item, {
    packId,
    size,
    name,
    reveal,
    classes,
    iconClass,
  });
  if (hidden(item, reveal) || ["icon", "inline"].includes(size)) return heading;
  const quantity = quantityLabel
    ? `<span class="item-card__quantity ${esc(classes.quantity || "")}"><span>${esc(quantityLabel)}</span> <strong>${esc(quantityValue)}</strong></span>`
    : "";
  const detail = facts.length
    ? `<span class="item-card__facts">${facts.map((f) => `<span>${esc(f.label)} <b>${esc(f.value)}</b></span>`).join(" ")}</span>`
    : "";
  const meta = `<span class="item-card__meta ${esc(classes.meta || "")}"><span class="item-card__rarity ${esc(classes.rarity || "")}">${esc(rarity || "Rarity not recorded")}</span>${notes.length ? ` <span class="item-card__note ${esc(classes.note || "")}">${notes.map(esc).join(" · ")}</span>` : ""}</span>`;
  return heading + quantity + detail + meta;
}
export function renderItemCard(
  item,
  {
    packId = item?.pack?.id,
    size = "compact",
    href = itemCardURL(packId, item?.id),
    state = "",
    className = "",
    reveal = false,
    ...options
  } = {},
) {
  sizeOf(size);
  if (
    !href.startsWith("/") ||
    href.startsWith("//") ||
    /[\\\u0000-\u0020\u007f]/.test(href)
  )
    throw Error("Unsafe item-card link");
  const url = new URL(href, "https://item-card.invalid");
  if (
    url.origin !== "https://item-card.invalid" ||
    url.username ||
    url.password
  )
    throw Error("Unsafe item-card link");
  const protectedItem = hidden(item, reveal),
    tag = protectedItem ? "span" : "a";
  return `<${tag} class="item-card ${esc(className)}" data-item-size="${size}" data-state="${esc(state)}"${protectedItem ? "" : ` href="${esc(href)}" data-item-card="${esc(item?.id)}"`}>${renderItemCardBody(item, { ...options, packId, size, reveal })}</${tag}>`;
}
