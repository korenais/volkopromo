"use client";

import { useCallback, useEffect, useState } from "react";

type Product = {
  id: number;
  product_name: string;
  brand: string;
  sale_price: number;
  original_price: number;
  discount_pct: number;
  units: string;
  price_per_unit: string;
  image_url: string;
  page_num: number;
  scan_id: number;
  supermarket: string;
  promo_dates: string;
};

type Brand = {
  brand: string;
  count: number;
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [brand, setBrand] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (brand) params.set("brand", brand);
    params.set("page", page.toString());
    const res = await fetch(`/api/products?${params}`);
    const data = await res.json();
    setProducts(data.products);
    setTotal(data.total);
    setLoading(false);
  }, [search, brand, page]);

  useEffect(() => {
    fetch("/api/brands")
      .then((r) => r.json())
      .then(setBrands);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">VolkoPromo</h1>
            <span className="text-sm text-gray-500">{total} products</span>
          </div>

          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search products..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                Search
              </button>
            </form>

            <select
              value={brand}
              onChange={(e) => {
                setBrand(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All brands</option>
              {brands.map((b) => (
                <option key={b.brand} value={b.brand}>
                  {b.brand} ({b.count})
                </option>
              ))}
            </select>

            {(search || brand) && (
              <button
                onClick={() => {
                  setSearch("");
                  setSearchInput("");
                  setBrand("");
                  setPage(1);
                }}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border rounded-lg"
              >
                Clear filters
              </button>
            )}

          </div>
        </div>
      </header>

      {/* Product Grid */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No products found
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Image</th>
                    <th className="px-4 py-3">Supermarket</th>
                    <th className="px-4 py-3">Promo Dates</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Brand</th>
                    <th className="px-4 py-3 text-right">Sale Price</th>
                    <th className="px-4 py-3 text-right">Original</th>
                    <th className="px-4 py-3 text-right">Discount</th>
                    <th className="px-4 py-3">Units</th>
                    <th className="px-4 py-3">Per Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b last:border-b-0 hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <div
                          className="w-12 h-12 rounded overflow-hidden cursor-pointer bg-gray-100 flex-shrink-0"
                          onClick={() => setSelectedImage(p.image_url)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.image_url}
                            alt={`Page ${p.page_num}`}
                            className="w-full h-full object-cover object-top"
                            loading="lazy"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2 text-gray-700">{p.supermarket}</td>
                      <td className="px-4 py-2 text-gray-500 text-xs">{p.promo_dates}</td>
                      <td className="px-4 py-2 font-medium text-gray-900">{p.product_name}</td>
                      <td className="px-4 py-2">
                        {p.brand && (
                          <span
                            className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full cursor-pointer hover:bg-blue-100"
                            onClick={() => { setBrand(p.brand); setPage(1); }}
                          >
                            {p.brand}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-red-600">
                        {p.sale_price > 0 ? `${Number(p.sale_price).toFixed(2)} €` : ""}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-400 line-through">
                        {p.original_price > 0 ? `${Number(p.original_price).toFixed(2)} €` : ""}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {p.discount_pct > 0 && (
                          <span className="text-xs font-bold text-white bg-red-500 px-1.5 py-0.5 rounded">
                            -{p.discount_pct}%
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-500">{p.units}</td>
                      <td className="px-4 py-2 text-gray-500">{p.price_per_unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Image modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-3xl max-h-[90vh] overflow-auto bg-white rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedImage} alt="Page" className="w-full" />
          </div>
        </div>
      )}
    </div>
  );
}
