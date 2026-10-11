"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { ReactNode } from "react";

const API_URL = "https://api.api-store.workers.dev/api/bazardor";

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
  id: string;
  name: string;
  icon: string;
};

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

function getUnit(unit?: string): string {
  const units: Record<string, string> = {
    kg: "কেজি",
    litre: "লিটার",
    liter: "লিটার",
    dozen: "ডজন",
    piece: "পিস",
    gram: "গ্রাম",
  };

  return units[unit ?? ""] ?? (unit ? `প্রতি ${unit}` : "কেজি");
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
  if (
    product.change?.dir === "up" ||
    product.change?.dir === "down"
  ) {
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

function ChangeBadge({ product }: { product: Product }) {
  const direction = getDirection(product);
  const percentage = Math.abs(getChange(product));

  if (direction === "flat" || percentage === 0) {
    return (
      <span className="change-badge unchanged">
        — ০.০%
      </span>
    );
  }

  return (
    <span
      className={`change-badge ${
        direction === "up" ? "increase" : "decrease"
      }`}
    >
      {direction === "up" ? "▲" : "▼"}{" "}
      {formatNumber(percentage)}%
    </span>
  );
}

function SharedSiteLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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

    async function loadSharedData() {
      try {
        const [productsResponse, categoriesResponse] =
          await Promise.all([
            fetch(`${API_URL}/products`, {
              signal: controller.signal,
              cache: "no-store",
            }),
            fetch(`${API_URL}/categories`, {
              signal: controller.signal,
              cache: "no-store",
            }),
          ]);

        if (productsResponse.ok) {
          const payload: unknown = await productsResponse.json();
          const productList = findArray(payload) as Product[];

          setProducts(
            productList.filter(
              (product) =>
                product &&
                typeof product.slug === "string" &&
                typeof product.nameBn === "string" &&
                typeof product.today === "number",
            ),
          );
        }

        if (categoriesResponse.ok) {
          const payload: unknown = await categoriesResponse.json();
          const categoryList = findArray(payload) as Record<
            string,
            unknown
          >[];

          setCategories(
            categoryList
              .filter(
                (item) =>
                  typeof item.id === "string" &&
                  (typeof item.name === "string" ||
                    typeof item.nameBn === "string"),
              )
              .map((item) => ({
                id: String(item.id),
                name: String(item.nameBn ?? item.name),
                icon:
                  typeof item.icon === "string" ? item.icon : "🛍️",
              })),
          );
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Shared site data could not be loaded.");
        }
      }
    }

    loadSharedData();

    return () => controller.abort();
  }, []);

  const tickerProducts = [...products]
    .sort(
      (a, b) => Math.abs(getChange(b)) - Math.abs(getChange(a)),
    )
    .slice(0, 12);

  if (pathname === "/") {
    return <>{children}</>;
  }

  return (
    <>
      <header className="site-header">
        <div className="header-main page-container">
          <Link
            className="brand"
            href="/"
            aria-label="বাজার দর হোম"
          >
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
              <small>
                {todayDate || "প্রতিদিনের বাজার, এক নজরে"}
              </small>
            </span>
          </Link>

          <div className="header-actions">
            <Link className="sign-in-link" href="/signin">
              সাইন ইন
            </Link>
            <Link
              className="primary-button header-sign-up"
              href="/signup"
            >
              সাইন আপ
            </Link>
          </div>
        </div>

        <nav className="category-nav" aria-label="পণ্যের ক্যাটাগরি">
          <div className="page-container category-nav-inner">
            <Link
              className="category-link"
              href="/"
            >
              <span>🛍️</span> সব পণ্য
            </Link>

            {categories.map((category) => (
              <Link
                key={category.id}
                className={`category-link ${
                  pathname === `/category/${category.id}` ? "active" : ""
                }`}
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
          {[...tickerProducts, ...tickerProducts].map(
            (product, index) => (
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
            ),
          )}
        </div>
      </div>

      {children}

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

export default function SiteShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<>{children}</>}>
      <SharedSiteLayout>{children}</SharedSiteLayout>
    </Suspense>
  );
}