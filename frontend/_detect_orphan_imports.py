"""Detect files where import { was stripped, leaving orphan named imports."""
from pathlib import Path
import re

root = Path("src")
broken = []
for p in list(root.rglob("*.ts")) + list(root.rglob("*.tsx")):
    lines = p.read_text(encoding="utf-8").splitlines()
    for i, line in enumerate(lines):
        # orphan: indented Identifier at column 0-ish after a completed from-import
        if re.match(r"^  [A-Za-z_$]", line) and not line.strip().startswith("//"):
            # look back for context
            prev = next((lines[j] for j in range(i - 1, -1, -1) if lines[j].strip()), "")
            if re.search(r"\} from ['\"]", prev) or prev.startswith("import {") is False and (
                prev.endswith("')") or prev.endswith('")') or prev.endswith("';")
            ):
                # also check we're not inside a function / object
                # Heuristic: previous completed import and this looks like import member
                if re.search(r"\} from ['\"]", prev) and (
                    line.rstrip().endswith(",") or line.rstrip().endswith("}")
                ):
                    broken.append(f"{p.as_posix()}:{i+1}: {line.strip()}")
                    break
        # missing import { before apiFetch-style after react import
        if i > 0 and lines[i - 1].strip().startswith("} from 'react'") and line.strip().startswith("apiFetch"):
            broken.append(f"{p.as_posix()}:{i+1}: missing import{{ before {line.strip()[:40]}")
            break

print(len(broken))
for b in broken:
    print(b)
