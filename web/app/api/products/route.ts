import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const brand = searchParams.get("brand") || "";
  const supermarket = searchParams.get("supermarket") || "";
  const promoDates = searchParams.get("promo_dates") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 50;
  const offset = (page - 1) * limit;

  try {
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIdx = 1;

    if (search) {
      conditions.push(`LOWER(p.product_name) LIKE LOWER($${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (brand) {
      conditions.push(`LOWER(p.brand) = LOWER($${paramIdx})`);
      params.push(brand);
      paramIdx++;
    }
    if (supermarket) {
      conditions.push(`LOWER(s.supermarket) = LOWER($${paramIdx})`);
      params.push(supermarket);
      paramIdx++;
    }
    if (promoDates) {
      conditions.push(`s.promo_dates = $${paramIdx}`);
      params.push(promoDates);
      paramIdx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countQuery = `SELECT COUNT(*)::int as total FROM products p JOIN scans s ON p.scan_id = s.id ${where}`;
    const countResult = await sql.query(countQuery, params);

    const dataQuery = `SELECT p.*, pi.image_url, pi.page_num, s.supermarket, s.promo_dates
      FROM products p
      JOIN page_images pi ON p.page_image_id = pi.id
      JOIN scans s ON p.scan_id = s.id
      ${where}
      ORDER BY p.scan_id DESC, pi.page_num, p.id
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    const products = await sql.query(dataQuery, [...params, limit, offset]);

    const total = countResult[0].total;
    return NextResponse.json({ products, total, page, limit });
  } catch (error) {
    console.error("Products API error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
