import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    app: "Indotek Sukses",
    version: "2.7.2",
    catalog_pagination: true,
    database_page_size: 1000,
  });
}
