import { inventoryInputLimit } from "./inventory-items.mjs";
import { currencyQuantityRaw } from "./inventory-presentation.mjs";
export function parseUpgradeStock(raw, item, profile) {
  const text = currencyQuantityRaw(raw.trim());
  if (text === "") return undefined;
  const value = Number(text);
  if (
    !/^\d+$/.test(text) ||
    !Number.isSafeInteger(value) ||
    value > inventoryInputLimit(profile, item)
  )
    throw new Error(
      `Enter a whole number from 0 to ${inventoryInputLimit(profile, item).toLocaleString("en-US")} for ${item.name}, or clear it to mark stock not entered.`,
    );
  return value;
}
