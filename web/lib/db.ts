import { neon } from "@neondatabase/serverless";

export const sql = neon(process.env.DATABASE_URL!);

export type Scan = {
  id: number;
  scan_date: string;
  source_file: string;
  supermarket: string;
  promo_dates: string;
  total_pages: number;
  total_products: number;
  created_at: string;
};

export type Product = {
  id: number;
  scan_id: number;
  page_image_id: number;
  product_name: string;
  brand: string;
  sale_price: number;
  original_price: number;
  discount_pct: number;
  units: string;
  price_per_unit: string;
  image_url: string;
  page_num: number;
};
