from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
RENDER_DIR = ROOT / "tmp" / "pdfs" / "delve_design_system_render_final"
OUTPUT_DIR = ROOT / "tmp" / "pdfs" / "delve_design_system_contact_sheets_final"

files = sorted(RENDER_DIR.glob("page-*.png"), key=lambda path: int(path.stem.split("-")[-1]))
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

columns = 4
rows = 5
thumb_width = 330
label_height = 28
gutter = 18
cell_height = int(thumb_width * 1.414) + label_height
sheet_width = gutter + columns * (thumb_width + gutter)
sheet_height = gutter + rows * (cell_height + gutter)
font = ImageFont.truetype(r"C:\Windows\Fonts\seguisb.ttf", 18)

for batch_start in range(0, len(files), columns * rows):
    batch = files[batch_start : batch_start + columns * rows]
    sheet = Image.new("RGB", (sheet_width, sheet_height), "#D8D2DF")
    draw = ImageDraw.Draw(sheet)
    for index, path in enumerate(batch):
        row, column = divmod(index, columns)
        x = gutter + column * (thumb_width + gutter)
        y = gutter + row * (cell_height + gutter)
        image = Image.open(path).convert("RGB")
        ratio = thumb_width / image.width
        thumb = image.resize((thumb_width, int(image.height * ratio)), Image.Resampling.LANCZOS)
        draw.rectangle((x - 1, y - 1, x + thumb.width + 1, y + thumb.height + 1), fill="#7D7486")
        sheet.paste(thumb, (x, y))
        page_number = int(path.stem.split("-")[-1])
        draw.text((x, y + thumb.height + 4), f"Page {page_number}", fill="#241B2D", font=font)
    out = OUTPUT_DIR / f"contact-{batch_start // (columns * rows) + 1:02d}.jpg"
    sheet.save(out, quality=90)
    print(out)
