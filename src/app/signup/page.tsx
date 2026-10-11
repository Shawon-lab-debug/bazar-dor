
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { authClient } from "@/lib/auth-client";
import "./../auth-pages.css";

function getReturnPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  try {
    const url = new URL(value, window.location.origin);

    if (url.origin !== window.location.origin) {
      return "/";
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5h6.6c3.9-3.6 6.1-8.8 6.1-14.9Z" />
      <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.1A20 20 0 0 0 24 44Z" />
      <path fill="#FBBC05" d="M12.6 27.8a12 12 0 0 1 0-7.6v-5.1H5.8a20 20 0 0 0 0 17.8l6.8-5.1Z" />
      <path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 5.9 29.5 4 24 4A20 20 0 0 0 5.8 15.1l6.8 5.1C14.2 15.6 18.7 12 24 12Z" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .9a11.1 11.1 0 0 0-3.5 21.6c.6.1.8-.3.8-.6v-2.1c-3.3.7-4-1.4-4-1.4-.5-1.3-1.3-1.6-1.3-1.6-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.5-2.7 5.5-5.3 5.8.4.3.8 1 .8 2v3.2c0 .3.2.7.8.6A11.1 11.1 0 0 0 12 .9Z" />
    </svg>
  );
}

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState("");

  const returnTo = getReturnPath(searchParams.get("callbackURL") ?? searchParams.get("returnTo"));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।");
      return;
    }

    if (password !== confirmPassword) {
      setError("দুটি পাসওয়ার্ড মিলছে না।");
      return;
    }

    setLoading(true);

    try {
      const result = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      if (result.error) {
        setError(result.error.message || "অ্যাকাউন্ট তৈরি করা যায়নি।");
        return;
      }

      router.replace(returnTo);
      router.refresh();
    } catch {
      setError("অ্যাকাউন্ট তৈরি করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  }

  async function handleSocial(provider: "google" | "github") {
    setError("");
    setSocialLoading(provider);

    try {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: returnTo,
      });

      if (result.error) {
        setError(result.error.message || "সোশ্যাল লগইন শুরু করা যায়নি।");
      }
    } catch {
      setError("সোশ্যাল লগইন করা যায়নি। পরে আবার চেষ্টা করুন।");
    } finally {
      setSocialLoading("");
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-page__intro">
        <h1>অ্যাকাউন্ট তৈরি করুন</h1>
        <p>বিনা খরচে সাইন আপ করে সব বিস্তারিত দাম দেখুন।</p>
      </div>

      <section className="auth-card" aria-label="সাইন আপ ফর্ম">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="signup-name">নাম</label>
            <input
              id="signup-name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="যেমন: রহিম উদ্দিন"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={100}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="signup-email">ইমেইল</label>
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="signup-password">পাসওয়ার্ড</label>
            <input
              id="signup-password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="কমপক্ষে ৮ অক্ষর"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="signup-confirm-password">পাসওয়ার্ড নিশ্চিত করুন</label>
            <input
              id="signup-confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="আবার লিখুন"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
            />
          </div>

          {error && <p className="auth-message" role="alert">{error}</p>}

          <button className="auth-submit" type="submit" disabled={loading || !!socialLoading}>
            {loading ? "অ্যাকাউন্ট তৈরি হচ্ছে..." : "অ্যাকাউন্ট তৈরি করুন"}
          </button>
        </form>

        <div className="auth-divider">অথবা</div>

        <div className="auth-socials">
          <button
            className="auth-social-button"
            type="button"
            onClick={() => handleSocial("google")}
            disabled={loading || !!socialLoading}
          >
            <GoogleIcon />
            <span>{socialLoading === "google" ? "অপেক্ষা করুন..." : <>Google দিয়ে<br />চালিয়ে যান</>}</span>
          </button>

          <button
            className="auth-social-button"
            type="button"
            onClick={() => handleSocial("github")}
            disabled={loading || !!socialLoading}
          >
            <GithubIcon />
            <span>{socialLoading === "github" ? "অপেক্ষা করুন..." : <>GitHub দিয়ে<br />চালিয়ে যান</>}</span>
          </button>
        </div>

        <p className="auth-switch">
          অ্যাকাউন্ট আছে? <Link href="/signin">সাইন ইন করুন</Link>
        </p>
      </section>

      <Link className="auth-home-link" href="/">
        ← হোম পেজে ফিরে যান
      </Link>
    </main>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<main className="auth-page" />}>
      <SignUpForm />
    </Suspense>
  );
}
