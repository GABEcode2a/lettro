import type { jsPDF } from "jspdf";

type FormatStyle = "Classic" | "Modern" | "Minimal";

export type ResumeSection = {
  title: string;
  lines: string[];
};

const SECTION_HEADERS = [
  "PROFESSIONAL SUMMARY",
  "SUMMARY",
  "WORK EXPERIENCE",
  "EXPERIENCE",
  "EMPLOYMENT HISTORY",
  "SKILLS",
  "CORE COMPETENCIES",
  "TECHNICAL SKILLS",
  "EDUCATION",
  "CERTIFICATIONS",
  "CONTACT",
];

const FONT_SIZE_NAME = 16;
const FONT_SIZE_SECTION = 11;
const FONT_SIZE_BODY = 10;
const LINE_SPACING = 1.2;
const MARGIN_MM = 20;
const SECTION_GAP_LINES = 0.8;
const BULLET_INDENT_MM = 5;

function ptToMm(pt: number): number {
  return pt * 0.352778;
}

function lineHeightMm(fontSize: number): number {
  return ptToMm(fontSize) * LINE_SPACING;
}

function isSectionHeader(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length > 40) return false;
  const upper = trimmed.replace(/[^A-Za-z\s]/g, "").toUpperCase();
  return SECTION_HEADERS.some((header) => upper === header || upper.startsWith(header));
}

function isBulletLine(line: string): boolean {
  return /^[•\-\*–—]\s/.test(line.trim());
}

function stripBullet(line: string): string {
  return line.trim().replace(/^[•\-\*–—]\s*/, "");
}

function stripFormatting(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .trim();
}

export function parseResume(text: string): { contactLines: string[]; sections: ResumeSection[] } {
  const lines = text.split(/\r?\n/).map((l) => stripFormatting(l));
  const contactLines: string[] = [];
  const sections: ResumeSection[] = [];
  let currentSection: ResumeSection | null = null;
  let pastContact = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (isSectionHeader(line)) {
      pastContact = true;
      if (currentSection) sections.push(currentSection);
      currentSection = { title: line.toUpperCase(), lines: [] };
      continue;
    }

    if (!pastContact) {
      contactLines.push(line);
    } else if (currentSection) {
      currentSection.lines.push(line);
    }
  }

  if (currentSection) sections.push(currentSection);

  return { contactLines, sections };
}

function paintPageBackground(doc: jsPDF): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed <= pageHeight - MARGIN_MM) return y;

  doc.addPage();
  paintPageBackground(doc);
  return MARGIN_MM;
}

function writeLines(doc: jsPDF, lines: string[], x: number, y: number, fontSize: number): number {
  const lh = lineHeightMm(fontSize);
  doc.setFontSize(fontSize);

  for (const line of lines) {
    y = ensureSpace(doc, y, lh);
    doc.text(line, x, y);
    y += lh;
  }

  return y;
}

function writeWrappedLine(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  indent = 0,
): number {
  const lh = lineHeightMm(fontSize);
  doc.setFontSize(fontSize);
  const wrapped = doc.splitTextToSize(text, maxWidth - indent) as string[];

  for (const line of wrapped) {
    y = ensureSpace(doc, y, lh);
    doc.text(line, x + indent, y);
    y += lh;
  }

  return y;
}

function drawSectionRule(doc: jsPDF, y: number, pageWidth: number, style: FormatStyle): number {
  if (style === "Minimal") return y;

  const ruleY = y + 1;
  doc.setDrawColor(style === "Modern" ? 50 : 0, style === "Modern" ? 50 : 0, style === "Modern" ? 50 : 0);
  doc.setLineWidth(style === "Modern" ? 0.3 : 0.5);
  doc.line(MARGIN_MM, ruleY, pageWidth - MARGIN_MM, ruleY);
  return ruleY + lineHeightMm(FONT_SIZE_BODY) * 0.3;
}

export async function buildResumePdf(text: string, formatStyle: FormatStyle = "Classic"): Promise<jsPDF> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { contactLines, sections } = parseResume(text);

  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - MARGIN_MM * 2;

  paintPageBackground(doc);
  doc.setTextColor(0, 0, 0);

  let y = MARGIN_MM;

  if (contactLines.length > 0) {
    doc.setFont("helvetica", "bold");
    y = writeLines(doc, [contactLines[0]], MARGIN_MM, y, FONT_SIZE_NAME);

    doc.setFont("helvetica", "normal");
    const contactDetails = contactLines.slice(1);
    if (contactDetails.length > 0) {
      if (formatStyle === "Modern") {
        doc.setFontSize(FONT_SIZE_BODY);
        const contactLine = contactDetails.join("  |  ");
        y = writeWrappedLine(doc, contactLine, MARGIN_MM, y, maxWidth, FONT_SIZE_BODY);
      } else {
        y = writeLines(doc, contactDetails, MARGIN_MM, y, FONT_SIZE_BODY);
      }
    }

    y += lineHeightMm(FONT_SIZE_BODY) * 0.6;
  }

  for (const section of sections) {
    y = ensureSpace(doc, y, lineHeightMm(FONT_SIZE_SECTION) * 2);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(FONT_SIZE_SECTION);

    if (formatStyle === "Modern") {
      doc.setTextColor(30, 30, 30);
    } else {
      doc.setTextColor(0, 0, 0);
    }

    y = writeLines(doc, [section.title], MARGIN_MM, y, FONT_SIZE_SECTION);
    y = drawSectionRule(doc, y, pageWidth, formatStyle);
    y += lineHeightMm(FONT_SIZE_BODY) * 0.2;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);

    for (const line of section.lines) {
      if (isBulletLine(line)) {
        const bulletText = stripBullet(line);
        y = writeWrappedLine(doc, `•  ${bulletText}`, MARGIN_MM, y, maxWidth, FONT_SIZE_BODY, BULLET_INDENT_MM);
      } else {
        const isJobTitle =
          formatStyle !== "Minimal" &&
          !isBulletLine(line) &&
          (line.includes("|") || /\d{4}\s*[-–—]\s*(?:\d{4}|Present|Current)/i.test(line));

        if (isJobTitle) {
          doc.setFont("helvetica", "bold");
          y = writeWrappedLine(doc, line, MARGIN_MM, y, maxWidth, FONT_SIZE_BODY);
          doc.setFont("helvetica", "normal");
        } else {
          y = writeWrappedLine(doc, line, MARGIN_MM, y, maxWidth, FONT_SIZE_BODY);
        }
      }
    }

    y += lineHeightMm(FONT_SIZE_BODY) * SECTION_GAP_LINES;
  }

  return doc;
}

export async function downloadResumePdf(
  text: string,
  formatStyle: FormatStyle = "Classic",
  filename = "resume.pdf",
): Promise<void> {
  const doc = await buildResumePdf(text, formatStyle);
  doc.save(filename);
}
