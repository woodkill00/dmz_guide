import { startOwnedServer } from "../../scripts/server-readiness.mjs";

export function startBrowserServer() {
  return startOwnedServer({ port: process.env.TEST_PORT || undefined });
}
