#!/usr/bin/env python3

import argparse
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    Image,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


INK = colors.HexColor("#162018")
MUTED = colors.HexColor("#5E685F")
GREEN = colors.HexColor("#79A83B")
PALE = colors.HexColor("#F2F6EC")
LINE = colors.HexColor("#D8E0D4")


def inline_markup(text):
    text = re.sub(r"!\[[^\]]*\]\([^)]+\)", "", text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<link href="\2" color="#51752C">\1</link>', text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"`([^`]+)`", r"<font name='Courier'>\1</font>", text)
    return text


def parse_table(lines):
    rows = []
    for line in lines:
        cells = [inline_markup(cell.strip()) for cell in line.strip().strip("|").split("|")]
        if all(re.fullmatch(r":?-{3,}:?", re.sub(r"<[^>]+>", "", cell)) for cell in cells):
            continue
        rows.append(cells)
    return rows


def build_story(markdown, image_path, styles):
    story = []
    lines = markdown.splitlines()
    index = 0
    image_added = False

    while index < len(lines):
        raw = lines[index].strip()
        if not raw:
            story.append(Spacer(1, 7))
            index += 1
            continue

        if raw.startswith("!["):
            if not image_added and image_path.exists():
                image = Image(str(image_path))
                image._restrictSize(6.9 * inch, 3.7 * inch)
                story.extend([image, Spacer(1, 7)])
                image_added = True
            index += 1
            continue

        if raw.startswith("# "):
            story.append(Paragraph(inline_markup(raw[2:]), styles["TitleCustom"]))
            story.append(Spacer(1, 7))
        elif raw.startswith("## "):
            story.append(Spacer(1, 8))
            story.append(Paragraph(inline_markup(raw[3:]), styles["HeadingCustom"]))
            story.append(HRFlowable(width="100%", thickness=0.6, color=LINE, spaceAfter=7))
        elif raw.startswith("### "):
            story.append(Paragraph(inline_markup(raw[4:]), styles["SubheadingCustom"]))
        elif raw.startswith("|"):
            table_lines = []
            while index < len(lines) and lines[index].strip().startswith("|"):
                table_lines.append(lines[index].strip())
                index += 1
            index -= 1
            rows = parse_table(table_lines)
            if rows:
                paragraph_rows = [
                    [Paragraph(cell, styles["TableText"]) for cell in row] for row in rows
                ]
                widths = [6.8 * inch / len(paragraph_rows[0])] * len(paragraph_rows[0])
                table = Table(paragraph_rows, colWidths=widths, repeatRows=1)
                table.setStyle(
                    TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (-1, 0), PALE),
                            ("TEXTCOLOR", (0, 0), (-1, 0), INK),
                            ("GRID", (0, 0), (-1, -1), 0.4, LINE),
                            ("VALIGN", (0, 0), (-1, -1), "TOP"),
                            ("LEFTPADDING", (0, 0), (-1, -1), 6),
                            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                            ("TOPPADDING", (0, 0), (-1, -1), 5),
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                        ]
                    )
                )
                story.append(table)
        elif raw.startswith("- "):
            bullets = []
            while index < len(lines) and lines[index].strip().startswith("- "):
                bullets.append(
                    ListItem(
                        Paragraph(inline_markup(lines[index].strip()[2:]), styles["BodyCustom"]),
                        leftIndent=12,
                    )
                )
                index += 1
            index -= 1
            story.append(
                ListFlowable(
                    bullets,
                    bulletType="bullet",
                    start="circle",
                    leftIndent=18,
                    bulletColor=GREEN,
                )
            )
        else:
            paragraph_lines = [raw]
            while (
                index + 1 < len(lines)
                and lines[index + 1].strip()
                and not lines[index + 1].strip().startswith(("#", "-", "|", "!["))
            ):
                index += 1
                paragraph_lines.append(lines[index].strip())
            story.append(
                Paragraph(inline_markup(" ".join(paragraph_lines)), styles["BodyCustom"])
            )
        index += 1

    return story


def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.line(doc.leftMargin, 0.55 * inch, letter[0] - doc.rightMargin, 0.55 * inch)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(doc.leftMargin, 0.35 * inch, "PARALLAX RESEARCH REPORT")
    canvas.drawRightString(
        letter[0] - doc.rightMargin, 0.35 * inch, f"PAGE {doc.page}"
    )
    canvas.restoreState()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--markdown", required=True)
    parser.add_argument("--image", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--title", required=True)
    args = parser.parse_args()

    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            "TitleCustom",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=25,
            leading=29,
            textColor=INK,
            alignment=TA_CENTER,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            "HeadingCustom",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=17,
            textColor=INK,
        )
    )
    styles.add(
        ParagraphStyle(
            "SubheadingCustom",
            parent=styles["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=INK,
            spaceBefore=5,
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            "BodyCustom",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=14,
            textColor=INK,
            spaceAfter=5,
        )
    )
    styles.add(
        ParagraphStyle(
            "TableText",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=9.5,
            textColor=INK,
        )
    )

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    markdown = Path(args.markdown).read_text(encoding="utf-8")
    doc = SimpleDocTemplate(
        str(output),
        pagesize=letter,
        rightMargin=0.65 * inch,
        leftMargin=0.65 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.75 * inch,
        title=args.title,
        author="Parallax",
    )
    story = build_story(markdown, Path(args.image), styles)
    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)


if __name__ == "__main__":
    main()
