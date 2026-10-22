import { inspectRecoveryStorage } from "./author-store.mjs";
import { access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export async function diagnose({
  role = "reader",
  root = project,
  host = process.env.HOST || "127.0.0.1",
} = {}) {
  if (!["reader", "author", "contributor"].includes(role))
    throw new Error("Choose reader, author or contributor");
  const results = [],
    add = (level, message) => results.push({ level, message });
  const major = Number(process.versions.node.split(".")[0]);
  add(
    [22, 24].includes(major) ? "OK" : "BLOCKER",
    `Node ${process.versions.node}; supported versions are 22.x and 24.x.`,
  );
  if (!["127.0.0.1", "localhost", "::1"].includes(host))
    add(
      "WARN",
      "Configured HOST is non-loopback. Reader access may be exposed to your network; author remains loopback-only. No settings were changed.",
    );
  async function required(path, message) {
    try {
      await access(resolve(root, path));
      add("OK", message);
    } catch {
      add("BLOCKER", `${message} missing.`);
    }
  }
  if (role === "reader")
    await required(
      "dist/index.html",
      "Reader build: run npm run build in a source checkout, or re-extract the complete static release",
    );
  else {
    await required(
      "content/catalog/manifest.json",
      "Repository source catalog (use a source checkout, not the reader ZIP)",
    );
    await required("schemas/pack.schema.json", "Catalog schema");
    await required("scripts/author.mjs", "Repository Content Studio");
    const retained = await inspectRecoveryStorage({ root });
    add(
      retained.complete ? "OK" : "WARN",
      `${retained.complete ? "Complete" : "Partial"} retained recovery inventory: ${retained.transactionCount} transactions, ${retained.fileCount} files, ${retained.bytes} bytes.`,
    );
    for (const tx of retained.transactions)
      add(
        "WARN",
        `${tx.transactionId}: ${tx.bytes} bytes; ${tx.archiveEligible ? "eligible for manual archival review only (not deletion)" : "not eligible: " + tx.reasons.join("; ")}.`,
      );
    for (const warning of retained.warnings) add("WARN", warning);
  }
  if (role === "contributor") {
    await required(
      ".agents/skills/speckit-specify/SKILL.md",
      "Pinned contributor workflow",
    );
    await required(
      ".specify/memory/constitution.md",
      "Repository constitution",
    );
    add(
      "WARN",
      "Developer checks additionally need Python 3.11+; optional agent workflow needs Git Bash, specify and Codex. Their authentication and availability are not tested here. See docs/developer-quickstart.md.",
    );
  }
  add(
    "OK",
    `Read-only ${role} diagnostics: no files, credentials, browser storage, ports or settings changed. Port availability was not tested; startup reports conflicts without changing the port.`,
  );
  return results;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  if (args.length > 1) {
    console.error(
      "Usage: node scripts/diagnose.mjs [reader|author|contributor]",
    );
    process.exitCode = 1;
  } else
    diagnose({ role: args[0] || "reader" })
      .then((results) => {
        for (const entry of results)
          console.log(`${entry.level}: ${entry.message}`);
        process.exitCode = results.some((x) => x.level === "BLOCKER") ? 1 : 0;
      })
      .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
      });
}
