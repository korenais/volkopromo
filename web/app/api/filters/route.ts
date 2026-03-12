import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const [brands, supermarkets, promoDates] = await Promise.all([
    sql`SELECT DISTINCT brand, COUNT(*)::int as count FROM products WHERE brand != '' GROUP BY brand ORDER BY count DESC`,
    sql`SELECT DISTINCT supermarket, COUNT(*)::int as count FROM scans WHERE supermarket != '' GROUP BY supermarket ORDER BY supermarket`,
    sql`SELECT DISTINCT promo_dates, COUNT(*)::int as count FROM scans WHERE promo_dates != '' GROUP BY promo_dates ORDER BY promo_dates DESC`,
  ]);
  return NextResponse.json({ brands, supermarkets, promoDates });
}
