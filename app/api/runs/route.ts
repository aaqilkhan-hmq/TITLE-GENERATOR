import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { parseCsv } from "@/lib/csv";
import { isBusy, startReport } from "@/lib/job";
import { largerImageUrl, mimeFromName } from "@/lib/images";
import { listGeneratorOptions, selectGenerators } from "@/lib/generators/registry";
import { nextReportNumber, uploadDir, writeReport } from "@/lib/reports";
import type { Report, ReportRow } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function listingImages(record: Record<string, string>) {
  const keys = Object.keys(record)
    .filter((key) => /^image_url(_\d+)?$/i.test(key))
    .sort((left, right) => {
      const rank = (key: string) => (key.toLowerCase() === "image_url" ? 1 : Number(key.split("_").pop()) || 0);
      return rank(left) - rank(right);
    });
  const urls: string[] = [];
  for (const key of keys) {
    for (const part of String(record[key] || "").split(/\s*\|\s*/)) {
      const url = part.trim();
      if (url.startsWith("http") && !urls.includes(largerImageUrl(url))) urls.push(largerImageUrl(url));
    }
  }
  return urls;
}

function rowsFromCsv(text: string): ReportRow[] {
  const records = parseCsv(text);
  if (!records.length) throw new Error("The CSV has no data rows");
  if (!("title" in records[0]) || !("image_url" in records[0])) {
    throw new Error("CSV must include title and image_url columns");
  }
  return records.map((record) => {
    const imageUrls = listingImages(record);
    return {
      originalTitle: String(record.title || "").trim(),
      itemUrl: String(record.item_url || "").trim(),
      imageUrls,
      titles: [],
      error: imageUrls.length ? undefined : "This row has no image URL",
    };
  });
}

export async function POST(request: Request) {
  if (isBusy()) {
    return NextResponse.json(
      { error: "A report is already running. Wait for it to finish." },
      { status: 409 }
    );
  }

  const form = await request.formData();
  const mode = String(form.get("mode") || "csv");
  const requested = String(form.get("generators") || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const selected = selectGenerators(requested);
  if (!selected.length) {
    return NextResponse.json({ error: "Choose at least one title generator." }, { status: 400 });
  }

  const number = nextReportNumber();
  const id = `report-${number}`;
  const generators = selected.map((generator) => ({ id: generator.id, label: generator.label }));

  try {
    let rows: ReportRow[] = [];
    let sourceName = "";
    let source: Report["source"] = "csv";

    if (mode === "product") {
      const files = form.getAll("images").filter((item): item is File => item instanceof File && item.size > 0);
      if (!files.length) {
        return NextResponse.json({ error: "Add at least one product photo." }, { status: 400 });
      }
      if (files.length > 24) {
        return NextResponse.json({ error: "Upload 24 photos or fewer for one product." }, { status: 400 });
      }
      const dir = uploadDir(id);
      const localFiles = [];
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const mime = file.type.startsWith("image/") ? file.type : mimeFromName(file.name);
        const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
        const name = `${index + 1}.${ext}`;
        const bytes = Buffer.from(await file.arrayBuffer());
        fs.writeFileSync(path.join(dir, name), bytes);
        localFiles.push({ name, mime });
      }
      source = "product";
      sourceName = "One product";
      rows = [
        {
          originalTitle: String(form.get("originalTitle") || "").trim(),
          imageUrls: localFiles.map((file) => `/api/media/${id}/${file.name}`),
          localFiles,
          titles: [],
        },
      ];
    } else {
      const pasted = String(form.get("csvText") || "");
      const file = form.get("csv");
      const text = file instanceof File && file.size > 0 ? await file.text() : pasted;
      if (!text.trim()) {
        return NextResponse.json({ error: "Upload or paste a CSV." }, { status: 400 });
      }
      sourceName = file instanceof File && file.name ? file.name : "Pasted CSV";
      rows = rowsFromCsv(text);
    }

    const report: Report = {
      id,
      number,
      name: `Report ${number}`,
      createdAt: new Date().toISOString(),
      source,
      sourceName,
      status: "running",
      progress: { done: 0, total: rows.length },
      generators,
      rows,
    };
    writeReport(report);
    startReport(id, generators.map((generator) => generator.id));
    return NextResponse.json({ id, generators: listGeneratorOptions() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start the report";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
