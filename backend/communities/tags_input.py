import json

from tags.services import MAX_TAGS_PER_CONTENT, extract_hashtags_from_text, normalize_tag


def parse_group_tag_input(raw) -> list[str]:
    if raw is None or raw == "":
        return []
    if isinstance(raw, list):
        items = raw
    elif isinstance(raw, str):
        text = raw.strip()
        if not text:
            return []
        if text.startswith("["):
            try:
                parsed = json.loads(text)
                items = parsed if isinstance(parsed, list) else [text]
            except json.JSONDecodeError:
                items = [text]
        else:
            slugs = extract_hashtags_from_text(text)
            if slugs:
                return slugs[:MAX_TAGS_PER_CONTENT]
            items = [part.strip() for part in text.split(",")]
    else:
        items = [raw]

    seen: set[str] = set()
    cleaned: list[str] = []
    for item in items:
        slug = normalize_tag(str(item))
        if not slug or slug in seen:
            continue
        seen.add(slug)
        cleaned.append(slug)
        if len(cleaned) >= MAX_TAGS_PER_CONTENT:
            break
    return cleaned
