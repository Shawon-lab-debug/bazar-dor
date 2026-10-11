
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import "./product-details.css";

export const instant = false;

type Market = {
  market: string;
  division: string;
  min: number;
  max: number;
};

type Product = {
  id: number;
  slug: string;
  nameBn: string;
  category: string;
  categoryNameBn?: string;
  categoryIcon?: string;
  unit?: string;
  image?: string;
  today: number;
  yesterday?: number;
  lastWeek?: number;
  lastMonth?: number;
  change?: {
    dir?: string;
    pct?: number;
  };
  markets?: Market[];
};

const API_URL = "https://api.api-store.workers.dev/api/bazardor";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function findProducts(payload: unknown, depth = 0): Product[] {
  if (Array.isArray(payload)) {
    return payload as Product[];
  }

  if (!isRecord(payload) || depth > 4) {
    return [];
  }

  for (const key of ["data", "products", "result"]) {
    const value = payload[key];

    if (Array.isArray(value)) {
      return value as Product[];
    }

    if (isRecord(value)) {
      const products = findProducts(value, depth + 1);

      if (products.length > 0) {
        return products;
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

function getUnit(unit?: string): string {
  const units: Record<string, string> = {
    kg: "কেজি",
    litre: "লিটার",
    liter: "লিটার",
    dozen: "ডজন",
    piece: "পিস",
    gram: "গ্রাম",
  };

  return units[unit ?? ""] ?? unit ?? "কেজি";
}

function getChange(product: Product): number {
  if (typeof product.change?.pct === "number") {
    return product.change.pct;
  }

  if (
    typeof product.yesterday === "number" &&
    product.yesterday !== 0
  ) {
    return (
      ((product.today - product.yesterday) / product.yesterday) * 100
    );
  }

  return 0;
}

function getDirection(product: Product): "up" | "down" | "flat" {
  if (product.change?.dir === "up" || product.change?.dir === "down") {
    return product.change.dir;
  }

  if (
    typeof product.yesterday !== "number" ||
    product.today === product.yesterday
  ) {
    return "flat";
  }

  return product.today > product.yesterday ? "up" : "down";
}

function getMarketAverage(market: Market): number {
  return (market.min + market.max) / 2;
}

async function getProduct(slug: string): Promise<Product | null> {
  try {
    const response = await fetch(`${API_URL}/products`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload: unknown = await response.json();
    const products = findProducts(payload);

    return (
      products.find(
        (product) =>
          product &&
          typeof product.slug === "string" &&
          product.slug === slug,
      ) ?? null
    );
  } catch {
    return null;
  }
}

function ProductOverview({ product }: { product: Product }) {
  const direction = getDirection(product);
  const percentage = Math.abs(getChange(product));

  return (
    <section className="product-detail-hero">
      <div className="detail-product-icon" aria-hidden="true">
        {product.image || product.categoryIcon || "🛒"}
      </div>

      <div className="detail-product-info">
        <h1>{product.nameBn}</h1>

        <p className="detail-unit">
          প্রতি {getUnit(product.unit)} ·{" "}
          {product.categoryNameBn || product.category}
        </p>

        <p
          className={`detail-change ${
            direction === "up"
              ? "detail-change-up"
              : direction === "down"
                ? "detail-change-down"
                : "detail-change-flat"
          }`}
        >
          {direction === "up" ? "▲" : direction === "down" ? "▼" : "—"}{" "}
          গতকালের তুলনায় আজ দাম{" "}
          {direction === "up"
            ? "বেড়েছে"
            : direction === "down"
              ? "কমেছে"
              : "অপরিবর্তিত"}{" "}
          {formatNumber(percentage)}%
        </p>
      </div>

      <div className="detail-current-price">
        <span>আজকের দাম</span>
        <strong>{formatNumber(product.today)}</strong>
        <span>টাকা / {getUnit(product.unit)}</span>

        <span
          className={`detail-price-change ${
            direction === "up"
              ? "detail-change-up"
              : direction === "down"
                ? "detail-change-down"
                : "detail-change-flat"
          }`}
        >
          {direction === "up" ? "▲" : direction === "down" ? "▼" : "—"}{" "}
          {formatNumber(percentage)}%
        </span>
      </div>
    </section>
  );
}

function PriceSummary({ product }: { product: Product }) {
  const markets = product.markets ?? [];

  if (markets.length === 0) {
    return (
      <div className="detail-empty">
        এই পণ্যের বাজারভিত্তিক দাম এখন পাওয়া যাচ্ছে না।
      </div>
    );
  }

  const lowestPrice = Math.min(...markets.map((market) => market.min));
  const highestPrice = Math.max(...markets.map((market) => market.max));

  const averagePrice =
    markets.reduce(
      (total, market) => total + getMarketAverage(market),
      0,
    ) / markets.length;

  const sortedMarkets = [...markets].sort(
    (a, b) => getMarketAverage(a) - getMarketAverage(b),
  );

  return (
    <section className="detail-content-card">
      <h2 className="detail-section-title">দামের সারসংক্ষেপ</h2>

      <div className="detail-stat-grid">
        <article className="detail-stat">
          <p>সর্বনিম্ন দাম</p>
          <strong className="detail-stat-low">
            {formatPrice(lowestPrice)}
          </strong>
          <span>সবচেয়ে কম দামের বাজার</span>
        </article>

        <article className="detail-stat">
          <p>সর্বোচ্চ দাম</p>
          <strong className="detail-stat-high">
            {formatPrice(highestPrice)}
          </strong>
          <span>সবচেয়ে বেশি দামের বাজার</span>
        </article>

        <article className="detail-stat">
          <p>গড় দাম</p>
          <strong className="detail-stat-average">
            {formatPrice(averagePrice)}
          </strong>
          <span>প্রতি বাজারের হিসাব</span>
        </article>
      </div>

      <div className="market-section">
        <h2 className="detail-section-title">বাজারভিত্তিক আজকের দাম</h2>

        <div className="market-table-wrapper">
          <table className="market-table">
            <thead>
              <tr>
                <th scope="col">বাজার</th>
                <th scope="col">বিভাগ</th>
                <th scope="col">সর্বনিম্ন</th>
                <th scope="col">সর্বোচ্চ</th>
                <th scope="col">গড়</th>
              </tr>
            </thead>

            <tbody>
              {sortedMarkets.map((market, index) => (
                <tr key={`${market.market}-${index}`}>
                  <td className="market-name">{market.market}</td>
                  <td>{market.division}</td>
                  <td>{formatPrice(market.min)}</td>
                  <td>{formatPrice(market.max)}</td>
                  <td className="market-average">
                    {formatPrice(getMarketAverage(market))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    const callbackURL = `/product/${slug}`;

    redirect(`/signin?callbackURL=${encodeURIComponent(callbackURL)}`);
  }

  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  return (
    <main className="main-content page-container product-detail-page">
      <nav className="detail-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">হোম</Link>
        <span aria-hidden="true">›</span>
        <Link href={`/category/${product.category}`}>
          {product.categoryNameBn || product.category}
        </Link>
        <span aria-hidden="true">›</span>
        <span>{product.nameBn}</span>
      </nav>

      <ProductOverview product={product} />

      <PriceSummary product={product} />

      <div className="detail-bottom-row">
        <Link
          href={`/category/${product.category}`}
          className="detail-category-link"
        >
          {product.categoryIcon || "🛍️"} সব{" "}
          {product.categoryNameBn || product.category}
        </Link>
      </div>
    </main>
  );
}
