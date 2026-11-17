import { readFile, lstat } from "node:fs/promises";
import { parseBounded } from "./limits.mjs";
import {
  validateAcquisitionCatalog,
  ACQUISITION_MAX_BYTES,
} from "../domain/weapon-acquisition.mjs";
export async function readWeaponAcquisition() {
  const path = new URL(
      "../../content/weapon-acquisition.json",
      import.meta.url,
    ),
    info = await lstat(path);
  if (
    !info.isFile() ||
    info.isSymbolicLink() ||
    info.size > ACQUISITION_MAX_BYTES
  )
    throw Error("Unsafe acquisition catalog");
  return validateAcquisitionCatalog(
    parseBounded(await readFile(path, "utf8"), ACQUISITION_MAX_BYTES, {
      depth: 8,
      nodes: 25000,
      string: 1000,
    }),
  );
}
