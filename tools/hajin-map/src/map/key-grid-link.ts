import { gridToCanonical, tacticalGrid } from "./tactical-grid.ts";
export interface KeyGridTarget {
  reference: string;
  name: string;
}
export function parseKeyGridTarget(search: string): KeyGridTarget | null {
  if (typeof search !== "string" || search.length > 2048) return null;
  const params = new URLSearchParams(search),
    grids = params.getAll("key-grid"),
    names = params.getAll("key-name");
  if (grids.length !== 1 || !/^[A-J][1-9]$/.test(grids[0]) || names.length > 1)
    return null;
  const name = names[0] ?? "Key location";
  if (name.length > 120 || /[\u0000-\u001f\u007f]/.test(name)) return null;
  return { reference: grids[0], name: name.trim() || "Key location" };
}
export function keyGridCorners(reference: string) {
  if (!/^[A-J][1-9]$/.test(reference)) throw Error("Invalid key grid");
  const c = reference.charCodeAt(0) - 65,
    r = Number(reference[1]) - 1,
    x = tacticalGrid.x,
    y = tacticalGrid.y;
  return [
    gridToCanonical(x[c], y[r]),
    gridToCanonical(x[c + 1], y[r]),
    gridToCanonical(x[c + 1], y[r + 1]),
    gridToCanonical(x[c], y[r + 1]),
  ];
}
