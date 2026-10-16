import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { downloadImage } from "./images";
import { overlapPercent, reportStats, titleOverlap } from "./overlap";
import type { Report } from "./types";

function isJpegOrPng(bytes: Buffer) {
  if (bytes.length < 8) return false;
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return true;
  return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
}

async function loadPhoto(reportId: string, url: string) {
  let bytes: Buffer | null = null;
  const local = /^\/api\/media\/(report-\d+)\/([\w.-]+)$/.exec(url);
  if (local && local[1] === reportId) {
    const file = path.join(process.cwd(), "data", "uploads", reportId, local[2]);
    const resolved = path.resolve(file);
    const root = path.resolve(process.cwd(), "data", "uploads", reportId);
    if (resolved.startsWith(root) && fs.existsSync(resolved)) {
      bytes = fs.readFileSync(resolved);
    }
  } else if (url.startsWith("http")) {
    const downloaded = await downloadImage(url);
    bytes = Buffer.from(downloaded.base64, "base64");
  }
  if (!bytes) return null;
  if (isJpegOrPng(bytes)) return bytes;
  const sharp = (await import("sharp")).default;
  return sharp(bytes).jpeg({ quality: 82 }).toBuffer();
}

export async function renderReportPdf(report: Report) {
  const doc = new PDFDocument({ size: "LETTER", margin: 36, autoFirstPage: false });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const stats = reportStats(report);
  const statLine = [
    `Compared ${stats.compared}`,
    ...stats.generators.map(
      (generator) => `${generator.label} ${overlapPercent(generator.average)} · closer ${generator.closer}`
    ),
  ].join("    ");
  const rows = report.rows.length ? report.rows : [null];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    doc.addPage();
    const left = doc.page.margins.left;
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc.font("Helvetica").fontSize(10).fillColor("#6f6d66").text(
      `${report.name} · ${index + 1} of ${report.rows.length || 1}`,
      left,
      doc.page.margins.top,
      { width }
    );
    doc.moveDown(0.15);
    doc.font("Helvetica").fontSize(10).fillColor("#1c1c1a").text(statLine, { width });
    doc.moveDown(0.7);

    if (!row) {
      doc.font("Helvetica").fontSize(12).text("This report has no products.");
      continue;
    }

    const photos: Buffer[] = [];
    for (const url of row.imageUrls) {
      try {
        const photo = await loadPhoto(report.id, url);
        if (photo) photos.push(photo);
      } catch {
        // A missing photo still leaves the titles on the page.
      }
    }

    const columns = photos.length > 4 ? 3 : Math.max(photos.length, 1);
    const gap = 8;
    const rowsOfPhotos = photos.length ? Math.ceil(photos.length / columns) : 0;
    const photoSize = photos.length
      ? Math.min(168, (width - gap * (columns - 1)) / columns)
      : 0;
    let y = doc.y;
    photos.forEach((photo, photoIndex) => {
      const column = photoIndex % columns;
      const photoRow = Math.floor(photoIndex / columns);
      const x = left + column * (photoSize + gap);
      const photoY = y + photoRow * (photoSize + gap);
      try {
        doc.image(photo, x, photoY, { fit: [photoSize, photoSize], align: "center", valign: "center" });
      } catch {
        // Skip a photo the PDF library cannot draw.
      }
    });
    if (rowsOfPhotos) doc.y = y + rowsOfPhotos * (photoSize + gap);
    doc.moveDown(0.5);

    const writeBlock = (heading: string, body: string) => {
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#1c1c1a").text(heading, left, doc.y, { width });
      doc.font("Helvetica").fontSize(12).text(body || "—", { width });
      doc.moveDown(0.35);
    };

    writeBlock("ORIGINAL", row.originalTitle || "—");
    report.generators.forEach((generator, titleIndex) => {
      const slot = row.titles.find((item) => item.generatorId === generator.id);
      const body = slot?.title || slot?.error || row.error || "—";
      const score = titleOverlap(row.originalTitle, slot?.title || "");
      writeBlock(`Title ${titleIndex + 1}`, `${body}    ${overlapPercent(score)}`);
    });
  }

  doc.end();
  return done;
}
