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
const HEADING_AFTER_GAP_MM = 2.5;
const RULE_AFTER_GAP_MM = 4;
const SECTION_GAP_MM = 5;
const JOB_ENTRY_GAP_MM = 4;
const BULLET_TOP_GAP_MM = 1.5;
const BULLET_INDENT_MM = 5;
const COLUMN_GAP_MM = 10;

const DATE_PATTERN =
  /(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*)?\d{4}\s*[-–—]\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*)?(?:\d{4}|Present|Current)|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}\s*[-–—]\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*)?(?:\d{4}|Present|Current)/i;

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

function isSkillsSection(title: string): boolean {
  const upper = title.toUpperCase();
  return upper.includes("SKILL") || upper.includes("COMPETENC");
}

function isExperienceSection(title: string): boolean {
  const upper = title.toUpperCase();
  return upper.includes("EXPERIENCE") || upper.includes("EMPLOYMENT");
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

type JobHeader = {
  title: string;
  company: string;
  dates: string;
};

function extractDates(text: string): { remainder: string; dates: string } {
  const match = text.match(DATE_PATTERN);
  if (!match) return { remainder: text.trim(), dates: "" };
  const dates = match[0].trim();
  const remainder = text.replace(DATE_PATTERN, "").replace(/[,|]\s*$/, "").trim();
  return { remainder, dates };
}

function parseJobHeader(line: string): JobHeader | null {
  const trimmed = line.trim();
  if (!trimmed || isBulletLine(trimmed) || isSectionHeader(trimmed)) return null;

  if (trimmed.includes("|")) {
    const parts = trimmed.split("|").map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1];
      if (DATE_PATTERN.test(lastPart)) {
        return {
          title: parts[0],
          company: parts.length >= 3 ? parts.slice(1, -1).join(", ") : "",
          dates: lastPart,
        };
      }
      const { remainder, dates } = extractDates(parts[1]);
      return { title: parts[0], company: remainder, dates };
    }
  }

  const dashMatch = trimmed.match(/^(.+?)\s+[—–-]\s+(.+)$/);
  if (dashMatch) {
    const { remainder, dates } = extractDates(dashMatch[2]);
    return { title: dashMatch[1].trim(), company: remainder, dates };
  }

  if (DATE_PATTERN.test(trimmed)) {
    const { remainder, dates } = extractDates(trimmed);
    const commaParts = remainder.split(",").map((part) => part.trim()).filter(Boolean);
    if (commaParts.length >= 2) {
      return { title: commaParts[0], company: commaParts[1], dates };
    }
    return { title: remainder, company: "", dates };
  }

  if (trimmed.includes(",")) {
    const commaParts = trimmed.split(",").map((part) => part.trim()).filter(Boolean);
    if (commaParts.length >= 2 && commaParts[0].length < 60) {
      return { title: commaParts[0], company: commaParts[1], dates: "" };
    }
  }

  return null;
}

function isLikelyJobTitleLine(line: string, nextLine?: string): boolean {
  if (parseJobHeader(line)) return true;
  if (isBulletLine(line) || isSectionHeader(line)) return false;
  if (line.length > 90) return false;
  if (nextLine && isBulletLine(nextLine)) return true;
  if (nextLine && parseJobHeader(nextLine)) return true;
  return false;
}

function extractSkillItems(lines: string[]): string[] {
  const items: string[] = [];

  for (const line of lines) {
    if (isBulletLine(line)) {
      items.push(stripBullet(line));
      continue;
    }

    if (line.includes(":")) {
      const afterColon = line.split(":").slice(1).join(":").trim();
      if (afterColon.includes(",")) {
        items.push(...afterColon.split(",").map((part) => part.trim()).filter(Boolean));
      } else if (afterColon) {
        items.push(afterColon);
      }
      continue;
    }

    if (line.includes(",")) {
      items.push(...line.split(",").map((part) => part.trim()).filter(Boolean));
      continue;
    }

    items.push(line.trim());
  }

  return items.filter(Boolean);
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

function renderSectionHeading(
  doc: jsPDF,
  title: string,
  y: number,
  pageWidth: number,
  style: FormatStyle,
): number {
  const fontSize = FONT_SIZE_SECTION;
  const textHeight = ptToMm(fontSize);
  const ruleSpace = style === "Minimal" ? 0 : HEADING_AFTER_GAP_MM + RULE_AFTER_GAP_MM;
  y = ensureSpace(doc, y, textHeight + ruleSpace + lineHeightMm(FONT_SIZE_BODY));

  doc.setFont("helvetica", "bold");
  doc.setFontSize(fontSize);

  if (style === "Modern") {
    doc.setTextColor(30, 30, 30);
  } else {
    doc.setTextColor(0, 0, 0);
  }

  doc.text(title, MARGIN_MM, y);

  let cursor = y + textHeight + HEADING_AFTER_GAP_MM;

  if (style !== "Minimal") {
    doc.setDrawColor(style === "Modern" ? 50 : 0, style === "Modern" ? 50 : 0, style === "Modern" ? 50 : 0);
    doc.setLineWidth(style === "Modern" ? 0.3 : 0.5);
    doc.line(MARGIN_MM, cursor, pageWidth - MARGIN_MM, cursor);
    cursor += RULE_AFTER_GAP_MM;
  }

  doc.setTextColor(0, 0, 0);
  return cursor;
}

function writeTwoColumnList(
  doc: jsPDF,
  items: string[],
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
): number {
  if (items.length === 0) return y;

  const colWidth = (maxWidth - COLUMN_GAP_MM) / 2;
  const xRight = x + colWidth + COLUMN_GAP_MM;
  const mid = Math.ceil(items.length / 2);
  const leftItems = items.slice(0, mid);
  const rightItems = items.slice(mid);
  const rows = Math.max(leftItems.length, rightItems.length);
  const lh = lineHeightMm(fontSize);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);

  for (let i = 0; i < rows; i++) {
    const leftWrapped = leftItems[i] ? (doc.splitTextToSize(leftItems[i], colWidth) as string[]) : [];
    const rightWrapped = rightItems[i] ? (doc.splitTextToSize(rightItems[i], colWidth) as string[]) : [];
    const rowLines = Math.max(leftWrapped.length, rightWrapped.length, 1);

    y = ensureSpace(doc, y, lh * rowLines);

    for (let j = 0; j < rowLines; j++) {
      const rowY = y + j * lh;
      if (leftWrapped[j]) doc.text(leftWrapped[j], x, rowY);
      if (rightWrapped[j]) doc.text(rightWrapped[j], xRight, rowY);
    }

    y += lh * rowLines;
  }

  return y;
}

function renderJobHeader(
  doc: jsPDF,
  header: JobHeader,
  y: number,
  maxWidth: number,
): number {
  const titleLine = header.company ? `${header.title} — ${header.company}` : header.title;

  doc.setFont("helvetica", "bold");
  y = writeWrappedLine(doc, titleLine, MARGIN_MM, y, maxWidth, FONT_SIZE_BODY);
  doc.setFont("helvetica", "normal");

  if (header.dates) {
    y = writeWrappedLine(doc, header.dates, MARGIN_MM, y, maxWidth, FONT_SIZE_BODY);
  }

  return y + BULLET_TOP_GAP_MM;
}

function renderExperienceSection(doc: jsPDF, lines: string[], y: number, maxWidth: number): number {
  let i = 0;
  let isFirstJob = true;

  while (i < lines.length) {
    const line = lines[i];
    const nextLine = lines[i + 1];

    if (isBulletLine(line)) {
      const bulletText = stripBullet(line);
      y = writeWrappedLine(doc, `•  ${bulletText}`, MARGIN_MM, y, maxWidth, FONT_SIZE_BODY, BULLET_INDENT_MM);
      i++;
      continue;
    }

    if (!isLikelyJobTitleLine(line, nextLine)) {
      y = writeWrappedLine(doc, line, MARGIN_MM, y, maxWidth, FONT_SIZE_BODY);
      i++;
      continue;
    }

    if (!isFirstJob) {
      y += JOB_ENTRY_GAP_MM;
    }
    isFirstJob = false;

    const parsed = parseJobHeader(line);
    if (parsed) {
      y = renderJobHeader(doc, parsed, y, maxWidth);
      i++;
      continue;
    }

    if (nextLine && !isBulletLine(nextLine)) {
      const parsedNext = parseJobHeader(nextLine);
      if (parsedNext) {
        y = renderJobHeader(
          doc,
          {
            title: line,
            company: parsedNext.company || parsedNext.title,
            dates: parsedNext.dates,
          },
          y,
          maxWidth,
        );
        i += 2;
        continue;
      }
    }

    y = renderJobHeader(doc, { title: line, company: "", dates: "" }, y, maxWidth);
    i++;
  }

  return y;
}

function renderDefaultSection(doc: jsPDF, lines: string[], y: number, maxWidth: number): number {
  for (const line of lines) {
    if (isBulletLine(line)) {
      const bulletText = stripBullet(line);
      y = writeWrappedLine(doc, `•  ${bulletText}`, MARGIN_MM, y, maxWidth, FONT_SIZE_BODY, BULLET_INDENT_MM);
    } else {
      y = writeWrappedLine(doc, line, MARGIN_MM, y, maxWidth, FONT_SIZE_BODY);
    }
  }

  return y;
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

    y += SECTION_GAP_MM * 0.5;
  }

  for (const section of sections) {
    y = renderSectionHeading(doc, section.title, y, pageWidth, formatStyle);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);

    if (isSkillsSection(section.title)) {
      const skills = extractSkillItems(section.lines);
      y = writeTwoColumnList(doc, skills, MARGIN_MM, y, maxWidth, FONT_SIZE_BODY);
    } else if (isExperienceSection(section.title)) {
      y = renderExperienceSection(doc, section.lines, y, maxWidth);
    } else {
      y = renderDefaultSection(doc, section.lines, y, maxWidth);
    }

    y += SECTION_GAP_MM;
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
