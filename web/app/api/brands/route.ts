import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const brands = await sql`
    SELECT DISTINCT brand, COUNT(*) as count
    FROM products
    WHERE brand != ''
    GROUP BY brand
    ORDER BY count DESC
  `;
  return NextResponse.json(brands);
}
