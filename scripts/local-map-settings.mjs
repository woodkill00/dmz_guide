import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

// Read only the existing owner opt-in; never copy unrelated local settings.
export async function mapUpdateSetting(root, environment = process.env) {
  if (Object.hasOwn(environment, "DMZ_ENABLE_SOURCE_UPDATES"))
    return environment.DMZ_ENABLE_SOURCE_UPDATES === "1" ? "1" : "0";
  try {
    const text = await readFile(
      resolve(root, "tools/hajin-map/.env.development.local"),
      "utf8",
    );
    return parseEnv(text).DMZ_ENABLE_SOURCE_UPDATES === "1" ? "1" : "0";
  } catch (error) {
    if (error.code === "ENOENT") return "0";
    throw error;
  }
}
