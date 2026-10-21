"""Offline structural, provenance, traceability and relative-link gate. Standard library only."""
import hashlib
import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
SKILLS = {"analyze", "checklist", "clarify", "constitution", "converge", "implement", "plan", "specify", "tasks", "taskstoissues"}

def check(root=ROOT):
    errors = []
    def fail(message):
        errors.append(message)
    try:
        lock = json.loads((root / "speckit.lock.json").read_text(encoding="utf-8"))
        if lock.get("schema_version") != 1 or lock.get("version") != "1.2.2" or lock.get("commit") != "74be0a63e93c7087c5b06556b7561810d8f78a45":
            fail("Unreviewed Spec Kit version or source pin")
        expected_files = {
            '.agents/skills/speckit-analyze/SKILL.md',
            '.agents/skills/speckit-checklist/SKILL.md',
            '.agents/skills/speckit-clarify/SKILL.md',
            '.agents/skills/speckit-constitution/SKILL.md',
            '.agents/skills/speckit-converge/SKILL.md',
            '.agents/skills/speckit-implement/SKILL.md',
            '.agents/skills/speckit-plan/SKILL.md',
            '.agents/skills/speckit-specify/SKILL.md',
            '.agents/skills/speckit-tasks/SKILL.md',
            '.agents/skills/speckit-taskstoissues/SKILL.md',
            '.specify/scripts/bash/check-prerequisites.sh',
            '.specify/scripts/bash/common.sh',
            '.specify/scripts/bash/create-new-feature.sh',
            '.specify/scripts/bash/resolve-template.sh',
            '.specify/scripts/bash/setup-plan.sh',
            '.specify/scripts/bash/setup-tasks.sh',
            '.specify/templates/checklist-template.md',
            '.specify/templates/constitution-template.md',
            '.specify/templates/plan-template.md',
            '.specify/templates/spec-template.md',
            '.specify/templates/tasks-template.md',
            '.specify/workflows/speckit/workflow.yml',
            '.specify/workflows/workflow-registry.json',
        }
        if set(lock["files"]) != expected_files:
            fail("Upstream lock coverage is incomplete or unexpected")
        for name, digest in lock["files"].items():
            path = root / name
            if not path.resolve().is_relative_to(root.resolve()) or not path.is_file():
                fail("Missing/unsafe upstream file: " + name)
            elif hashlib.sha256(path.read_bytes()).hexdigest() != digest:
                fail("Modified upstream file: " + name)
        actual = {p.parent.name.removeprefix("speckit-") for p in (root / ".agents/skills").glob("speckit-*/SKILL.md")}
        if actual != SKILLS:
            fail("Expected all ten official Codex skills")
        for manifest in (root / ".specify/integrations").glob("*.manifest.json"):
            for name, digest in json.loads(manifest.read_text(encoding="utf-8"))["files"].items():
                path = root / name
                if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != digest:
                    fail("Integration manifest mismatch: " + name)
        trace = json.loads((root / "specs/002-repository-bootstrap/traceability.json").read_text(encoding="utf-8"))
        required = {"BOOT-001", "BOOT-002", "BOOT-003", "BOOT-004", "BOOT-005"}
        if set(trace) != required:
            fail("Bootstrap requirement coverage is incomplete")
        task_text = (root / "specs/002-repository-bootstrap/tasks.md").read_text(encoding="utf-8")
        task_ids = set(re.findall(r"\bT[0-9]{3}\b", task_text))
        for req, item in trace.items():
            if any(task not in task_ids for task in item.get("tasks", [])):
                fail(req + " references missing task")
            for key in ("tasks", "evidence"):
                if not item.get(key):
                    fail(req + " missing " + key)
            for file in item.get("evidence", []):
                if not (root / file).is_file():
                    fail(req + " missing evidence: " + file)
    except (OSError, ValueError, KeyError, TypeError, AttributeError) as exc:
        fail("Invalid metadata: " + str(exc))
    # Templates/skills contain deliberately uninstantiated example paths; check authored docs only.
    documents = list(root.glob("*.md")) + list((root / "docs").rglob("*.md")) + list((root / "specs").rglob("*.md"))
    for path in documents:
        content = re.sub(r"```.*?```", "", path.read_text(encoding="utf-8"), flags=re.S)
        for target in re.findall(r"(?<!!)\[[^\]\n]+\]\(([^)]+)\)", content):
            target = target.split()[0].strip("<>")
            if ":" in target or target.startswith("#"):
                continue
            target = unquote(target.split("#", 1)[0])
            if target and not (path.parent / target).exists():
                fail(str(path.relative_to(root)) + ": broken relative link " + target)
    return errors

if __name__ == "__main__":
    failures = check()
    for error in failures:
        print("FAIL:", error)
    print(f"Repository checks: {len(failures)} failure(s)")
    sys.exit(bool(failures))
