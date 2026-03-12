CREATE TABLE IF NOT EXISTS scans (
    id SERIAL PRIMARY KEY,
    scan_date DATE NOT NULL,
    source_file TEXT NOT NULL,
    supermarket TEXT DEFAULT '',
    promo_dates TEXT DEFAULT '',
    total_pages INT DEFAULT 0,
    total_products INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS page_images (
    id SERIAL PRIMARY KEY,
    scan_id INT REFERENCES scans(id) ON DELETE CASCADE,
    page_num INT NOT NULL,
    image_url TEXT NOT NULL,
    image_key TEXT NOT NULL,
    ocr_text TEXT,
    products_found INT DEFAULT 0,
    parse_failed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    scan_id INT REFERENCES scans(id) ON DELETE CASCADE,
    page_image_id INT REFERENCES page_images(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    brand TEXT DEFAULT '',
    sale_price NUMERIC(8,2),
    original_price NUMERIC(8,2),
    discount_pct INT DEFAULT 0,
    units TEXT DEFAULT '',
    price_per_unit TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_scan_id ON products(scan_id);
CREATE INDEX IF NOT EXISTS idx_page_images_scan_id ON page_images(scan_id);
