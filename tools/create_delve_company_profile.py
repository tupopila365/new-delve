from pathlib import Path

from PIL import Image
from reportlab.lib.colors import Color, HexColor, white
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output" / "pdf"
ASSET_DIR = ROOT / "tmp" / "pdfs" / "delve_company_profile"
OUTPUT_PDF = OUTPUT_DIR / "Delve_Company_Profile_2026.pdf"

LOGO_PATH = Path(r"C:\Users\kauna\Downloads\DELVE.jpg")
TEAM_PAGE_PATH = ROOT / "tmp" / "pdfs" / "pitch_review" / "page-14.png"
PHONE_PAGE_PATH = ROOT / "tmp" / "pdfs" / "pitch_review" / "page-08.png"

W, H = A4
MARGIN = 42

PURPLE = HexColor("#8C52FF")
DEEP_PURPLE = HexColor("#5F2FC9")
INK = HexColor("#17141D")
MUTED = HexColor("#67616F")
LILAC = HexColor("#F1E9FF")
PALE = HexColor("#FAF8FC")
LINE = HexColor("#DED7E8")
MINT = HexColor("#DDF7EF")
MINT_DARK = HexColor("#19765D")
GOLD = HexColor("#FFF0D5")
GOLD_DARK = HexColor("#9A5B00")


def register_fonts():
    pdfmetrics.registerFont(TTFont("Arial", r"C:\Windows\Fonts\arial.ttf"))
    pdfmetrics.registerFont(TTFont("Arial-Bold", r"C:\Windows\Fonts\arialbd.ttf"))


register_fonts()

BODY = ParagraphStyle(
    "Body",
    fontName="Arial",
    fontSize=9.2,
    leading=13.2,
    textColor=INK,
    spaceAfter=0,
)
BODY_SMALL = ParagraphStyle(
    "BodySmall",
    parent=BODY,
    fontSize=8.1,
    leading=11.2,
)
BODY_MUTED = ParagraphStyle(
    "BodyMuted",
    parent=BODY,
    textColor=MUTED,
)
DISPLAY = ParagraphStyle(
    "Display",
    fontName="Arial-Bold",
    fontSize=27,
    leading=30,
    textColor=INK,
)
H2 = ParagraphStyle(
    "H2",
    fontName="Arial-Bold",
    fontSize=15,
    leading=18,
    textColor=INK,
)
H3 = ParagraphStyle(
    "H3",
    fontName="Arial-Bold",
    fontSize=10,
    leading=12,
    textColor=INK,
)
LABEL = ParagraphStyle(
    "Label",
    fontName="Arial-Bold",
    fontSize=7.2,
    leading=9,
    textColor=PURPLE,
)
WHITE_BODY = ParagraphStyle(
    "WhiteBody",
    parent=BODY,
    textColor=white,
)
WHITE_SMALL = ParagraphStyle(
    "WhiteSmall",
    parent=BODY_SMALL,
    textColor=white,
)
CENTER_SMALL = ParagraphStyle(
    "CenterSmall",
    parent=BODY_SMALL,
    alignment=TA_CENTER,
)


def prepare_assets():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    ASSET_DIR.mkdir(parents=True, exist_ok=True)

    if not LOGO_PATH.exists():
        raise FileNotFoundError(f"Logo not found: {LOGO_PATH}")
    if not TEAM_PAGE_PATH.exists():
        raise FileNotFoundError(f"Rendered team slide not found: {TEAM_PAGE_PATH}")
    if not PHONE_PAGE_PATH.exists():
        raise FileNotFoundError(f"Rendered product slide not found: {PHONE_PAGE_PATH}")

    team_page = Image.open(TEAM_PAGE_PATH).convert("RGB")
    team_crops = {
        "tupopila.jpg": (113, 483, 689, 898),
        "michael.jpg": (812, 483, 1350, 898),
        "slysken.jpg": (1516, 483, 2094, 898),
    }
    for name, box in team_crops.items():
        team_page.crop(box).save(ASSET_DIR / name, quality=94)

    phone_page = Image.open(PHONE_PAGE_PATH).convert("RGB")
    phone_page.crop((165, 245, 675, 1115)).save(
        ASSET_DIR / "delve_product_phone.jpg", quality=94
    )


def draw_paragraph(c, text, x, top, width, style=BODY):
    paragraph = Paragraph(text, style)
    _, height = paragraph.wrap(width, 2000)
    paragraph.drawOn(c, x, top - height)
    return top - height


def draw_cover_image(c, image_path, x, y, width, height):
    image = Image.open(image_path)
    iw, ih = image.size
    scale = max(width / iw, height / ih)
    sw = iw * scale
    sh = ih * scale
    dx = x + (width - sw) / 2
    dy = y + (height - sh) / 2
    c.saveState()
    path = c.beginPath()
    path.rect(x, y, width, height)
    c.clipPath(path, stroke=0, fill=0)
    c.drawImage(ImageReader(image), dx, dy, sw, sh, mask="auto")
    c.restoreState()


def rounded_card(c, x, y, width, height, fill=white, radius=12, stroke=None):
    c.setFillColor(fill)
    c.setStrokeColor(stroke or fill)
    c.roundRect(x, y, width, height, radius, stroke=1 if stroke else 0, fill=1)


def pill(c, text, x, y, width, fill=LILAC, text_color=DEEP_PURPLE):
    c.setFillColor(fill)
    c.roundRect(x, y, width, 22, 11, stroke=0, fill=1)
    c.setFillColor(text_color)
    c.setFont("Arial-Bold", 7.5)
    c.drawCentredString(x + width / 2, y + 7.2, text)


def number_badge(c, number, x, y, fill=PURPLE):
    c.setFillColor(fill)
    c.circle(x, y, 10, stroke=0, fill=1)
    c.setFillColor(white)
    c.setFont("Arial-Bold", 7.4)
    c.drawCentredString(x, y - 2.7, str(number).zfill(2))


def page_header(c, section, title):
    c.setFillColor(PURPLE)
    c.setFont("Arial-Bold", 7.5)
    c.drawString(MARGIN, H - 40, section.upper())
    c.setFillColor(INK)
    c.setFont("Arial-Bold", 21)
    c.drawString(MARGIN, H - 68, title)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.8)
    c.line(MARGIN, H - 82, W - MARGIN, H - 82)


def page_footer(c, page_number):
    c.setFillColor(MUTED)
    c.setFont("Arial", 6.8)
    c.drawString(MARGIN, 24, "DELVE COMPANY PROFILE 2026")
    c.drawRightString(W - MARGIN, 24, f"{page_number:02d}")


def draw_cover(c):
    c.setFillColor(PURPLE)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    c.drawImage(
        ImageReader(LOGO_PATH),
        0,
        (H - W) / 2,
        W,
        W,
        preserveAspectRatio=True,
        mask="auto",
    )

    c.setFillColor(white)
    c.setFont("Arial-Bold", 9)
    c.drawString(MARGIN, H - 56, "COMPANY PROFILE")
    c.setFont("Arial", 8)
    c.drawRightString(W - MARGIN, H - 56, "2026")
    c.setStrokeColor(Color(1, 1, 1, alpha=0.55))
    c.line(MARGIN, H - 68, W - MARGIN, H - 68)

    c.setFont("Arial-Bold", 13)
    c.drawString(MARGIN, 112, "EVERYONE IS A TRAVELLER.")
    c.setFont("Arial", 9)
    c.drawString(MARGIN, 91, "Explore. Connect. Belong.")
    c.setFont("Arial", 7.5)
    c.drawString(MARGIN, 74, "Built in Namibia for a connected world.")
    c.setFont("Arial", 7.5)
    c.drawString(MARGIN, 42, "delveworldwide@gmail.com")
    c.drawRightString(W - MARGIN, 42, "+264 81 764 9719")
    c.showPage()


def draw_story_page(c):
    c.setFillColor(PALE)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    page_header(c, "01 / Our story", "Why Delve exists")

    draw_paragraph(
        c,
        "Discovery should not depend on being on social media.",
        MARGIN,
        H - 112,
        320,
        DISPLAY,
    )
    draw_paragraph(
        c,
        (
            "Delve began when founder Tupopila Kadhila wanted to find arts events in "
            "Windhoek, but most of the information was scattered across Instagram. "
            "She did not want to stay on social media simply to know what was happening "
            "in her own city."
        ),
        MARGIN,
        H - 218,
        307,
        BODY,
    )
    draw_paragraph(
        c,
        (
            "The same pattern appeared in travel. Many people assume that exploring "
            "Namibia is too expensive, while valuable resident, membership and "
            "cardholder offers - sometimes as much as 50 percent - remain difficult "
            "to discover. Local businesses also promote across disconnected channels "
            "and struggle to turn attention into bookings."
        ),
        MARGIN,
        H - 309,
        307,
        BODY,
    )

    right_x, right_y, right_w, right_h = 382, 122, 171, 610
    rounded_card(c, right_x, right_y, right_w, right_h, fill=LILAC, radius=18)
    c.setFillColor(PURPLE)
    c.setFont("Arial-Bold", 7.2)
    c.drawString(right_x + 18, right_y + right_h - 30, "THE SPARK")
    draw_paragraph(
        c,
        (
            '"I wanted one place where people could find what is happening, see the '
            "deals available to them and explore without depending on social media.\""
        ),
        right_x + 18,
        right_y + right_h - 48,
        right_w - 36,
        ParagraphStyle(
            "Quote",
            fontName="Arial-Bold",
            fontSize=12.2,
            leading=16,
            textColor=INK,
        ),
    )
    draw_cover_image(
        c,
        ASSET_DIR / "delve_product_phone.jpg",
        right_x + 18,
        right_y + 20,
        right_w - 36,
        285,
    )

    cards = [
        (
            "THE PROBLEM",
            "Travel, events, offers, transport and local commerce are fragmented across social media, messaging apps and unrelated booking sites.",
            350,
            LILAC,
        ),
        (
            "OUR RESPONSE",
            "A trusted platform where people discover, compare, book, pay, connect and review - while businesses manage visibility and demand.",
            238,
            MINT,
        ),
    ]
    for label, body, y, fill in cards:
        rounded_card(c, MARGIN, y, 307, 92, fill=fill, radius=12)
        c.setFillColor(PURPLE if fill == LILAC else MINT_DARK)
        c.setFont("Arial-Bold", 7.2)
        c.drawString(MARGIN + 14, y + 68, label)
        draw_paragraph(c, body, MARGIN + 14, y + 54, 279, BODY_SMALL)

    rounded_card(c, MARGIN, 75, 148, 142, fill=PURPLE, radius=12)
    c.setFillColor(white)
    c.setFont("Arial-Bold", 7.2)
    c.drawString(MARGIN + 14, 191, "MISSION")
    draw_paragraph(
        c,
        "Make local experiences, services and savings easier to discover and access.",
        MARGIN + 14,
        170,
        120,
        WHITE_BODY,
    )

    rounded_card(c, MARGIN + 159, 75, 148, 142, fill=INK, radius=12)
    c.setFillColor(white)
    c.setFont("Arial-Bold", 7.2)
    c.drawString(MARGIN + 173, 191, "VISION")
    draw_paragraph(
        c,
        "Build a connected travel ecosystem where every city can become a living local network.",
        MARGIN + 173,
        170,
        120,
        WHITE_BODY,
    )

    page_footer(c, 2)
    c.showPage()


def draw_platform_page(c):
    c.setFillColor(white)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    page_header(c, "02 / The platform", "One ecosystem. One account.")
    draw_paragraph(
        c,
        (
            "Delve connects discovery, booking, payment coordination and community "
            "in one mobile-first experience."
        ),
        MARGIN,
        H - 105,
        W - 2 * MARGIN,
        BODY_MUTED,
    )

    journey_y = 675
    journey = ["Discover", "Compare", "Book", "Pay", "Experience", "Review"]
    start_x = MARGIN + 14
    step_gap = 91
    c.setStrokeColor(LINE)
    c.setLineWidth(2)
    c.line(start_x, journey_y, start_x + step_gap * 5, journey_y)
    for i, label in enumerate(journey, start=1):
        x = start_x + (i - 1) * step_gap
        number_badge(c, i, x, journey_y)
        c.setFillColor(INK)
        c.setFont("Arial-Bold", 7.1)
        c.drawCentredString(x, journey_y - 28, label.upper())

    categories = [
        ("STAY", "Accommodation"),
        ("MOVE", "Transport"),
        ("TASTE", "Food and drinks"),
        ("EXPLORE", "Tours and guides"),
        ("DO", "Activities and events"),
        ("SHOP", "Local products"),
        ("CONNECT", "Messaging"),
        ("DELVERS", "Community and stories"),
        ("JOURNEYS", "Routes and memories"),
        ("TRUST", "Reviews"),
        ("SAVE", "Deals and offers"),
        ("GROW", "Business profiles"),
    ]
    grid_top = 610
    col_w = 120
    gap_x = 9
    row_h = 58
    gap_y = 8
    for idx, (label, detail) in enumerate(categories):
        col = idx % 4
        row = idx // 4
        x = MARGIN + col * (col_w + gap_x)
        y = grid_top - row * (row_h + gap_y) - row_h
        rounded_card(c, x, y, col_w, row_h, fill=PALE, radius=9, stroke=LINE)
        c.setFillColor(PURPLE)
        c.setFont("Arial-Bold", 7)
        c.drawString(x + 10, y + 36, label)
        c.setFillColor(INK)
        c.setFont("Arial", 8)
        c.drawString(x + 10, y + 17, detail)

    panel_y = 252
    panel_h = 142
    panel_w = 247
    rounded_card(c, MARGIN, panel_y, panel_w, panel_h, fill=LILAC, radius=13)
    c.setFillColor(PURPLE)
    c.setFont("Arial-Bold", 7.3)
    c.drawString(MARGIN + 14, panel_y + panel_h - 24, "FOR TRAVELLERS AND LOCAL EXPLORERS")
    draw_paragraph(
        c,
        (
            "<b>Find more:</b> events, stays, transport, food, tours and local products.<br/>"
            "<b>Spend better:</b> compare options and uncover resident or membership deals.<br/>"
            "<b>Travel with confidence:</b> message providers, book, review and keep the journey connected."
        ),
        MARGIN + 14,
        panel_y + panel_h - 42,
        panel_w - 28,
        BODY_SMALL,
    )

    right_x = MARGIN + panel_w + 13
    rounded_card(c, right_x, panel_y, panel_w, panel_h, fill=MINT, radius=13)
    c.setFillColor(MINT_DARK)
    c.setFont("Arial-Bold", 7.3)
    c.drawString(right_x + 14, panel_y + panel_h - 24, "FOR BUSINESSES AND INFORMAL OPERATORS")
    draw_paragraph(
        c,
        (
            "<b>Become discoverable:</b> create a verified profile and publish listings.<br/>"
            "<b>Turn interest into business:</b> receive inquiries, bookings and orders.<br/>"
            "<b>Build trust:</b> promote offers, collect reviews and track activity from one place."
        ),
        right_x + 14,
        panel_y + panel_h - 42,
        panel_w - 28,
        BODY_SMALL,
    )

    rounded_card(c, MARGIN, 75, W - 2 * MARGIN, 150, fill=INK, radius=14)
    c.setFillColor(white)
    c.setFont("Arial-Bold", 7.4)
    c.drawString(MARGIN + 16, 199, "FINTECH ROLE")
    draw_paragraph(
        c,
        (
            "<b>Current MVP:</b> simulated payment, payout and dispute workflows for safe product testing.<br/>"
            "<b>Planned live model:</b> customer payments processed through a licensed payment provider; "
            "provider payouts released after the service is completed; refunds and disputes recorded and reviewed.<br/>"
            "<b>Responsible design:</b> Delve will not store raw card details and will introduce live payments only "
            "after security, KYC/AML and regulatory requirements have been addressed."
        ),
        MARGIN + 16,
        181,
        W - 2 * MARGIN - 32,
        WHITE_SMALL,
    )

    page_footer(c, 3)
    c.showPage()


def draw_community_page(c):
    c.setFillColor(PALE)
    c.rect(0, 0, W, H, stroke=0, fill=1)

    c.setFillColor(PURPLE)
    c.rect(0, H - 260, W, 260, stroke=0, fill=1)
    c.setFillColor(white)
    c.setFont("Arial-Bold", 7.5)
    c.drawString(MARGIN, H - 42, "03 / COMMUNITY AND MEMORIES")
    draw_paragraph(
        c,
        "Everyone is a traveller.",
        MARGIN,
        H - 78,
        W - 2 * MARGIN,
        ParagraphStyle(
            "MottoDisplay",
            fontName="Arial-Bold",
            fontSize=32,
            leading=36,
            textColor=white,
        ),
    )
    draw_paragraph(
        c,
        (
            "Not everyone flies across the world. But everyone goes somewhere, "
            "visits family, explores their city, finds a cafe or discovers something worth sharing."
        ),
        MARGIN,
        H - 135,
        430,
        ParagraphStyle(
            "MottoBody",
            fontName="Arial",
            fontSize=12,
            leading=16,
            textColor=white,
        ),
    )
    c.setFont("Arial-Bold", 8)
    c.drawString(MARGIN, H - 218, "DELVERS + JOURNEYS TURN EVERYDAY MOVEMENT INTO DISCOVERY.")

    gap = 14
    card_y = 298
    card_h = 258
    card_w = (W - 2 * MARGIN - gap) / 2

    rounded_card(c, MARGIN, card_y, card_w, card_h, fill=LILAC, radius=15)
    c.setFillColor(PURPLE)
    c.setFont("Arial-Bold", 8)
    c.drawString(MARGIN + 16, card_y + card_h - 28, "DELVERS")
    draw_paragraph(
        c,
        "The living community",
        MARGIN + 16,
        card_y + card_h - 47,
        card_w - 32,
        H2,
    )
    draw_paragraph(
        c,
        (
            "Delvers is where people share real experiences and help one another "
            "discover what is worth seeing, doing and supporting."
        ),
        MARGIN + 16,
        card_y + card_h - 83,
        card_w - 32,
        BODY_SMALL,
    )
    delvers_items = [
        "Share photos, videos, stories, travel tips and local discoveries.",
        "Follow creators, destinations, interests and community boards.",
        "Like, save, comment on and discuss useful recommendations.",
        "Move from inspiration to relevant places, offers and services on Delve.",
    ]
    cursor = card_y + card_h - 138
    for idx, text in enumerate(delvers_items, start=1):
        number_badge(c, idx, MARGIN + 26, cursor + 4)
        cursor = draw_paragraph(
            c, text, MARGIN + 44, cursor + 11, card_w - 60, BODY_SMALL
        ) - 10

    right_x = MARGIN + card_w + gap
    rounded_card(c, right_x, card_y, card_w, card_h, fill=MINT, radius=15)
    c.setFillColor(MINT_DARK)
    c.setFont("Arial-Bold", 8)
    c.drawString(right_x + 16, card_y + card_h - 28, "JOURNEYS")
    draw_paragraph(
        c,
        "A travel record that helps others",
        right_x + 16,
        card_y + card_h - 47,
        card_w - 32,
        H2,
    )
    draw_paragraph(
        c,
        (
            "Journeys lets every traveller document a trip in a useful, structured "
            "way - whether it is across Namibia or across town."
        ),
        right_x + 16,
        card_y + card_h - 83,
        card_w - 32,
        BODY_SMALL,
    )
    journey_items = [
        "Record routes, stops, dates, transport modes and total costs.",
        "Add photos, videos, notes, highlights and honest reflections.",
        "Link journey stops to bookable Delve listings and businesses.",
        "Keep a journey public, private or in draft, then share moments to Delvers.",
    ]
    cursor = card_y + card_h - 138
    for idx, text in enumerate(journey_items, start=1):
        number_badge(c, idx, right_x + 26, cursor + 4, fill=MINT_DARK)
        cursor = draw_paragraph(
            c, text, right_x + 44, cursor + 11, card_w - 60, BODY_SMALL
        ) - 10

    rounded_card(c, MARGIN, 76, W - 2 * MARGIN, 190, fill=white, radius=15, stroke=LINE)
    c.setFillColor(INK)
    c.setFont("Arial-Bold", 8)
    c.drawString(MARGIN + 16, 239, "HOW THE TWO WORK TOGETHER")
    flow = [
        ("EXPERIENCE", "Go somewhere"),
        ("CAPTURE", "Build a Journey"),
        ("SHARE", "Post to Delvers"),
        ("INSPIRE", "Help another person"),
        ("DISCOVER", "Start a new journey"),
    ]
    flow_y = 165
    start_x = MARGIN + 27
    flow_gap = 104
    c.setStrokeColor(LINE)
    c.setLineWidth(2)
    c.line(start_x, flow_y, start_x + flow_gap * 4, flow_y)
    for idx, (label, detail) in enumerate(flow, start=1):
        x = start_x + (idx - 1) * flow_gap
        number_badge(c, idx, x, flow_y, fill=INK if idx % 2 else PURPLE)
        c.setFillColor(INK)
        c.setFont("Arial-Bold", 6.8)
        c.drawCentredString(x, flow_y - 27, label)
        draw_paragraph(
            c,
            detail,
            x - 43,
            flow_y - 37,
            86,
            ParagraphStyle(
                f"Flow{idx}",
                parent=CENTER_SMALL,
                fontSize=7.2,
                leading=9,
                textColor=MUTED,
            ),
        )
    draw_paragraph(
        c,
        (
            "Together, Delvers and Journeys make Delve more than a booking platform: "
            "they preserve memories, reveal real costs and turn lived experience into trusted discovery."
        ),
        MARGIN + 16,
        111,
        W - 2 * MARGIN - 32,
        ParagraphStyle(
            "FlywheelClose",
            fontName="Arial-Bold",
            fontSize=8.8,
            leading=12,
            textColor=INK,
            alignment=TA_CENTER,
        ),
    )

    page_footer(c, 4)
    c.showPage()


def draw_market_page(c):
    c.setFillColor(PALE)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    page_header(c, "04 / Market and model", "Namibia first. Global by design.")

    rounded_card(c, MARGIN, 620, W - 2 * MARGIN, 110, fill=PURPLE, radius=15)
    draw_paragraph(
        c,
        (
            "Delve starts by making Namibia's experiences, businesses and deals easier "
            "to discover. The same city-by-city model can then be repeated internationally "
            "while each destination remains locally relevant."
        ),
        MARGIN + 18,
        696,
        W - 2 * MARGIN - 36,
        ParagraphStyle(
            "PurpleIntro",
            fontName="Arial-Bold",
            fontSize=13.2,
            leading=17,
            textColor=white,
        ),
    )

    c.setFillColor(INK)
    c.setFont("Arial-Bold", 8)
    c.drawString(MARGIN, 594, "INITIAL TARGET USERS")
    chips = [
        ("Namibian residents", 104),
        ("Youth", 52),
        ("Travellers", 68),
        ("Informal operators", 105),
        ("Merchants and MSMEs", 121),
    ]
    x = MARGIN
    for label, width in chips:
        pill(c, label, x, 557, width)
        x += width + 7

    col_y = 284
    col_h = 246
    gap = 10
    col_w = (W - 2 * MARGIN - 2 * gap) / 3
    columns = [
        (
            "WHY NAMIBIA",
            [
                ("01", "Events and local offers are fragmented across social channels."),
                ("02", "Domestic experiences can feel expensive when discounts are hard to find."),
                ("03", "Small businesses need affordable digital visibility and booking tools."),
            ],
            LILAC,
            PURPLE,
        ),
        (
            "REVENUE MODEL",
            [
                ("01", "Booking and transaction commissions"),
                ("02", "Business subscriptions and premium tools"),
                ("03", "Featured listings and promoted offers"),
                ("04", "Advertising, affiliate and travel partnerships"),
            ],
            GOLD,
            GOLD_DARK,
        ),
        (
            "CURRENT PROGRESS",
            [
                ("01", "Functional mobile-first MVP"),
                ("02", "Traveller, provider and admin interfaces"),
                ("03", "Booking, verification and moderation workflows"),
                ("04", "Simulated payment, payout and dispute systems"),
            ],
            MINT,
            MINT_DARK,
        ),
    ]
    for idx, (title, items, fill, accent) in enumerate(columns):
        x = MARGIN + idx * (col_w + gap)
        rounded_card(c, x, col_y, col_w, col_h, fill=fill, radius=13)
        c.setFillColor(accent)
        c.setFont("Arial-Bold", 7.3)
        c.drawString(x + 14, col_y + col_h - 24, title)
        cursor = col_y + col_h - 50
        for num, text in items:
            c.setFillColor(accent)
            c.setFont("Arial-Bold", 7)
            c.drawString(x + 14, cursor, num)
            cursor = draw_paragraph(
                c, text, x + 38, cursor + 6, col_w - 52, BODY_SMALL
            ) - 14

    rounded_card(c, MARGIN, 75, W - 2 * MARGIN, 183, fill=white, radius=14, stroke=LINE)
    c.setFillColor(PURPLE)
    c.setFont("Arial-Bold", 7.3)
    c.drawString(MARGIN + 16, 230, "NEXT PHASE")
    next_items = [
        ("01", "Complete security and performance testing."),
        ("02", "Integrate a licensed payment provider."),
        ("03", "Run a controlled pilot with Namibian events, tourism and MSME partners."),
        ("04", "Use pilot data to validate pricing, demand and the addressable market."),
    ]
    for idx, (num, text) in enumerate(next_items):
        col = idx % 2
        row = idx // 2
        x = MARGIN + 16 + col * 245
        y = 190 - row * 56
        number_badge(c, num, x + 10, y + 7, fill=INK)
        draw_paragraph(c, text, x + 29, y + 16, 198, BODY_SMALL)
    c.setFillColor(MUTED)
    c.setFont("Arial", 7.2)
    c.drawString(
        MARGIN + 16,
        91,
        "Market size is still being formally assessed; the pilot will provide evidence for a reliable estimate.",
    )

    page_footer(c, 5)
    c.showPage()


def draw_team_card(c, x, y, width, image_name, name, role, description):
    rounded_card(c, x, y, width, 304, fill=white, radius=13, stroke=LINE)
    draw_cover_image(c, ASSET_DIR / image_name, x + 10, y + 169, width - 20, 123)
    draw_paragraph(c, name, x + 12, y + 155, width - 24, H3)
    c.setFillColor(PURPLE)
    c.setFont("Arial-Bold", 6.8)
    c.drawString(x + 12, y + 119, role.upper())
    draw_paragraph(c, description, x + 12, y + 104, width - 24, BODY_SMALL)


def draw_team_page(c):
    c.setFillColor(white)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    page_header(c, "05 / Leadership", "The team building Delve")
    draw_paragraph(
        c,
        (
            "A founder-led team combining product development, operations, financial "
            "management and strategic guidance."
        ),
        MARGIN,
        H - 104,
        W - 2 * MARGIN,
        BODY_MUTED,
    )

    card_gap = 10
    card_w = (W - 2 * MARGIN - 2 * card_gap) / 3
    card_y = 400
    draw_team_card(
        c,
        MARGIN,
        card_y,
        card_w,
        "tupopila.jpg",
        "Tupopila Kadhila",
        "Founder, CEO and Product Lead",
        "Software developer building Delve from the ground up and leading the product vision.",
    )
    draw_team_card(
        c,
        MARGIN + card_w + card_gap,
        card_y,
        card_w,
        "michael.jpg",
        "Michael Kadhila",
        "Co-Founder and Head of Operations",
        "Leads operations, partnerships, financial management and the foundation needed to scale.",
    )
    draw_team_card(
        c,
        MARGIN + 2 * (card_w + card_gap),
        card_y,
        card_w,
        "slysken.jpg",
        "Slysken Kakuva",
        "Co-Founder and Board Observer",
        "Provides strategic guidance, industry insight and independent feedback for long-term growth.",
    )

    panel_y = 207
    panel_h = 164
    panel_gap = 12
    panel_w = (W - 2 * MARGIN - panel_gap) / 2
    rounded_card(c, MARGIN, panel_y, panel_w, panel_h, fill=LILAC, radius=13)
    c.setFillColor(PURPLE)
    c.setFont("Arial-Bold", 7.3)
    c.drawString(MARGIN + 14, panel_y + panel_h - 25, "GOVERNANCE")
    draw_paragraph(
        c,
        (
            "<b>Current structure:</b> founder-led governance with strategic observer support.<br/>"
            "<b>Financial oversight:</b> the CEO and Head of Operations review material expenditure.<br/>"
            "<b>Development:</b> formal policies, reporting controls and an advisory structure will be strengthened as Delve grows."
        ),
        MARGIN + 14,
        panel_y + panel_h - 45,
        panel_w - 28,
        BODY_SMALL,
    )

    panel_x = MARGIN + panel_w + panel_gap
    rounded_card(c, panel_x, panel_y, panel_w, panel_h, fill=MINT, radius=13)
    c.setFillColor(MINT_DARK)
    c.setFont("Arial-Bold", 7.3)
    c.drawString(panel_x + 14, panel_y + panel_h - 25, "12-MONTH PRIORITIES")
    draw_paragraph(
        c,
        (
            "1. Bring additional development capacity into the team.<br/>"
            "2. Complete payment, security and compliance readiness.<br/>"
            "3. Onboard pilot businesses and event organisers.<br/>"
            "4. Measure user demand, bookings and partner outcomes."
        ),
        panel_x + 14,
        panel_y + panel_h - 45,
        panel_w - 28,
        BODY_SMALL,
    )

    c.setFillColor(PURPLE)
    c.rect(0, 0, W, 174, stroke=0, fill=1)
    c.setFillColor(white)
    c.setFont("Arial-Bold", 21)
    c.drawString(MARGIN, 125, "Let us build a more connected")
    c.drawString(MARGIN, 100, "way to explore.")
    c.setFont("Arial-Bold", 8)
    c.drawString(MARGIN, 61, "DELVE")
    c.setFont("Arial", 7.8)
    c.drawString(MARGIN + 50, 61, "Windhoek, Namibia")
    c.drawRightString(W - MARGIN, 61, "delveworldwide@gmail.com")
    c.drawRightString(W - MARGIN, 42, "+264 81 764 9719")
    c.setFont("Arial-Bold", 7)
    c.drawString(MARGIN, 28, "EXPLORE. CONNECT. BELONG.")

    c.showPage()


def build_pdf():
    prepare_assets()
    c = canvas.Canvas(str(OUTPUT_PDF), pagesize=A4, pageCompression=1)
    c.setTitle("Delve Company Profile 2026")
    c.setAuthor("Delve")
    c.setSubject(
        "Company profile for Delve, a Namibia-built travel discovery, booking and payment marketplace."
    )
    c.setCreator("Delve")

    draw_cover(c)
    draw_story_page(c)
    draw_platform_page(c)
    draw_community_page(c)
    draw_market_page(c)
    draw_team_page(c)
    c.save()
    print(OUTPUT_PDF)


if __name__ == "__main__":
    build_pdf()
