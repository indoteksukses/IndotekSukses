import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    app: "Indotek Sukses",
    version: "2.8.1",
    ui_performance_patch: true,
    profile_modal_portal: true,
    contained_card_modal_portals: true,
    modal_focus_management: true,
    reliable_header_menus: true,
    dashboard_lightweight_queries: true,
    dashboard_sales_pagination: true,
    catalog_pagination: true,
    database_page_size: 1000,
  });
}
