const normalize = (text) =>
  String(text || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export function matchScanText(text, pack, { spoilers = false } = {}) {
  if (typeof text !== "string" || text.length > 50000)
    throw Error("OCR text exceeds the review limit");
  const items = pack.items.filter((item) => !item.spoiler || spoilers);
  const rows = [];
  for (const line of text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 500)) {
    const suffix = line.match(/(?:\s+[$₩€£]?|[×x:|$₩€£])([\d,]+)\s*$/i),
      prefix = line.match(/^([\d,]+)\s*[×x]\s*/i);
    const quantityText = (suffix?.[1] || prefix?.[1] || "").replaceAll(",", "");
    const quantity =
      /^\d+$/.test(quantityText) && Number(quantityText) <= 2000000
        ? Number(quantityText)
        : null;
    const name = normalize(
      suffix
        ? line.slice(0, suffix.index)
        : prefix
          ? line.slice(prefix[0].length)
          : line,
    );
    const exact = items.filter((item) =>
      [item.name, ...(item.aliases || [])].some(
        (alias) => normalize(alias) === name,
      ),
    );
    const candidates = exact.length
      ? exact
      : items
          .filter(
            (item) =>
              normalize(item.name).includes(name) ||
              name.includes(normalize(item.name)),
          )
          .slice(0, 8);
    rows.push({
      raw: line.slice(0, 240),
      itemId: exact.length === 1 ? exact[0].id : "",
      quantity,
      candidates: candidates.map((item) => ({ id: item.id, name: item.name })),
      confidence:
        exact.length === 1 && quantity !== null
          ? "Name matched · review count"
          : "Needs review",
    });
  }
  return rows;
}
export function combineScanRows(rows) {
  const selected = rows.filter((row) => row.selected),
    seen = new Set();
  if (!selected.length) throw Error("Select at least one mapped item");
  return selected.map((row) => {
    if (!row.itemId || !Number.isSafeInteger(row.quantity) || row.quantity < 0)
      throw Error("Map every selected name and enter a valid count");
    if (seen.has(row.itemId))
      throw Error(
        "The same item occurs more than once. Select one total count; overlapping pages are not added together",
      );
    seen.add(row.itemId);
    return {
      itemId: row.itemId,
      pool: row.pool || "stash",
      mode: "set",
      quantity: row.quantity,
    };
  });
}
