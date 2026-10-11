"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import "../auth-pages.css";

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [name, setName] = useState("");
  const [loadedUserId, setLoadedUserId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const user = session?.user;

  const currentName =
    user && loadedUserId === user.id ? name : user?.name ?? "";

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/signin?callbackURL=%2Fprofile");
    }
  }, [isPending, session, router]);

  async function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = currentName.trim();

    if (!trimmedName) {
      setIsSuccess(false);
      setMessage("আপনার নাম লিখুন।");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const result = await authClient.updateUser({
        name: trimmedName,
      });

      if (result.error) {
        setIsSuccess(false);
        setMessage(
          result.error.message || "তথ্য আপডেট করা যায়নি। আবার চেষ্টা করুন।",
        );
        return;
      }

      setName(trimmedName);
      setLoadedUserId(user?.id ?? "");
      setIsSuccess(true);
      setMessage("আপনার নাম সফলভাবে আপডেট হয়েছে।");
      router.refresh();
    } catch {
      setIsSuccess(false);
      setMessage("একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setIsSaving(false);
    }
  }

  if (isPending || !session || !user) {
    return (
      <main className="auth-page">
        <div className="auth-page__intro">
          <p>
            {isPending ? "প্রোফাইল লোড হচ্ছে…" : "সাইন ইন পেজে নেওয়া হচ্ছে…"}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-page__intro">
        <h1>আমার প্রোফাইল</h1>
        <p>আপনার অ্যাকাউন্টের তথ্য দেখুন ও নাম আপডেট করুন।</p>
      </div>

      <section className="auth-card">
        <form className="auth-form" onSubmit={handleUpdate}>
          <div className="auth-field">
            <label htmlFor="profile-name">আপনার নাম</label>
            <input
              id="profile-name"
              name="name"
              type="text"
              autoComplete="name"
              value={currentName}
              onChange={(event) => {
                setName(event.target.value);
                setLoadedUserId(user.id);
                setMessage("");
              }}
              placeholder="আপনার নাম লিখুন"
              maxLength={100}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="profile-email">ইমেইল</label>
            <input
              id="profile-email"
              type="email"
              value={user.email}
              readOnly
              aria-describedby="profile-email-note"
            />
            <small id="profile-email-note">
              ইমেইল ঠিকানা এখানে পরিবর্তন করা যাবে না।
            </small>
          </div>

          {message && (
            <p
              className={`auth-message ${
                isSuccess ? "auth-message--success" : ""
              }`}
              role="status"
            >
              {message}
            </p>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={isSaving}
          >
            {isSaving ? "আপডেট হচ্ছে…" : "তথ্য আপডেট করুন"}
          </button>
        </form>

        <p className="auth-switch">
          অ্যাকাউন্ট থেকে বের হতে Navbar-এর সাইন আউট বাটন ব্যবহার করুন।
        </p>
      </section>

      <Link className="auth-home-link" href="/">
        ← হোম পেজে ফিরে যান
      </Link>
    </main>
  );
}