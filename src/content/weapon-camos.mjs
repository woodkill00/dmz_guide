import { readFile, lstat } from "node:fs/promises";
import { readWeaponAcquisition } from "./weapon-acquisition.mjs";
import { parseCamoCatalog, CAMO_MAX_BYTES } from "../domain/weapon-camos.mjs";
export async function readWeaponCamos() {
  const path = new URL("../ui/weapon-camos.json", import.meta.url),
    info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink() || info.size > CAMO_MAX_BYTES)
    throw Error("Unsafe camo catalog");
  return parseCamoCatalog(
    await readFile(path, "utf8"),
    (await readWeaponAcquisition()).weapons,
  );
}
