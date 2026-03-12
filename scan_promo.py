#!/usr/bin/env python3
"""Helper script for volkopromo skill: PDF→images, upload to R2, insert into Neon DB."""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

import boto3
import psycopg2
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")


# ── Cloudflare R2 ──────────────────────────────────────────────────

def get_r2_client():
    return boto3.client(
        "s3",
        endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name="auto",
    )


def upload_image(r2_client, image_path: str, key: str) -> str:
    bucket = os.environ["R2_BUCKET_NAME"]
    public_url = os.environ["R2_PUBLIC_URL"]
    content_type = "image/jpeg" if key.endswith(".jpg") else "image/png"
    r2_client.upload_file(image_path, bucket, key, ExtraArgs={"ContentType": content_type})
    return f"{public_url}/{key}"


# ── Neon DB ────────────────────────────────────────────────────────

def get_db():
    return psycopg2.connect(os.environ["DATABASE_URL"])


# ── Commands ───────────────────────────────────────────────────────

def cmd_convert_pdf(pdf_path: str, output_dir: str, dpi: int = 200):
    """Convert PDF to JPEG images using pdftoppm."""
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    import subprocess
    result = subprocess.run(
        ["pdftoppm", "-jpeg", "-jpegopt", "quality=85", "-r", str(dpi), pdf_path, f"{output_dir}/page"],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        print(json.dumps({"error": result.stderr}))
        sys.exit(1)
    # List created files
    pages = sorted(Path(output_dir).glob("page-*.jpg"))
    print(json.dumps({"pages": [str(p) for p in pages], "count": len(pages)}))


def cmd_upload_images(image_paths_json: str, r2_prefix: str):
    """Upload images to R2. Input: JSON array of file paths."""
    image_paths = json.loads(image_paths_json)
    r2 = get_r2_client()
    results = []
    for path in image_paths:
        filename = Path(path).name
        key = f"{r2_prefix}/{filename}"
        url = upload_image(r2, path, key)
        results.append({"path": path, "key": key, "url": url})
    print(json.dumps(results))


def cmd_create_scan(source_file: str, scan_date: str, supermarket: str = "", promo_dates: str = ""):
    """Create a scan record and return its ID."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO scans (scan_date, source_file, supermarket, promo_dates) VALUES (%s, %s, %s, %s) RETURNING id",
        (scan_date, source_file, supermarket, promo_dates),
    )
    scan_id = cur.fetchone()[0]
    conn.commit()
    conn.close()
    print(json.dumps({"scan_id": scan_id}))


def cmd_save_page(scan_id: int, page_num: int, image_url: str, image_key: str, products_json: str):
    """Save a page image record and its products to DB."""
    products = json.loads(products_json)
    conn = get_db()
    cur = conn.cursor()

    cur.execute(
        """INSERT INTO page_images (scan_id, page_num, image_url, image_key, products_found, parse_failed)
           VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
        (scan_id, page_num, image_url, image_key, len(products), len(products) == 0),
    )
    page_id = cur.fetchone()[0]

    for p in products:
        cur.execute(
            """INSERT INTO products (scan_id, page_image_id, product_name, brand, sale_price,
               original_price, discount_pct, units, price_per_unit)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                scan_id, page_id,
                p.get("product_name", ""),
                p.get("brand", ""),
                p.get("sale_price"),
                p.get("original_price"),
                p.get("discount_pct", 0),
                p.get("units", ""),
                p.get("price_per_unit", ""),
            ),
        )

    conn.commit()
    conn.close()
    print(json.dumps({"page_id": page_id, "products_saved": len(products)}))


def cmd_finalize_scan(scan_id: int, total_pages: int, total_products: int):
    """Update scan totals."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE scans SET total_pages = %s, total_products = %s WHERE id = %s",
        (total_pages, total_products, scan_id),
    )
    conn.commit()
    conn.close()
    print(json.dumps({"status": "ok"}))


if __name__ == "__main__":
    commands = {
        "convert-pdf": lambda: cmd_convert_pdf(sys.argv[2], sys.argv[3], int(sys.argv[4]) if len(sys.argv) > 4 else 200),
        "upload-images": lambda: cmd_upload_images(sys.argv[2], sys.argv[3]),
        "create-scan": lambda: cmd_create_scan(sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else "", sys.argv[5] if len(sys.argv) > 5 else ""),
        "save-page": lambda: cmd_save_page(int(sys.argv[2]), int(sys.argv[3]), sys.argv[4], sys.argv[5], sys.argv[6]),
        "finalize-scan": lambda: cmd_finalize_scan(int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])),
    }

    if len(sys.argv) < 2 or sys.argv[1] not in commands:
        print(f"Usage: {sys.argv[0]} <command> [args...]")
        print(f"Commands: {', '.join(commands.keys())}")
        sys.exit(1)

    commands[sys.argv[1]]()
