from __future__ import annotations

import html
import hashlib
import re
import textwrap
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    XPreformatted,
)
from reportlab.platypus.tableofcontents import TableOfContents


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "design-system" / "DELVE_MANAGE_DESIGN_SYSTEM_DRAFT.md"
OUTPUT_DIR = ROOT / "output" / "pdf"
OUTPUT = OUTPUT_DIR / "Delve_Product_and_Manage_Design_System_Draft_2026.pdf"

PAGE_W, PAGE_H = A4
LEFT = 18 * mm
RIGHT = 18 * mm
TOP = 20 * mm
BOTTOM = 17 * mm
BODY_W = PAGE_W - LEFT - RIGHT

PURPLE = HexColor("#8C52FF")
PURPLE_DARK = HexColor("#5F2FC9")
PURPLE_DEEP = HexColor("#32166F")
LILAC = HexColor("#F1E9FF")
LILAC_PALE = HexColor("#F8F4FF")
INK = HexColor("#1A1814")
INK_2 = HexColor("#3D3933")
MUTED = HexColor("#6F695F")
CANVAS = HexColor("#F4F1EA")
PAPER = HexColor("#FAF8F4")
BORDER = HexColor("#DDD6CA")
NIGHT = HexColor("#0C0A09")
WHITE = HexColor("#FFFFFF")


def register_fonts() -> None:
    fonts = {
        "DelveSans": Path(r"C:\Windows\Fonts\segoeui.ttf"),
        "DelveSans-Semibold": Path(r"C:\Windows\Fonts\seguisb.ttf"),
        "DelveSans-Bold": Path(r"C:\Windows\Fonts\segoeuib.ttf"),
        "DelveMono": Path(r"C:\Windows\Fonts\consola.ttf"),
    }
    for name, path in fonts.items():
        if path.exists():
            pdfmetrics.registerFont(TTFont(name, str(path)))
    if "DelveSans" not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(TTFont("DelveSans", r"C:\Windows\Fonts\arial.ttf"))
        pdfmetrics.registerFont(TTFont("DelveSans-Semibold", r"C:\Windows\Fonts\arialbd.ttf"))
        pdfmetrics.registerFont(TTFont("DelveSans-Bold", r"C:\Windows\Fonts\arialbd.ttf"))
        pdfmetrics.registerFont(TTFont("DelveMono", r"C:\Windows\Fonts\cour.ttf"))


register_fonts()


BASE = ParagraphStyle(
    "Body",
    fontName="DelveSans",
    fontSize=8.4,
    leading=12.1,
    textColor=INK,
    spaceAfter=5.2,
    splitLongWords=True,
)
LEAD = ParagraphStyle(
    "Lead",
    parent=BASE,
    fontSize=10.2,
    leading=14.7,
    textColor=INK_2,
    spaceAfter=10,
)
H2 = ParagraphStyle(
    "Heading2",
    fontName="DelveSans-Bold",
    fontSize=20,
    leading=24,
    textColor=PURPLE_DEEP,
    spaceBefore=2,
    spaceAfter=10,
    keepWithNext=True,
)
H3 = ParagraphStyle(
    "Heading3",
    fontName="DelveSans-Bold",
    fontSize=13.2,
    leading=16.5,
    textColor=PURPLE_DARK,
    spaceBefore=12,
    spaceAfter=6,
    keepWithNext=True,
)
H4 = ParagraphStyle(
    "Heading4",
    fontName="DelveSans-Semibold",
    fontSize=10,
    leading=13.5,
    textColor=INK,
    spaceBefore=9,
    spaceAfter=4,
    keepWithNext=True,
)
H5 = ParagraphStyle(
    "Heading5",
    parent=H4,
    fontSize=8.6,
    leading=12,
    textColor=PURPLE_DEEP,
)
BULLET = ParagraphStyle(
    "Bullet",
    parent=BASE,
    leftIndent=12,
    firstLineIndent=-7,
    bulletIndent=0,
    spaceAfter=3,
)
NUMBERED = ParagraphStyle(
    "Numbered",
    parent=BULLET,
    leftIndent=15,
    firstLineIndent=-12,
)
TABLE_HEADER = ParagraphStyle(
    "TableHeader",
    fontName="DelveSans-Bold",
    fontSize=6.8,
    leading=9,
    textColor=WHITE,
)
TABLE_CELL = ParagraphStyle(
    "TableCell",
    fontName="DelveSans",
    fontSize=6.6,
    leading=9.1,
    textColor=INK,
    splitLongWords=True,
)
CODE = ParagraphStyle(
    "Code",
    fontName="DelveMono",
    fontSize=5.9,
    leading=8.2,
    textColor=HexColor("#EEE8FF"),
    backColor=HexColor("#17131E"),
    borderColor=HexColor("#3C2D58"),
    borderWidth=0.6,
    borderPadding=8,
    spaceBefore=5,
    spaceAfter=8,
    splitLongWords=False,
)
CALLOUT = ParagraphStyle(
    "Callout",
    parent=BASE,
    fontSize=8.2,
    leading=11.8,
    textColor=PURPLE_DEEP,
    spaceAfter=0,
)
TOC_HEAD = ParagraphStyle(
    "TOCHead",
    fontName="DelveSans-Bold",
    fontSize=22,
    leading=26,
    textColor=PURPLE_DEEP,
    spaceAfter=14,
)
TOC_L0 = ParagraphStyle(
    "TOC0",
    fontName="DelveSans-Semibold",
    fontSize=9.2,
    leading=13,
    textColor=INK,
    leftIndent=0,
    firstLineIndent=0,
    spaceBefore=2,
)
TOC_L1 = ParagraphStyle(
    "TOC1",
    fontName="DelveSans",
    fontSize=8.2,
    leading=11.5,
    textColor=MUTED,
    leftIndent=12,
    firstLineIndent=0,
)


MOJIBAKE = {
    "â€”": "-",
    "â€“": "-",
    "â€˜": "'",
    "â€™": "'",
    "â€œ": '"',
    "â€": '"',
    "â€¦": "...",
    "â†’": "->",
    "Â·": " | ",
    "Â": "",
    "Ã—": "x",
}


def clean_text(value: str) -> str:
    for bad, good in MOJIBAKE.items():
        value = value.replace(bad, good)
    replacements = {
        "\u2014": "-",
        "\u2013": "-",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2026": "...",
        "\u2192": "->",
        "\u2190": "<-",
        "\u00b7": " | ",
        "\u00a0": " ",
        "\u2610": "[ ]",
        "\u2611": "[x]",
    }
    for bad, good in replacements.items():
        value = value.replace(bad, good)
    return value.strip()


def inline_markup(value: str) -> str:
    value = clean_text(value)
    stash: list[str] = []

    def hold_code(match: re.Match[str]) -> str:
        stash.append(f'<font name="DelveMono" color="#5F2FC9">{html.escape(match.group(1))}</font>')
        return f"@@CODE{len(stash) - 1}@@"

    value = re.sub(r"`([^`]+)`", hold_code, value)
    value = html.escape(value)
    value = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", value)
    value = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<i>\1</i>", value)
    value = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<link href="\2" color="#5F2FC9">\1</link>', value)
    for index, rendered in enumerate(stash):
        value = value.replace(f"@@CODE{index}@@", rendered)
    return value


def plain_heading(value: str) -> str:
    value = clean_text(value)
    value = re.sub(r"[`*_]", "", value)
    return value


class DelveDocTemplate(BaseDocTemplate):
    def __init__(self, filename: str):
        super().__init__(
            filename,
            pagesize=A4,
            leftMargin=LEFT,
            rightMargin=RIGHT,
            topMargin=TOP,
            bottomMargin=BOTTOM,
            title="Delve Product & Manage Design System",
            author="Delve",
            subject="Traveler, Business, Admin, Figma AI, and Cursor system specification",
        )
        cover_frame = Frame(0, 0, PAGE_W, PAGE_H, id="cover_frame", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        body_frame = Frame(LEFT, BOTTOM, BODY_W, PAGE_H - TOP - BOTTOM, id="body_frame", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        self.addPageTemplates(
            [
                PageTemplate(id="Cover", frames=[cover_frame], onPage=draw_cover),
                PageTemplate(id="Body", frames=[body_frame], onPage=draw_body_page),
            ]
        )

    def afterFlowable(self, flowable) -> None:
        style_name = getattr(getattr(flowable, "style", None), "name", "")
        if style_name not in {"Heading2", "Heading3"}:
            return
        text = plain_heading(flowable.getPlainText())
        is_h2 = style_name == "Heading2"
        include_h3 = bool(re.match(r"7\.\d+\b", text))
        if not is_h2 and not include_h3:
            return
        level = 0 if is_h2 else 1
        key = f"heading-{hashlib.sha1(text.encode('utf-8')).hexdigest()[:12]}"
        self.canv.bookmarkPage(key)
        self.canv.addOutlineEntry(text, key, level=level, closed=False)
        self.notify("TOCEntry", (level, text, self.page, key))


def draw_cover(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFillColor(PURPLE)
    canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    canvas.setFillColor(PURPLE_DEEP)
    canvas.circle(PAGE_W + 15 * mm, PAGE_H - 10 * mm, 72 * mm, stroke=0, fill=1)
    canvas.setFillColor(HexColor("#A979FF"))
    canvas.circle(-18 * mm, 34 * mm, 55 * mm, stroke=0, fill=1)
    canvas.setStrokeColor(colors.Color(1, 1, 1, alpha=0.25))
    canvas.setLineWidth(0.6)
    for offset in range(0, 9):
        x = 18 * mm + offset * 20 * mm
        canvas.line(x, 0, x + 50 * mm, PAGE_H)

    canvas.setFillColor(WHITE)
    canvas.setFont("DelveSans-Bold", 11)
    canvas.drawString(20 * mm, PAGE_H - 24 * mm, "DELVE")
    canvas.setFont("DelveSans", 8)
    canvas.drawRightString(PAGE_W - 20 * mm, PAGE_H - 24 * mm, "DRAFT V0.2  |  06 AUGUST 2026")

    canvas.setFont("DelveSans-Bold", 31)
    canvas.drawString(20 * mm, PAGE_H - 78 * mm, "Product & Manage")
    canvas.drawString(20 * mm, PAGE_H - 92 * mm, "Design System")
    canvas.setFont("DelveSans", 12)
    canvas.drawString(20 * mm, PAGE_H - 107 * mm, "Traveler Light + Dark  |  Business  |  Admin")

    canvas.setFillColor(colors.Color(1, 1, 1, alpha=0.92))
    canvas.setFont("DelveSans", 9.2)
    cover_lines = [
        "A shared design, product, and implementation specification",
        "for Figma AI and Cursor - led by Delve Purple.",
    ]
    y = PAGE_H - 129 * mm
    for line in cover_lines:
        canvas.drawString(20 * mm, y, line)
        y -= 6 * mm

    chips = ["HOME", "TRANSPORT", "DELVERS", "JOURNEYS", "ACCOUNT", "PAYMENTS", "BACKEND"]
    x = 20 * mm
    y = 29 * mm
    canvas.setFont("DelveSans-Semibold", 6.8)
    for chip in chips:
        width = canvas.stringWidth(chip, "DelveSans-Semibold", 6.8) + 9 * mm
        if x + width > PAGE_W - 20 * mm:
            x = 20 * mm
            y -= 11 * mm
        canvas.setFillColor(colors.Color(1, 1, 1, alpha=0.16))
        canvas.roundRect(x, y, width, 7.5 * mm, 3.75 * mm, stroke=0, fill=1)
        canvas.setFillColor(WHITE)
        canvas.drawCentredString(x + width / 2, y + 2.5 * mm, chip)
        x += width + 3 * mm
    canvas.restoreState()


def draw_body_page(canvas, doc) -> None:
    canvas.saveState()
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.6)
    canvas.line(LEFT, PAGE_H - 12 * mm, PAGE_W - RIGHT, PAGE_H - 12 * mm)
    canvas.setFont("DelveSans-Bold", 6.6)
    canvas.setFillColor(PURPLE_DARK)
    canvas.drawString(LEFT, PAGE_H - 9.4 * mm, "DELVE PRODUCT & MANAGE DESIGN SYSTEM")
    canvas.setFont("DelveSans", 6.4)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(PAGE_W - RIGHT, PAGE_H - 9.4 * mm, "FIGMA AI  |  CURSOR  |  DRAFT V0.2")
    canvas.line(LEFT, 10.5 * mm, PAGE_W - RIGHT, 10.5 * mm)
    canvas.setFont("DelveSans", 6.4)
    canvas.drawString(LEFT, 6.8 * mm, "HOME  |  TRANSPORT  |  DELVERS  |  JOURNEYS  |  ACCOUNT  |  PAYMENTS  |  ADMIN")
    canvas.drawRightString(PAGE_W - RIGHT, 6.8 * mm, f"{doc.page:03d}")
    canvas.restoreState()


def section_rule() -> HRFlowable:
    return HRFlowable(width="100%", thickness=2.2, color=PURPLE, spaceBefore=0, spaceAfter=9)


def parse_table(lines: list[str]) -> Table:
    rows: list[list[str]] = []
    for line in lines:
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        rows.append(cells)
    if len(rows) > 1 and all(re.fullmatch(r":?-{3,}:?", cell.replace(" ", "")) for cell in rows[1]):
        rows.pop(1)
    columns = max(len(row) for row in rows)
    for row in rows:
        row.extend([""] * (columns - len(row)))

    lengths = []
    for index in range(columns):
        observed = [min(max(len(clean_text(row[index])), 7), 44) for row in rows]
        lengths.append(max(observed))
    total = sum(lengths) or columns
    minimum = 23 * mm if columns <= 4 else 15 * mm
    widths = [max(minimum, BODY_W * length / total) for length in lengths]
    width_sum = sum(widths)
    if width_sum > BODY_W:
        widths = [width * BODY_W / width_sum for width in widths]

    data = []
    for row_index, row in enumerate(rows):
        style = TABLE_HEADER if row_index == 0 else TABLE_CELL
        data.append([Paragraph(inline_markup(cell), style) for cell in row])

    table = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT", splitByRow=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), PURPLE_DEEP),
                ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
                ("BACKGROUND", (0, 1), (-1, -1), WHITE),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, PAPER]),
                ("GRID", (0, 0), (-1, -1), 0.35, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4.5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4.5),
                ("TOPPADDING", (0, 0), (-1, -1), 4.2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4.2),
                ("LINEBELOW", (0, 0), (-1, 0), 1, PURPLE),
            ]
        )
    )
    return table


def code_block(language: str, lines: list[str]) -> list:
    text = clean_text("\n".join(lines))
    if language == "mermaid":
        heading = Paragraph("SYSTEM FLOW", H5)
        text = text.replace("flowchart TD", "").strip()
        return [heading, XPreformatted(html.escape(text), CODE)]
    wrapped_lines: list[str] = []
    for line in text.splitlines():
        if len(line) <= 138:
            wrapped_lines.append(line)
        else:
            wrapped_lines.extend(textwrap.wrap(line, width=138, subsequent_indent="  ", replace_whitespace=False))
    label = language.upper() if language else "SPECIFICATION"
    return [Paragraph(label, H5), XPreformatted(html.escape("\n".join(wrapped_lines)), CODE)]


def callout(lines: list[str]) -> Table:
    text = "<br/>".join(inline_markup(line.lstrip("> ").rstrip()) for line in lines)
    table = Table([[Paragraph(text, CALLOUT)]], colWidths=[BODY_W], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), LILAC_PALE),
                ("BOX", (0, 0), (-1, -1), 0.6, HexColor("#C7ACFF")),
                ("LINEBEFORE", (0, 0), (0, -1), 3, PURPLE),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def markdown_story(source: str) -> list:
    lines = source.splitlines()
    story: list = []
    paragraph_lines: list[str] = []
    first_h2 = True

    def flush_paragraph() -> None:
        nonlocal paragraph_lines
        if paragraph_lines:
            joined = " ".join(line.strip() for line in paragraph_lines)
            style = LEAD if not any(isinstance(item, Paragraph) and getattr(item.style, "name", "") == "Body" for item in story[-3:]) and len(story) < 12 else BASE
            story.append(Paragraph(inline_markup(joined), style))
            paragraph_lines = []

    index = 0
    while index < len(lines):
        raw = lines[index].rstrip()
        stripped = raw.strip()

        if not stripped:
            flush_paragraph()
            index += 1
            continue

        if stripped.startswith("```"):
            flush_paragraph()
            language = stripped[3:].strip()
            block: list[str] = []
            index += 1
            while index < len(lines) and not lines[index].strip().startswith("```"):
                block.append(lines[index].rstrip("\n"))
                index += 1
            story.extend(code_block(language, block))
            index += 1
            continue

        if stripped.startswith("|"):
            flush_paragraph()
            block = []
            while index < len(lines) and lines[index].strip().startswith("|"):
                block.append(lines[index].strip())
                index += 1
            story.append(parse_table(block))
            story.append(Spacer(1, 7))
            continue

        if stripped.startswith(">"):
            flush_paragraph()
            block = []
            while index < len(lines) and lines[index].strip().startswith(">"):
                block.append(lines[index].strip())
                index += 1
            story.append(callout(block))
            story.append(Spacer(1, 5))
            continue

        heading_match = re.match(r"^(#{1,6})\s+(.+)$", stripped)
        if heading_match:
            flush_paragraph()
            level = len(heading_match.group(1))
            title = plain_heading(heading_match.group(2))
            if level == 1:
                index += 1
                continue
            if level == 2:
                if not first_h2:
                    story.append(PageBreak())
                first_h2 = False
                story.append(Paragraph(inline_markup(title), H2))
                story.append(section_rule())
            elif level == 3:
                if re.match(r"7\.(?:[4-9]|1[0-2])\b", title):
                    story.append(PageBreak())
                story.append(Paragraph(inline_markup(title), H3))
            elif level == 4:
                story.append(Spacer(1, 3))
                story.append(Paragraph(inline_markup(title), H4))
            else:
                story.append(Spacer(1, 2))
                story.append(Paragraph(inline_markup(title), H5))
            index += 1
            continue

        unordered = re.match(r"^\s*[-*+]\s+(.+)$", raw)
        ordered = re.match(r"^\s*(\d+)\.\s+(.+)$", raw)
        if unordered or ordered:
            flush_paragraph()
            indent = len(raw) - len(raw.lstrip(" "))
            if unordered:
                content = unordered.group(1)
                style = ParagraphStyle(f"bullet-{indent}", parent=BULLET, leftIndent=12 + indent * 2, bulletIndent=indent * 2)
                story.append(Paragraph(inline_markup(content), style, bulletText="•"))
            else:
                number = ordered.group(1)
                content = ordered.group(2)
                style = ParagraphStyle(f"number-{indent}", parent=NUMBERED, leftIndent=15 + indent * 2, bulletIndent=indent * 2)
                story.append(Paragraph(inline_markup(content), style, bulletText=f"{number}."))
            index += 1
            continue

        if re.fullmatch(r"-{3,}", stripped):
            flush_paragraph()
            story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceBefore=6, spaceAfter=8))
            index += 1
            continue

        paragraph_lines.append(raw)
        index += 1

    flush_paragraph()
    return story


def build_pdf() -> Path:
    if not SOURCE.exists():
        raise FileNotFoundError(SOURCE)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    source = SOURCE.read_text(encoding="utf-8")

    story: list = [
        Spacer(1, PAGE_H - 1),
        NextPageTemplate("Body"),
        PageBreak(),
        Paragraph("Contents", TOC_HEAD),
        Paragraph(
            "This specification separates the visual experience defined in Figma from the real product, data, permission, payment, and backend implementation handled in Cursor.",
            LEAD,
        ),
    ]
    toc = TableOfContents()
    toc.levelStyles = [TOC_L0, TOC_L1]
    toc.dotsMinLevel = 0
    story.extend([toc, PageBreak()])
    story.extend(markdown_story(source))

    doc = DelveDocTemplate(str(OUTPUT))
    doc.multiBuild(story)
    return OUTPUT


if __name__ == "__main__":
    path = build_pdf()
    print(path)
