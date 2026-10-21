"""Read-only readiness report; does not install, authenticate or mutate anything."""
import json
import shutil
import subprocess
import sys
from pathlib import Path
from check import check, ROOT

print("Python:", sys.version.split()[0])
errors = check()
for error in errors:
    print("FAIL:", error)
failed = bool(errors)
if sys.version_info < (3, 11):
    print("FAIL: Python 3.11+ required")
    failed = True
for command in ("git", "bash", "specify", "codex"):
    executable = shutil.which(command)
    print(command + ":", executable or "not installed")
    if command in ("git", "bash", "specify") and not executable:
        failed = True
if shutil.which("specify"):
    result = subprocess.run(["specify", "--version"], text=True, capture_output=True)
    print(result.stdout.strip())
    if result.returncode or "1.2.2" not in result.stdout:
        failed = True
    result = subprocess.run(["specify", "integration", "status"], cwd=ROOT)
    failed |= bool(result.returncode)
pointer = ROOT / ".specify/feature.json"
if pointer.exists():
    try:
        name = json.loads(pointer.read_text(encoding="utf-8"))["feature_directory"]
        target = (ROOT / name).resolve()
        if not target.is_relative_to((ROOT / "specs").resolve()) or not (target / "spec.md").is_file():
            raise ValueError("invalid feature path")
        print("Active feature:", name)
    except (ValueError, KeyError):
        print("FAIL: invalid active feature pointer")
        failed = True
else:
    print("INFO: choose a feature with python3 scripts/select-feature.py 002-repository-bootstrap")
print("Codex login, model availability and semantic agent execution are NOT tested by doctor.")
sys.exit(bool(failed))
