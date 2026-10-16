import { NextResponse } from "next/server";
import { listReports } from "@/lib/reports";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(listReports());
}
