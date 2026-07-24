from pathlib import Path

root = Path("frontend/src")
for p in list(root.rglob("*.ts")) + list(root.rglob("*.tsx")):
    lines = p.read_text(encoding="utf-8").splitlines()
    for i, line in enumerate(lines):
        s = line.strip()
        if not s or s.startswith("//") or s.startswith("import") or s.startswith("export"):
            continue
        if i == 0:
            continue
        prev = lines[i - 1].strip()
        nxt = lines[i + 1].strip() if i + 1 < len(lines) else ""
        # orphan member between imports
        if (
            line.startswith("  ")
            and ("from " in prev or prev.startswith("} from"))
            and (nxt.startswith("import ") or nxt.startswith("} from") or nxt.startswith("type "))
            and "from " not in s
            and not s.startswith("const ")
            and not s.startswith("function ")
            and not s.startswith("<")
        ):
            # likely orphan if looks like identifier,
            if s[0].isalpha() or s.startswith("type "):
                print(f"{p.as_posix()}:{i+1}: {s}")
