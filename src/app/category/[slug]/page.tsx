"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

type Product = {
  id: number;
  slug: string;
  nameBn: string;
  category: string;
  categoryNameBn?: string;
  categoryIcon?: string;
  image?: string;
  unit?: string;
  today: number;
  yesterday?: number;
  change?: {
    dir?: string;
    pct?: number;
  };
};

type Category = {
  id?: string;
  slug?: string;
  name?: string;
  nameBn?: string;
  icon?: string;
};

const API_URL = "https://api.api-store.workers.dev/api/bazardor";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function findArray(payload: unknown, depth = 0): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload) || depth > 4) {
    return [];
  }

  for (const key of ["data", "products", "categories", "result"]) {
    const value = payload[key];

    if (Array.isArray(value)) {
      return value;
    }

    if (isRecord(value)) {
      const result = findArray(value, depth + 1);

      if (result.length > 0) {
        return result;
      }
    }
  }

  return [];
}

function formatNumber(value: number): string {
  return value.toLocaleString("bn-BD", {
    maximumFractionDigits: 2,
  });
}

function formatPrice(value: number): string {
  return `${formatNumber(value)} টাকা`;
}

function getChange(product: Product): number {
  return Number(
    product.change?.pct ??
      (product.yesterday
        ? ((product.today - product.yesterday) / product.yesterday) * 100
        : 0),
  );
}

function getDirection(product: Product): string {
  const direction = product.change?.dir;

  if (direction === "flat" || direction === "same") {
    return "flat";
  }

  if (direction === "up" || direction === "down") {
    return direction;
  }

  if (
    product.yesterday === undefined ||
    product.today === product.yesterday
  ) {
    return "flat";
  }

  return product.today > product.yesterday ? "up" : "down";
}

function getUnit(unit?: string): string {
  const units: Record<string, string> = {
    kg: "প্রতি কেজি",
    litre: "প্রতি লিটার",
    liter: "প্রতি লিটার",
    dozen: "প্রতি ডজন",
    piece: "প্রতি পিস",
    gram: "প্রতি গ্রাম",
  };

  return units[unit ?? ""] ?? (unit ? `প্রতি ${unit}` : "প্রতি কেজি");
}

function ProductCard({ product }: { product: Product }) {
  const direction = getDirection(product);
  const percentage = Math.abs(getChange(product));

  return (
    <Link
      className="product-card-link"
      href={`/product/${product.slug}`}
      aria-label={`${product.nameBn} পণ্যের বিস্তারিত দেখুন`}
    >
      <article className="product-card">
        <div className="product-heading">
          <div className="product-icon" aria-hidden="true">
            {product.image || product.categoryIcon || "🛒"}
          </div>

          <div className="product-title">
            <h3>{product.nameBn}</h3>
            <p>{getUnit(product.unit)}</p>
          </div>
        </div>

        <div className="product-price-row">
          <div>
            <span className="price-label">আজকের দাম</span>
            <p className="product-price">{formatPrice(product.today)}</p>
          </div>

          <span
            className={`change-badge ${
              direction === "up"
                ? "increase"
                : direction === "down"
                  ? "decrease"
                  : "unchanged"
            }`}
          >
            {direction === "up"
              ? "▲"
              : direction === "down"
                ? "▼"
                : "—"}{" "}
            {formatNumber(percentage)}%
          </span>
        </div>
      </article>
    </Link>
  );
}

function CategoryLoading() {
  return (
    <main className="main-content page-container">
      <section className="content-section">
        <div className="section-heading">
          <div>
            <h1>ক্যাটাগরি লোড হচ্ছে...</h1>
            <p>অনুগ্রহ করে অপেক্ষা করুন।</p>
          </div>
        </div>

        <div
          className="product-grid loading-grid"
          role="status"
          aria-label="পণ্য লোড হচ্ছে"
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="product-skeleton" key={index}>
              <div className="skeleton-line" />
              <div className="skeleton-line short" />
              <div className="skeleton-line price" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function CategoryPageContent() {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params.slug);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sortOrder, setSortOrder] = useState("default");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategory() {
      setLoading(true);
      setError("");

      try {
        const [productsResponse, categoriesResponse] = await Promise.all([
          fetch(
            `${API_URL}/products?category=${encodeURIComponent(slug)}`,
            {
              signal: controller.signal,
              cache: "no-store",
            },
          ),
          fetch(`${API_URL}/categories`, {
            signal: controller.signal,
            cache: "no-store",
          }),
        ]);

        if (!productsResponse.ok) {
          throw new Error("ক্যাটাগরির পণ্য লোড করা যায়নি।");
        }

        const productsPayload: unknown = await productsResponse.json();
        const productsData = findArray(productsPayload) as Product[];

        setProducts(
          productsData.filter(
            (product) =>
              product &&
              typeof product.nameBn === "string" &&
              typeof product.today === "number",
          ),
        );

        if (categoriesResponse.ok) {
          const categoriesPayload: unknown = await categoriesResponse.json();

          setCategories(findArray(categoriesPayload) as Category[]);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadCategory();

    return () => controller.abort();
  }, [slug]);

  const category = categories.find(
    (item) => item.slug === slug || item.id === slug,
  );

  const firstProduct = products[0];

  const categoryName =
    category?.nameBn ||
    category?.name ||
    firstProduct?.categoryNameBn ||
    firstProduct?.category ||
    slug;

  const categoryIcon =
    category?.icon || firstProduct?.categoryIcon || "🛍️";

  const sortedProducts = useMemo(() => {
    const result = [...products];

    if (sortOrder === "price-low") {
      result.sort((a, b) => a.today - b.today);
    } else if (sortOrder === "price-high") {
      result.sort((a, b) => b.today - a.today);
    }

    return result;
  }, [products, sortOrder]);

  const categoryExists =
    Boolean(category) ||
    products.some((product) => product.category === slug);

  return (
    <main className="main-content page-container">
      <section className="content-section">
        <div className="section-heading all-products-heading">
          <div>
            <h1>
              <span className="section-icon">{categoryIcon} </span>
              {categoryName}
            </h1>
            <p>এই ক্যাটাগরির নিত্যপ্রয়োজনীয় পণ্যের বাজারদর</p>
          </div>

          <label className="sort-control">
            <span>সাজান</span>
            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              aria-label="পণ্যের তালিকা সাজান"
            >
              <option value="default">ডিফল্ট</option>
              <option value="price-low">দাম: কম থেকে বেশি</option>
              <option value="price-high">দাম: বেশি থেকে কম</option>
            </select>
          </label>
        </div>

        {loading && (
          <div
            className="product-grid loading-grid"
            role="status"
            aria-label="পণ্য লোড হচ্ছে"
          >
            {Array.from({ length: 6 }).map((_, index) => (
              <div className="product-skeleton" key={index}>
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
                <div className="skeleton-line price" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="state-panel error-panel" role="alert">
            <h2>তথ্য লোড করা যায়নি</h2>
            <p>{error}</p>
            <Link className="primary-button" href="/">
              হোম পেজে ফিরে যান
            </Link>
          </div>
        )}

        {!loading && !error && !categoryExists && (
          <div className="empty-state">
            <span>🔎</span>
            <h2>ক্যাটাগরি পাওয়া যায়নি</h2>
            <p>এই ক্যাটাগরিটি সঠিক নয় অথবা এখানে কোনো পণ্য নেই।</p>
            <Link className="primary-button" href="/">
              হোম পেজে ফিরে যান
            </Link>
          </div>
        )}

        {!loading &&
          !error &&
          categoryExists &&
          sortedProducts.length === 0 && (
            <div className="empty-state">
              <span>🛒</span>
              <h2>এই ক্যাটাগরিতে কোনো পণ্য নেই</h2>
              <p>অন্য ক্যাটাগরি থেকে পণ্য দেখুন।</p>
              <Link className="primary-button" href="/">
                হোম পেজে ফিরে যান
              </Link>
            </div>
          )}

        {!loading && !error && sortedProducts.length > 0 && (
          <div className="product-grid">
            {sortedProducts.map((product, index) => (
              <ProductCard
                key={product.id ?? `${product.slug}-${index}`}
                product={product}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default function CategoryPage() {
  return (
    <Suspense fallback={<CategoryLoading />}>
      <CategoryPageContent />
    </Suspense>
  );
}