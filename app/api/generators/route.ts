import { NextResponse } from "next/server";
import { listGeneratorOptions } from "@/lib/generators/registry";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(listGeneratorOptions());
}
