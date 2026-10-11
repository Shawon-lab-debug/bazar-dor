"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Product = {
  id: number;
  slug: string;
  nameBn: string;
  category: string;
  categoryNameBn: string;
  categoryIcon?: string;
  image?: string;
  unit?: string;
  today: number;
  yesterday?: number;
  lastWeek?: number;
  lastMonth?: number;
  change?: {
    dir?: string;
    pct?: number;
  };
};

type Category = {
  id: string;
  name: string;
  icon: string;
};

type ApiResponse = {
  data?: unknown;
  products?: unknown;
};

const API_URL = "https://api.api-store.workers.dev/api/bazardor";

function getProducts(payload: unknown): Product[] {
  if (Array.isArray(payload)) {
    return payload as Product[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const response = payload as ApiResponse;
  const candidates = [
    response.data,
    response.products,
    (response.data as { products?: unknown } | undefined)?.products,
    (response.data as { data?: unknown } | undefined)?.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as Product[];
    }

    if (candidate && typeof candidate === "object") {
      const nested = getProducts(candidate);
      if (nested.length > 0) {
        return nested;
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

function ChangeBadge({ product }: { product: Product }) {
  const direction = getDirection(product);
  const percentage = Math.abs(getChange(product));

  if (direction === "flat" || percentage === 0) {
    return <span className="change-badge unchanged">— ০.০%</span>;
  }

  return (
    <span
      className={`change-badge ${
        direction === "up" ? "increase" : "decrease"
      }`}
    >
      {direction === "up" ? "▲" : "▼"} {formatNumber(percentage)}%
    </span>
  );
}

function ProductCard({ product }: { product: Product }) {
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
          <ChangeBadge product={product} />
        </div>
      </article>
    </Link>
  );
}

function ProductSection({
  title,
  subtitle,
  products,
  icon,
}: {
  title: string;
  subtitle: string;
  products: Product[];
  icon: string;
}) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <h2>
            <span className="section-icon">{icon} </span>
            {title}
          </h2>
          <p>{subtitle}</p>
        </div>
        <span className="section-count">
          {formatNumber(products.length)}টি পণ্য
        </span>
      </div>

      <div className="product-grid">
        {products.map((product) => (
          <ProductCard key={product.id ?? product.slug} product={product} />
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortOrder, setSortOrder] = useState("default");
  const [todayDate, setTodayDate] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTodayDate(
        new Intl.DateTimeFormat("bn-BD", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(new Date()),
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/products`, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("পণ্যের তথ্য লোড করা যায়নি।");
        }

        const payload: unknown = await response.json();
        const result = getProducts(payload);

        if (result.length === 0) {
          throw new Error("API থেকে পণ্যের তালিকা পাওয়া যায়নি।");
        }

        setProducts(result);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "একটি সমস্যা হয়েছে। আবার চেষ্টা করো।",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProducts();
    return () => controller.abort();
  }, []);

  const categories = useMemo<Category[]>(() => {
    const unique = new Map<string, Category>();

    products.forEach((product) => {
      if (!product.category || unique.has(product.category)) {
        return;
      }

      unique.set(product.category, {
        id: product.category,
        name: product.categoryNameBn || product.category,
        icon: product.categoryIcon || "🛍️",
      });
    });

    return Array.from(unique.values());
  }, [products]);

  const sortedProducts = useMemo(() => {
    const result = [...products];

    if (sortOrder === "price-low") {
      result.sort((a, b) => a.today - b.today);
    } else if (sortOrder === "price-high") {
      result.sort((a, b) => b.today - a.today);
    }

    return result;
  }, [products, sortOrder]);

  const risingProducts = useMemo(
    () =>
      [...products]
        .filter(
          (product) =>
            getDirection(product) === "up" && getChange(product) > 0,
        )
        .sort((a, b) => getChange(b) - getChange(a))
        .slice(0, 6),
    [products],
  );

  const fallingProducts = useMemo(
    () =>
      [...products]
        .filter(
          (product) =>
            getDirection(product) === "down" && getChange(product) < 0,
        )
        .sort((a, b) => getChange(a) - getChange(b))
        .slice(0, 6),
    [products],
  );

  const tickerProducts = useMemo(
    () =>
      [...products]
        .sort(
          (a, b) => Math.abs(getChange(b)) - Math.abs(getChange(a)),
        )
        .slice(0, 12),
    [products],
  );

  return (
    <>
      <header className="site-header">
        <div className="header-main page-container">
          <Link className="brand" href="/" aria-label="বাজার দর হোম">
            <span className="brand-mark" aria-hidden="true">
              <Image
                src="/logo.svg"
                alt=""
                width={25}
                height={28}
                priority
                className="brand-logo-image"
              />
            </span>
            <span className="brand-copy">
              <strong>বাজার দর</strong>
              <small>{todayDate || "প্রতিদিনের বাজার, এক নজরে"}</small>
            </span>
          </Link>

          <div className="header-actions">
            <Link className="sign-in-link" href="/signin">
              সাইন ইন
            </Link>
            <Link className="primary-button header-sign-up" href="/signup">
              সাইন আপ
            </Link>
          </div>
        </div>

        <nav className="category-nav" aria-label="পণ্যের ক্যাটাগরি">
          <div className="page-container category-nav-inner">
            <Link className="category-link active" href="/">
              <span>🛍️</span> সব পণ্য
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                className="category-link"
                href={`/category/${category.id}`}
              >
                <span>{category.icon}</span> {category.name}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <div className="ticker" aria-label="বাজারদরের পরিবর্তন">
        <div className="ticker-track">
          {[...tickerProducts, ...tickerProducts].map((product, index) => (
            <Link
              className="ticker-item"
              key={`${product.id}-${index}`}
              href={`/product/${product.slug}`}
            >
              <span>{product.image || "🛒"}</span>
              <strong>{product.nameBn}</strong>
              <span className="ticker-price">
                {formatPrice(product.today)} / {getUnit(product.unit)}
              </span>
              <ChangeBadge product={product} />
            </Link>
          ))}
        </div>
      </div>

      <main className="main-content page-container">
        <section className="hero">
          <div className="hero-copy">
            <span className="hero-eyebrow">
              {todayDate || "প্রতিদিনের বাজারদর"}
            </span>

            <h1>
              আজকের বাজারের দাম এক
              <br />
              <span>নজরে</span>
            </h1>

            <p>
              চাল, ডাল, তেল, সবজি, মাছ, মাংস ও নিত্যপ্রয়োজনীয় পণ্যের বাজারদর
              দেখুন এক জায়গায়। দাম বাড়ছে নাকি কমছে, জেনে নিন সহজেই।
            </p>

            <a className="primary-button hero-button" href="#সব-পণ্য">
              সব পণ্য দেখুন <span aria-hidden="true">→</span>
            </a>
          </div>

          <div className="hero-art">
            <Image
              src="/bazar-hero.svg"
              alt="বাজারের তাজা সবজির ঝুড়ি"
              width={315}
              height={263}
              priority
              className="hero-image"
            />
          </div>
        </section>

        {loading && (
          <div className="product-grid loading-grid" role="status">
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
            <span className="state-icon">!</span>
            <h2>তথ্য লোড করা যায়নি</h2>
            <p>{error}</p>
            <button
              className="primary-button"
              onClick={() => window.location.reload()}
            >
              আবার চেষ্টা করুন
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            <ProductSection
              title="আজ দাম বেড়েছে"
              subtitle="যেসব পণ্যের দাম আগের তুলনায় বেড়েছে"
              products={risingProducts}
              icon="▲"
            />

            <ProductSection
              title="আজ দাম কমেছে"
              subtitle="যেসব পণ্যের দাম আগের তুলনায় কমেছে"
              products={fallingProducts}
              icon="▼"
            />

            <section className="content-section" id="সব-পণ্য">
              <div className="section-heading all-products-heading">
                <div>
                  <h2>সব পণ্য</h2>
                  <p>নিত্যপ্রয়োজনীয় পণ্যের আজকের বাজারদর</p>
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

              {sortedProducts.length > 0 ? (
                <div className="product-grid">
                  {sortedProducts.map((product) => (
                    <ProductCard
                      key={product.id ?? product.slug}
                      product={product}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <span>🛒</span>
                  <h3>কোনো পণ্য পাওয়া যায়নি</h3>
                  <p>পণ্যের তথ্য পরে আবার চেষ্টা করুন।</p>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <footer className="site-footer">
        <div className="page-container footer-inner">
          <p>বাজার দর — প্রয়োজনীয় পণ্যের দাম এক নজরে।</p>
          <p>
            সকল দাম সম্ভাব্য; বাজার অবস্থার ওপর নির্ভর করে পরিবর্তিত হতে পারে।
          </p>
        </div>
      </footer>
    </>
  );
}
