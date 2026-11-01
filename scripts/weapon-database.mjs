import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const script = fileURLToPath(new URL("./weapon_database.py", import.meta.url));
const win = process.platform === "win32";
const args = process.argv.slice(2);
const command =
  args[0] === "test"
    ? [
        "-m",
        "unittest",
        "discover",
        "-s",
        "tests",
        "-p",
        "test_weapon_database.py",
        "-v",
      ]
    : [script, ...args];
const child = spawn(
  win ? "py" : "python3",
  [...(win ? ["-3"] : []), ...command],
  {
    stdio: "inherit",
    windowsHide: true,
    cwd: fileURLToPath(new URL("../", import.meta.url)),
  },
);
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
