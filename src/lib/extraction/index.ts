import mammoth from "mammoth";

export class ExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExtractionError";
  }
}

const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

export const MAX_CV_BYTES = 10 * 1024 * 1024; // 10MB
const MIN_MEANINGFUL_CHARS = 40;

export function isSupportedMimeType(mimeType: string): boolean {
  return SUPPORTED_MIME_TYPES.has(mimeType);
}

async function extractPdf(buffer: Buffer): Promise<string> {
  // pdf-parse v2's API is class-based (PDFParse#getText), not the old
  // callback-style default export from v1.
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function extractTxt(buffer: Buffer): string {
  return buffer.toString("utf-8");
}

export interface ExtractionOutcome {
  text: string;
  warning?: string;
}

export async function extractCvText(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractionOutcome> {
  if (buffer.byteLength === 0) {
    throw new ExtractionError("The uploaded file is empty.");
  }
  if (buffer.byteLength > MAX_CV_BYTES) {
    throw new ExtractionError(
      `The uploaded file is too large (${Math.round(buffer.byteLength / 1024 / 1024)}MB). Maximum is ${MAX_CV_BYTES / 1024 / 1024}MB.`
    );
  }
  if (!isSupportedMimeType(mimeType)) {
    throw new ExtractionError(`Unsupported file type: ${mimeType}. Upload a PDF, DOCX, or TXT file.`);
  }

  let text: string;
  try {
    if (mimeType === "application/pdf") {
      text = await extractPdf(buffer);
    } else if (mimeType === "text/plain") {
      text = extractTxt(buffer);
    } else {
      text = await extractDocx(buffer);
    }
  } catch (error) {
    throw new ExtractionError(
      `Failed to extract text from the document: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }

  const trimmed = text.trim();
  if (trimmed.length < MIN_MEANINGFUL_CHARS) {
    throw new ExtractionError(
      "Text extraction produced too little content to score. The file may be a scanned image or corrupted."
    );
  }

  return { text: trimmed };
}
