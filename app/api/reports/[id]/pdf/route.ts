import { NextResponse } from "next/server";
import { renderReportPdf } from "@/lib/pdfReport";
import { readReport } from "@/lib/reports";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const report = readReport(id);
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    const pdf = await renderReportPdf(report);
    const filename = `${report.name.replace(/[^\w.-]+/g, "-")}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not build the PDF" }, { status: 500 });
  }
}
