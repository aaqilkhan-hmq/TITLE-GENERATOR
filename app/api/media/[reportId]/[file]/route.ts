import fs from "fs";
import path from "path";
import { mimeFromName } from "@/lib/images";
import { uploadDir } from "@/lib/reports";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ reportId: string; file: string }> }
) {
  const { reportId, file } = await context.params;
  if (!/^report-\d+$/.test(reportId) || !/^[\w.-]+$/.test(file)) {
    return new Response("Not found", { status: 404 });
  }
  const dir = uploadDir(reportId);
  const full = path.resolve(dir, file);
  if (!full.startsWith(path.resolve(dir)) || !fs.existsSync(full)) {
    return new Response("Not found", { status: 404 });
  }
  const bytes = fs.readFileSync(full);
  return new Response(bytes, {
    headers: {
      "Content-Type": mimeFromName(file),
      "Cache-Control": "private, max-age=86400",
    },
  });
}
