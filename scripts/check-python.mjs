import { spawnSync } from "node:child_process";

const candidates =
  process.platform === "win32"
    ? [
        ["py", ["-3"]],
        ["python", []],
        ["python3", []],
      ]
    : [
        ["python3", []],
        ["python", []],
      ];
let unavailable = [];
for (const [executable, prefix] of candidates) {
  const result = spawnSync(executable, [...prefix, "scripts/check.py"], {
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error?.code === "ENOENT" || result.status === 9009) {
    unavailable.push(executable);
    continue;
  }
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
  break;
}
if (process.exitCode === undefined) {
  console.error(`Python 3 unavailable (tried ${unavailable.join(", ")}).`);
  process.exitCode = 1;
}
