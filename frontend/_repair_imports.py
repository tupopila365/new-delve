"""Repair imports inserted into the middle of multiline import { ... } blocks."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path("src")


def repair(text: str) -> str:
    lines = text.splitlines(keepends=True)
    out: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # Start of multiline import
        if re.match(r"^import\s*\{\s*$", line) or (
            line.startswith("import {") and "from" not in line and not line.rstrip().endswith("}")
        ):
            block = [line]
            i += 1
            stuck: list[str] = []
            while i < len(lines):
                cur = lines[i]
                if cur.lstrip().startswith("import ") or cur.lstrip().startswith("from "):
                    # import stuck inside block — extract it
                    stuck.append(cur)
                    i += 1
                    continue
                block.append(cur)
                i += 1
                if "from" in cur and ("'" in cur or '"' in cur):
                    break
            out.extend(block)
            out.extend(stuck)
            continue
        out.append(line)
        i += 1

    text2 = "".join(out)

    # Deduplicate identical import lines
    seen_imports: set[str] = set()
    final: list[str] = []
    for line in text2.splitlines(keepends=True):
        stripped = line.strip()
        if stripped.startswith("import ") or stripped.startswith("from "):
            if stripped in seen_imports:
                continue
            seen_imports.add(stripped)
        final.append(line)
    text2 = "".join(final)

    # Deduplicate consecutive identical hook lines
    text2 = re.sub(
        r"(  const \{[^}]+\} = useDisplayMoney\(\)\n)(?:  const \{[^}]+\} = useDisplayMoney\(\)\n)+",
        r"\1",
        text2,
    )
    return text2


def main():
    changed = []
    for p in list(ROOT.rglob("*.ts")) + list(ROOT.rglob("*.tsx")):
        original = p.read_text(encoding="utf-8")
        fixed = repair(original)
        if fixed != original:
            p.write_text(fixed, encoding="utf-8", newline="\n")
            changed.append(p.as_posix())
    print(f"repaired {len(changed)}")
    for c in changed:
        print(c)


if __name__ == "__main__":
    main()
