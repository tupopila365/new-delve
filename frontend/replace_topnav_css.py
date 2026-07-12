path = 'frontend/src/index.css'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the start of the TOP NAV section comment (search for the unique .app-topnav { display: none; } block)
# and the closing } of its @media block, followed by COMMUNITY PAGE comment.
# We target lines 23101 (0-indexed) to 23351 (exclusive) based on earlier analysis.
# But line numbers may have shifted after earlier edits, so find dynamically.

start_marker = '.app-topnav {\n'
end_marker_before = '/* Cap the home inset on large screens */'

# Find the block: look for the TOP NAV section header (box-drawing chars in comment)
# by finding the first occurrence of '.app-topnav {\n  display: none;\n}'
start_idx = None
for i, line in enumerate(lines):
    if line.strip() == '.app-topnav {' and i + 1 < len(lines) and lines[i+1].strip() == 'display: none;':
        # Check the line before is a comment line (section header)
        start_idx = i
        break

if start_idx is None:
    raise RuntimeError('Could not find .app-topnav { display: none; } block')

# Find the end: after the .page-home__inset closing brace inside the @media block
# Look for '  }' followed by '}' which closes the @media, starting after start_idx
end_idx = None
for i in range(start_idx, len(lines)):
    if end_marker_before in lines[i]:
        # Find the closing }  }  after this
        for j in range(i, min(i + 20, len(lines))):
            if lines[j].strip() == '}' and j + 1 < len(lines) and lines[j+1].strip() == '}':
                end_idx = j + 2  # exclusive end, include both closing braces
                break
        if end_idx:
            break

if end_idx is None:
    raise RuntimeError('Could not find end of TOP NAV block')

print(f'Replacing lines {start_idx+1} to {end_idx} (0-indexed {start_idx} to {end_idx})')

new_block = """\
/* -----------------------------------------------------------------
   TOP NAV (desktop >= 900px)
   ----------------------------------------------------------------- */

.app-topnav {
  display: none;
}

@media (min-width: 900px) {
  :root {
    --topnav-h: 64px;
  }

  .app-topnav {
    display: flex;
    align-items: center;
    height: var(--topnav-h);
    padding: 0 2rem;
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border-bottom: 1px solid rgba(28, 20, 16, 0.08);
    gap: 0;
  }

  @media (prefers-reduced-transparency: reduce) {
    .app-topnav {
      background: var(--bg-elevated);
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }
  }

  /* Logo */
  .app-topnav__logo {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 900;
    letter-spacing: 0.08em;
    color: var(--text);
    text-decoration: none;
    margin-right: 32px;
    flex-shrink: 0;
    transition: opacity 0.15s ease;
  }

  .app-topnav__logo:hover {
    opacity: 0.65;
  }

  /* Nav links container */
  .app-topnav__links {
    display: flex;
    align-items: center;
    height: 100%;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }

  /* Individual link */
  .app-topnav__link {
    position: relative;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 7px 13px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-secondary);
    text-decoration: none;
    border-radius: 999px;
    white-space: nowrap;
    transition: color 0.15s ease, background 0.15s ease;
    border: none;
    background: transparent;
    cursor: pointer;
    font-family: var(--font-sans);
  }

  .app-topnav__link:hover {
    color: var(--text);
    background: rgba(28, 20, 16, 0.06);
  }

  /* Active: filled pill */
  .app-topnav__link--active {
    color: var(--accent-hover);
    background: var(--accent-soft);
    font-weight: 700;
  }

  .app-topnav__link--active:hover {
    background: rgba(124, 58, 237, 0.14);
    color: var(--accent-hover);
  }

  /* More dropdown */
  .app-topnav__more {
    position: relative;
  }

  .app-topnav__more-btn {
    border: none;
    cursor: pointer;
    font-family: var(--font-sans);
  }

  .app-topnav__more-btn--open {
    color: var(--accent-hover);
    background: var(--accent-soft);
  }

  .app-topnav__more-panel {
    position: absolute;
    top: calc(100% + 10px);
    left: 50%;
    transform: translateX(-50%);
    min-width: 190px;
    padding: 6px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.98);
    border: 1px solid rgba(28, 20, 16, 0.08);
    box-shadow: 0 16px 48px rgba(28, 20, 16, 0.13);
    z-index: 60;
    display: flex;
    flex-direction: column;
    gap: 2px;
    animation: topnav-panel-in 0.15s ease;
  }

  @keyframes topnav-panel-in {
    from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }

  .app-topnav__more-item {
    display: flex;
    align-items: center;
    padding: 10px 14px;
    border-radius: 10px;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text);
    text-decoration: none;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .app-topnav__more-item:hover {
    background: var(--accent-soft);
    color: var(--accent-hover);
  }

  /* Right-side actions */
  .app-topnav__actions {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
    flex-shrink: 0;
    padding-left: 16px;
  }

  /* Icon buttons: search, messages */
  .app-topnav__icon-btn {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    color: var(--text-secondary);
    background: transparent;
    border: 1px solid transparent;
    text-decoration: none;
    flex-shrink: 0;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }

  .app-topnav__icon-btn:hover {
    background: rgba(28, 20, 16, 0.06);
    border-color: var(--hairline-light);
    color: var(--text);
  }

  /* + Post CTA */
  .app-topnav__post-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 0 18px 0 14px;
    height: 38px;
    border-radius: 999px;
    background: var(--accent);
    color: #fff;
    font-size: 14px;
    font-weight: 700;
    font-family: var(--font-sans);
    text-decoration: none;
    flex-shrink: 0;
    transition: background 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
    box-shadow: 0 2px 10px rgba(124, 58, 237, 0.28);
  }

  .app-topnav__post-btn:hover {
    background: var(--accent-hover);
    box-shadow: 0 4px 16px rgba(124, 58, 237, 0.35);
    transform: translateY(-1px);
    color: #fff;
  }

  .app-topnav__post-btn:active {
    transform: translateY(0) scale(0.97);
    box-shadow: 0 2px 8px rgba(124, 58, 237, 0.22);
  }

  /* Avatar */
  .app-topnav__avatar {
    width: 38px !important;
    height: 38px !important;
    border-radius: 999px !important;
    border: 2px solid var(--hairline-light) !important;
    background: var(--accent-soft) !important;
    overflow: hidden;
    flex-shrink: 0;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .app-topnav__avatar:hover {
    border-color: var(--accent-ring) !important;
    box-shadow: 0 0 0 3px var(--accent-soft);
  }

  .app-topnav__avatar-letter {
    font-size: 13px;
    font-weight: 800;
    color: var(--accent-hover);
  }

  /* Cap the home inset on large screens */
  .page-home__inset {
    max-width: 1100px;
    margin-left: auto;
    margin-right: auto;
  }
}

"""

lines[start_idx:end_idx] = [new_block]

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f'Success. Replaced {end_idx - start_idx} lines with new top nav CSS block.')
