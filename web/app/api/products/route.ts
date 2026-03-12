import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const brand = searchParams.get("brand") || "";
  const scanId = searchParams.get("scan_id") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 50;
  const offset = (page - 1) * limit;

  try {
    // Use tagged template for base query, build filters dynamically
    let products;
    let countResult;

    if (search && brand) {
      countResult = await sql`
        SELECT COUNT(*)::int as total FROM products p
        WHERE LOWER(p.product_name) LIKE LOWER(${'%' + search + '%'})
        AND LOWER(p.brand) = LOWER(${brand})
      `;
      products = await sql`
        SELECT p.*, pi.image_url, pi.page_num, s.supermarket, s.promo_dates
        FROM products p JOIN page_images pi ON p.page_image_id = pi.id JOIN scans s ON p.scan_id = s.id
        WHERE LOWER(p.product_name) LIKE LOWER(${'%' + search + '%'})
        AND LOWER(p.brand) = LOWER(${brand})
        ORDER BY p.scan_id DESC, pi.page_num, p.id
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (search) {
      countResult = await sql`
        SELECT COUNT(*)::int as total FROM products p
        WHERE LOWER(p.product_name) LIKE LOWER(${'%' + search + '%'})
      `;
      products = await sql`
        SELECT p.*, pi.image_url, pi.page_num, s.supermarket, s.promo_dates
        FROM products p JOIN page_images pi ON p.page_image_id = pi.id JOIN scans s ON p.scan_id = s.id
        WHERE LOWER(p.product_name) LIKE LOWER(${'%' + search + '%'})
        ORDER BY p.scan_id DESC, pi.page_num, p.id
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (brand) {
      countResult = await sql`
        SELECT COUNT(*)::int as total FROM products p
        WHERE LOWER(p.brand) = LOWER(${brand})
      `;
      products = await sql`
        SELECT p.*, pi.image_url, pi.page_num, s.supermarket, s.promo_dates
        FROM products p JOIN page_images pi ON p.page_image_id = pi.id JOIN scans s ON p.scan_id = s.id
        WHERE LOWER(p.brand) = LOWER(${brand})
        ORDER BY p.scan_id DESC, pi.page_num, p.id
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      countResult = await sql`
        SELECT COUNT(*)::int as total FROM products p
      `;
      products = await sql`
        SELECT p.*, pi.image_url, pi.page_num, s.supermarket, s.promo_dates
        FROM products p JOIN page_images pi ON p.page_image_id = pi.id JOIN scans s ON p.scan_id = s.id
        ORDER BY p.scan_id DESC, pi.page_num, p.id
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

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
