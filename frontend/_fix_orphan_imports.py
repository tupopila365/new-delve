"""Fix duplicated `import {` inserted inside multiline import blocks."""
from __future__ import annotations

from pathlib import Path

ROOT = Path("frontend/src")


def fix_text(text: str) -> str:
    lines = text.splitlines(keepends=True)
    out: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # Inside a multiline import that already opened with `import {`
        # remove spurious nested `import {` lines
        if line.strip() == "import {" and out:
            # Check if we're currently inside an open import block
            depth = 0
            for prev in out:
                s = prev.strip()
                if s.startswith("import {") or s == "import {":
                    depth += 1
                if "} from " in s:
                    depth = max(0, depth - 1)
            if depth > 0:
                # skip this spurious import {
                i += 1
                continue
        out.append(line)
        i += 1
    text2 = "".join(out)

    # Fix orphan members after a single-line import: insert import {
    lines = text2.splitlines(keepends=True)
    out = []
    i = 0
    while i < len(lines):
        # Detect: completed import line, then members without import {, then } from
        if i + 2 < len(lines):
            cur = lines[i]
            # gather potential orphan run starting at i
            if (
                cur.startswith("  ")
                and not cur.strip().startswith("import")
                and not cur.strip().startswith("//")
                and cur.strip()
                and ("from " not in cur)
            ):
                # check previous emitted line is a complete import
                prev = out[-1].strip() if out else ""
                is_complete_import = (
                    prev.startswith("import ")
                    and "from " in prev
                    and prev.endswith(("')", '")', "';", "';", "')", '")'))
                ) or prev.startswith("} from ")
                if is_complete_import and not (out and out[-1].strip() == "import {"):
                    j = i
                    members = []
                    while j < len(lines):
                        s = lines[j].strip()
                        if s.startswith("} from "):
                            break
                        if not s or s.startswith("import ") or s.startswith("export ") or s.startswith("const ") or s.startswith("function ") or s.startswith("type ") and " = " in s:
                            members = []
                            break
                        if "from " in s and s.startswith("import"):
                            members = []
                            break
                        members.append(lines[j])
                        j += 1
                    if members and j < len(lines) and lines[j].strip().startswith("} from "):
                        out.append("import {\n")
                        out.extend(members)
                        out.append(lines[j])
                        i = j + 1
                        continue
        out.append(lines[i])
        i += 1
    return "".join(out)


def main():
    changed = []
    for p in list(ROOT.rglob("*.ts")) + list(ROOT.rglob("*.tsx")):
        original = p.read_text(encoding="utf-8")
        fixed = fix_text(original)
        if fixed != original:
            p.write_text(fixed, encoding="utf-8", newline="\n")
            changed.append(p.as_posix())
    print(f"fixed {len(changed)}")
    for c in changed:
        print(c)


if __name__ == "__main__":
    main()
