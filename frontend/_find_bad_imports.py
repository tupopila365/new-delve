from pathlib import Path

root = Path("src")
bad = []
for p in list(root.rglob("*.ts")) + list(root.rglob("*.tsx")):
    lines = p.read_text(encoding="utf-8").splitlines()
    for i, line in enumerate(lines):
        if line.strip().startswith("import ") and i > 0:
            prev = lines[i - 1].rstrip()
            if prev.endswith("{") or (prev.startswith("import {") and "from" not in prev):
                bad.append(f"{p.as_posix()}:{i}")
                break
        # import stuck inside multiline
        if i > 0 and lines[i - 1].strip() == "import {" and line.strip().startswith("import "):
            bad.append(f"{p.as_posix()}:{i+1}")
            break

print("count", len(bad))
for b in bad:
    print(b)
