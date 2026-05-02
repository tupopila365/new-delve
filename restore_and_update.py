#!/usr/bin/env python3
"""
Restore AccommodationList.tsx from git and apply all required changes.
"""
import subprocess
import os
import re
from pathlib import Path

BASE_DIR = r"C:\Users\kauna\Desktop\New Delve\frontend\src"
PAGES_DIR = os.path.join(BASE_DIR, "pages")
DATA_DIR = os.path.join(BASE_DIR, "data")
PROJECT_ROOT = r"C:\Users\kauna\Desktop\New Delve"

def run_git_command(cmd):
    """Run a git command in the project root."""
    try:
        result = subprocess.run(
            cmd,
            cwd=PROJECT_ROOT,
            shell=True,
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode != 0:
            print(f"Git error: {result.stderr}")
            return None
        return result.stdout
    except Exception as e:
        print(f"Exception running git: {e}")
        return None

def restore_accommodation_list():
    """Restore AccommodationList.tsx from git."""
    print("Step 1: Restoring AccommodationList.tsx from git...")
    file_path = os.path.join(PAGES_DIR, "AccommodationList.tsx")

    # Check current file size
    if os.path.exists(file_path):
        size = os.path.getsize(file_path)
        print(f"  Current file size: {size} bytes")

    # Run git checkout
    cmd = f'git checkout HEAD -- frontend/src/pages/AccommodationList.tsx'
    result = run_git_command(cmd)

    if result is not None:
        # Verify restoration
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            print(f"  ✓ File restored successfully: {len(lines)} lines")
            return True

    print("  ! Git restore failed, file may still be corrupted")
    return False

def apply_replacements():
    """Apply all required text replacements."""

    replacements = {
        "AccommodationList.tsx": [
            ("e.g. Windhoek, Swakopmund", "e.g. Paris, Tokyo"),
            ("From (N$ / night)", "From ($ / night)"),
            ("Up to (N$ / night)", "Up to ($ / night)"),
            ("From</span> N$", "From</span> $"),
        ],
        "AccommodationBook.tsx": [
            ("≈ N$", "≈ $"),
            ("<strong>N$", "<strong>$"),
        ],
        "BusTripDetail.tsx": [
            ("N$", "$"),  # Replace all N$ with $
        ],
        "EventDetail.tsx": [
            ("[venue, city, region, 'Namibia']", "[venue, city, region]"),
            ("From N$", "From $"),
        ],
        "EventsList.tsx": [
            ("From N$", "From $"),
        ],
        "FoodDetail.tsx": [
            ("[name, city, region, 'Namibia']", "[name, city, region]"),
        ],
        "GuideDetail.tsx": [
            ("≈ N$", "≈ $"),
            ("<strong>N$", "<strong>$"),
        ],
        "GuidesList.tsx": [
            ("Local experts who know Namibia inside out.", "Local experts who know their destination inside out."),
        ],
        "VehicleDetail.tsx": [
            ("N$", "$"),  # Replace all N$ with $
        ],
        "Transport.tsx": [
            ('placeholder="Windhoek"', 'placeholder="City / airport"'),
            ('placeholder="Swakopmund"', 'placeholder="City / airport"'),
            ("Min price / day (N$)", "Min price / day ($)"),
            ("Max price / day (N$)", "Max price / day ($)"),
            ("providers across Namibia list here regularly.", "Providers list here regularly."),
        ],
        "SearchPage.tsx": [
            ('placeholder="Windhoek, braai, bus, lodge…"', 'placeholder="Paris, Tokyo, hotel, bus…"'),
        ],
        "Settings.tsx": [
            ('placeholder="Windhoek"', 'placeholder="e.g. London"'),
        ],
        "CreatePost.tsx": [
            ('placeholder="Namibia views · Weekend trips…"', 'placeholder="Travel vibes · Weekend trips…"'),
        ],
        "DelversNew.tsx": [
            ("Delvers is your visual moodboard for Namibia.", "Delvers is your visual moodboard for everywhere."),
            ('placeholder="Desert weekends · Windhoek eats · Road trips…"', 'placeholder="City breaks · Local eats · Road trips…"'),
        ],
        "homeStories.ts": [
            ("Boutique rooms & desert lodges across Namibia", "Boutique rooms & stays around the world"),
            ("Guides who know every dune and story", "Guides who know every street and story"),
        ],
    }

    print("\nStep 2: Applying replacements...")
    total_changes = 0

    for filename, changes in replacements.items():
        if filename.endswith(".ts"):
            file_path = os.path.join(DATA_DIR, filename)
        else:
            file_path = os.path.join(PAGES_DIR, filename)

        if not os.path.exists(file_path):
            print(f"  ! File not found: {file_path}")
            continue

        print(f"\n  Processing {filename}...")

        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        for old_text, new_text in changes:
            count = content.count(old_text)
            if count > 0:
                content = content.replace(old_text, new_text)
                print(f"    - Replaced '{old_text}' → '{new_text}' ({count}x)")
                total_changes += count
            else:
                print(f"    ! Not found: '{old_text}'")

        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"    ✓ File updated")
        else:
            print(f"    - No changes made")

    print(f"\n  Total replacements: {total_changes}")

def verify_no_namibia_references():
    """Verify that no Namibia/Windhoek/Swakopmund/N$ references remain."""
    print("\nStep 3: Verifying no Namibia references remain...")

    exclude_files = {'mockData.ts', 'mockApi.ts'}
    patterns = [
        (r'\bNamibia\b', 'Namibia'),
        (r'\bWindhoek\b', 'Windhoek'),
        (r'\bSwakopmund\b', 'Swakopmund'),
        (r'N\$', 'N$'),
    ]

    issues = []

    # Check pages
    for filename in os.listdir(PAGES_DIR):
        if not filename.endswith('.tsx'):
            continue

        file_path = os.path.join(PAGES_DIR, filename)
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        for pattern, label in patterns:
            matches = re.finditer(pattern, content)
            for match in matches:
                line_num = content[:match.start()].count('\n') + 1
                issues.append(f"{filename}:{line_num} - {label}")

    # Check data files (excluding mock files)
    for filename in os.listdir(DATA_DIR):
        if filename in exclude_files or not filename.endswith('.ts'):
            continue

        file_path = os.path.join(DATA_DIR, filename)
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        for pattern, label in patterns:
            matches = re.finditer(pattern, content)
            for match in matches:
                line_num = content[:match.start()].count('\n') + 1
                issues.append(f"{filename}:{line_num} - {label}")

    if issues:
        print(f"  ! Found {len(issues)} remaining references:")
        for issue in issues[:20]:  # Show first 20
            print(f"    {issue}")
        if len(issues) > 20:
            print(f"    ... and {len(issues) - 20} more")
    else:
        print("  ✓ No Namibia/Windhoek/Swakopmund/N$ references found")

    return len(issues) == 0

def main():
    print("=" * 70)
    print("RESTORE AND UPDATE SCRIPT")
    print("=" * 70)

    # Step 1: Restore
    restore_accommodation_list()

    # Step 2: Apply replacements
    apply_replacements()

    # Step 3: Verify
    verify_no_namibia_references()

    print("\n" + "=" * 70)
    print("COMPLETE")
    print("=" * 70)

if __name__ == '__main__':
    main()
