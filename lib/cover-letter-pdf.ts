import type { jsPDF } from "jspdf";

export type ContactInfo = {
  name: string;
  email: string;
  phone: string;
};

export type ParsedLetter = {
  greeting: string;
  bodyParagraphs: string[];
  closingLine: string;
};

const EMAIL_RE = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i;
const PHONE_RE =
  /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{2,4}[\s.-]?\d{2,4}(?:[\s.-]?\d{2,9})?/;
const GREETING_RE = /^Dear\s+.+[,.]?\s*$/i;
const CLOSING_RE =
  /^(Best|Best regards|Kind regards|Warm regards|Sincerely|Regards|Thank you|Yours sincerely|Yours truly),?\s*$/i;
const NAME_LIKE_RE = /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ''.\-]*(?:\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ''.\-]*){1,3}$/;

const FONT_SIZE_PT = 11;
const LINE_SPACING = 1.15;
const MARGIN_MM = 25.4; // 1 inch
const PARAGRAPH_GAP_LINES = 0.65;

function ptToMm(pt: number): number {
  return pt * 0.352778;
}

function lineHeightMm(): number {
  return ptToMm(FONT_SIZE_PT) * LINE_SPACING;
}

function normalizePhone(raw: string): string {
  return raw.replace(/\s{2,}/g, " ").trim();
}

function looksLikeName(line: string): boolean {
  if (line.length > 48 || line.length < 3) return false;
  if (/@|https?:|www\.|\d{3,}/i.test(line)) return false;
  if (/^(cv|resume|curriculum vitae|profile|summary|experience|education)\b/i.test(line)) {
    return false;
  }
  return NAME_LIKE_RE.test(line);
}

export function extractContactFromResume(resume: string): ContactInfo {
  const text = resume.trim();
  const email = text.match(EMAIL_RE)?.[0] ?? "";
  const phoneMatch = text.match(PHONE_RE);
  const phone = phoneMatch ? normalizePhone(phoneMatch[0]) : "";

  let name = "";
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines.slice(0, 8)) {
    if (looksLikeName(line)) {
      name = line;
      break;
    }
  }

  if (!name && email) {
    const local = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
    if (local && /^[a-z\s]+$/i.test(local)) {
      name = local
        .split(/\s+/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");
    }
  }

  return { name, email, phone };
}

function stripFormatting(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-•*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isSignatureBlock(paragraph: string, contact: ContactInfo): boolean {
  const normalized = paragraph.replace(/\s+/g, " ").trim();
  const lower = normalized.toLowerCase();

  if (contact.name && lower === contact.name.toLowerCase()) return true;

  const contactBits = [contact.email, contact.phone].filter(Boolean);
  if (contactBits.length > 0 && contactBits.every((bit) => normalized.includes(bit))) {
    return true;
  }

  return false;
}

export function parseCoverLetter(text: string, contact: ContactInfo): ParsedLetter {
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .split(/\r?\n/)
        .map((line) => stripFormatting(line))
        .filter(Boolean)
        .join(" "),
    )
    .map((block) => stripFormatting(block))
    .filter(Boolean);

  let greeting = "Dear Hiring Manager,";
  let start = 0;
  let end = blocks.length;
  let closingLine = "Best,";

  if (blocks[0] && GREETING_RE.test(blocks[0])) {
    greeting = blocks[0].endsWith(",") ? blocks[0] : `${blocks[0]},`;
    start = 1;
  }

  for (let i = blocks.length - 1; i >= start; i--) {
    const firstLine = blocks[i].split(/\n/)[0]?.trim() ?? blocks[i];
    if (CLOSING_RE.test(firstLine)) {
      closingLine = firstLine.endsWith(",") ? firstLine : `${firstLine},`;
      end = i;
      break;
    }
    if (isSignatureBlock(blocks[i], contact)) {
      end = i;
    }
  }

  const bodyParagraphs = blocks
    .slice(start, end)
    .filter((block) => !isSignatureBlock(block, contact))
    .filter((block) => !CLOSING_RE.test(block));

  return { greeting, bodyParagraphs, closingLine };
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

function writeLines(doc: jsPDF, lines: string[], x: number, y: number): number {
  const lh = lineHeightMm();

  for (const line of lines) {
    y = ensureSpace(doc, y, lh);
    doc.text(line, x, y);
    y += lh;
  }

  return y;
}

function writeParagraph(
  doc: jsPDF,
  paragraph: string,
  x: number,
  y: number,
  maxWidth: number,
): number {
  const wrapped = doc.splitTextToSize(paragraph, maxWidth) as string[];
  y = writeLines(doc, wrapped, x, y);
  return y + lineHeightMm() * PARAGRAPH_GAP_LINES;
}

function contactLines(contact: ContactInfo): string[] {
  const lines: string[] = [];
  if (contact.email) lines.push(contact.email);
  if (contact.phone) lines.push(contact.phone);
  return lines;
}

export async function buildCoverLetterPdf(
  coverLetter: string,
  resume: string,
): Promise<jsPDF> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const contact = extractContactFromResume(resume);
  const parsed = parseCoverLetter(coverLetter, contact);

  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - MARGIN_MM * 2;
  const lh = lineHeightMm();

  paintPageBackground(doc);
  doc.setFont("times", "normal");
  doc.setFontSize(FONT_SIZE_PT);
  doc.setTextColor(0, 0, 0);

  let y = MARGIN_MM;

  if (contact.name) {
    y = writeLines(doc, [contact.name], MARGIN_MM, y);
  }

  for (const line of contactLines(contact)) {
    y = writeLines(doc, [line], MARGIN_MM, y);
  }

  y += lh * 1.5;

  y = writeParagraph(doc, parsed.greeting, MARGIN_MM, y, maxWidth);

  for (const paragraph of parsed.bodyParagraphs) {
    y = writeParagraph(doc, paragraph, MARGIN_MM, y, maxWidth);
  }

  y += lh * 0.35;
  y = writeLines(doc, [parsed.closingLine], MARGIN_MM, y);
  y += lh * 0.9;

  if (contact.name) {
    y = writeLines(doc, [contact.name], MARGIN_MM, y);
  }

  for (const line of contactLines(contact)) {
    y = writeLines(doc, [line], MARGIN_MM, y);
  }

  return doc;
}

export async function downloadCoverLetterPdf(
  coverLetter: string,
  resume: string,
  filename = "cover-letter.pdf",
): Promise<void> {
  const doc = await buildCoverLetterPdf(coverLetter, resume);
  doc.save(filename);
}
