---
name: scan-promo
description: >
  Scan supermarket promotional PDF flyers and extract all products with prices.
  Use this skill when the user says "scan promo", "scan this PDF", "extract products from flyer",
  "scan MAXIMA/RIMI/LIDL flyer", or provides a PDF path and asks to extract product data.
  This skill reads each page visually, identifies all products (name, brand, price, discount, units),
  uploads page images to Cloudflare R2, and stores structured data in Neon DB.
---

# Supermarket Promo PDF Scanner

You are scanning a supermarket promotional flyer PDF to extract every product with structured data.

## Project Location

All helper scripts and config are in: `/Users/korenaisenstadt/git/volkopromo/`
Python venv: `/Users/korenaisenstadt/git/volkopromo/.venv/`

The helper script is `scan_promo.py` — use it via:
```
source /Users/korenaisenstadt/git/volkopromo/.venv/bin/activate && python3 /Users/korenaisenstadt/git/volkopromo/scan_promo.py <command> [args]
```

## Workflow

### Step 1: Get the PDF path
Ask the user for the PDF file path if not provided as an argument.

### Step 2: Convert PDF to page images
```bash
source /Users/korenaisenstadt/git/volkopromo/.venv/bin/activate && python3 /Users/korenaisenstadt/git/volkopromo/scan_promo.py convert-pdf "<pdf_path>" "/tmp/volkopromo_scan" 200
```
This outputs JPEG images (quality=85) and returns JSON with the list of page image paths and count.

### Step 3: Upload all images to Cloudflare R2
```bash
source /Users/korenaisenstadt/git/volkopromo/.venv/bin/activate && python3 /Users/korenaisenstadt/git/volkopromo/scan_promo.py upload-images '<json_array_of_paths>' '<pdf_stem>/<timestamp>'
```
This returns JSON array with each image's R2 URL and key.

### Step 3.5: Identify supermarket and promo dates
Read the first page image to identify:
- **Supermarket name** (e.g. "Maxima", "Rimi", "Lidl") — usually the large logo on page 1
- **Promo validity dates** (e.g. "10.03. līdz 16.03.2026") — usually shown on page 1

### Step 4: Create a scan record in Neon DB
```bash
source /Users/korenaisenstadt/git/volkopromo/.venv/bin/activate && python3 /Users/korenaisenstadt/git/volkopromo/scan_promo.py create-scan "<source_filename>" "<YYYY-MM-DD>" "<supermarket>" "<promo_dates>"
```
Returns JSON with `scan_id`.

### Step 5: Read each page image and extract products
For EACH page image:
1. Use the **Read** tool to view the page image (it will display visually since you are multimodal)
2. Analyze the image and extract EVERY product visible on the page
3. For each product, determine:
   - `product_name`: full name in original language (usually Latvian)
   - `brand`: brand name (empty string if generic/unbranded product like vegetables)
   - `sale_price`: the large promotional price (number, e.g. 1.19)
   - `original_price`: the smaller crossed-out/original price (number, 0 if not shown)
   - `discount_pct`: discount percentage (number, e.g. 50 for -50%, 0 if not shown)
   - `units`: quantity/weight description (e.g. "1 kg", "400 g", "1.5 l, 3 varieties")
   - `price_per_unit`: per-unit price if shown (e.g. "16.23 €/kg", empty string if not)

### Step 6: Save each page's products to DB
For each page, after extracting products, save them:
```bash
source /Users/korenaisenstadt/git/volkopromo/.venv/bin/activate && python3 /Users/korenaisenstadt/git/volkopromo/scan_promo.py save-page <scan_id> <page_num> "<image_url>" "<image_key>" '<products_json>'
```
Where `products_json` is a JSON array of product objects.

### Step 7: Finalize the scan
```bash
source /Users/korenaisenstadt/git/volkopromo/.venv/bin/activate && python3 /Users/korenaisenstadt/git/volkopromo/scan_promo.py finalize-scan <scan_id> <total_pages> <total_products>
```

### Step 8: Report results
Show the user a summary:
- Total pages scanned
- Total products extracted
- Any pages that had 0 products (potential failures)
- Scan ID for reference

## Extraction Rules

- **Prices**: Supermarket flyers show sale prices as large prominent numbers and original prices as smaller/crossed-out numbers. Prices are in € (euros).
- **Discounts**: Often shown as "-50%", "-44%" etc. on the product card.
- **Brand vs product**: The brand is usually in ALL CAPS or a recognizable name (MERRILD, COCA-COLA, FELIX, ZEWA). Generic products (vegetables, meat cuts) have no brand.
- **Multiple price tiers**: Some products show two sale prices (e.g. loyalty card price vs regular sale). Capture the lowest/main sale price.
- **Non-product pages**: Some pages may be headers, coupons, or store info with no products. That's OK — save the page image but report 0 products.
- **Latvian language**: Products are described in Latvian. Keep original language names.

## Important Notes

- Process pages in batches to avoid context overflow. For large PDFs (30+ pages), process 5 pages at a time.
- Always save page images to R2 even if no products are found — useful for later review.
- The helper script manages all R2 and DB connections. You just need to read images and extract data.
