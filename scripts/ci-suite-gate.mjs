import { pathToFileURL } from "node:url";

export function assertSuiteResults(results) {
  const expected = ["browser-acceptance", "runtime-core", "studio-acceptance"];
  if (
    !results ||
    typeof results !== "object" ||
    Array.isArray(results) ||
    Object.keys(results).sort().join() !== expected.join() ||
    expected.some((name) => results[name]?.result !== "success")
  ) {
    throw Error(
      "Runtime gate requires successful core, browser and Studio suites",
    );
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  assertSuiteResults(JSON.parse(process.env.DMZ_SUITE_RESULTS || "null"));
  console.log(
    "Core, browser and Studio suites passed on both operating systems.",
  );
}
