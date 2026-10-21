"""Select an existing reviewed feature without changing branches or contacting services."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def select_feature(name, root=ROOT):
    if not re.fullmatch(r"[0-9]{3,}-[a-z0-9]+(?:-[a-z0-9]+)*", name):
        raise ValueError("Use a feature directory name, e.g. 002-repository-bootstrap")
    feature = root / "specs" / name
    if not feature.is_dir() or not (feature / "spec.md").is_file():
        raise ValueError("Feature does not exist or has no spec.md")
    if not feature.resolve().is_relative_to((root / "specs").resolve()):
        raise ValueError("Feature must remain inside specs")
    target = root / ".specify" / "feature.json"
    if target.is_symlink():
        raise ValueError("Refusing symlink feature pointer")
    target.write_text(json.dumps({"feature_directory": "specs/" + name}) + "\n", encoding="utf-8")
    return feature

if __name__ == "__main__":
    try:
        if len(sys.argv) != 2:
            raise ValueError("Usage: python3 scripts/select-feature.py FEATURE")
        print(select_feature(sys.argv[1]))
    except ValueError as error:
        sys.exit(str(error))
