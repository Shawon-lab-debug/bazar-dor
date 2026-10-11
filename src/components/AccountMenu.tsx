"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function AccountMenu() {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function handleSignOut() {
    if (isSigningOut) return;

    setIsSigningOut(true);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        window.alert("সাইন আউট করা যায়নি। আবার চেষ্টা করুন।");
        return;
      }

      setIsOpen(false);
      router.replace("/signin");
      router.refresh();
    } catch {
      window.alert("সাইন আউট করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setIsSigningOut(false);
    }
  }

  if (isPending) {
    return <div className="header-actions" aria-label="অ্যাকাউন্ট লোড হচ্ছে" />;
  }

  if (!user) {
    return (
      <div className="header-actions">
        <Link className="sign-in-link" href="/signin">
          সাইন ইন
        </Link>
        <Link className="primary-button header-sign-up" href="/signup">
          সাইন আপ
        </Link>
      </div>
    );
  }

  const initial = (user.name || user.email || "U")
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <div className="account-menu" ref={menuRef}>
      <button
        className="account-menu__trigger"
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="account-menu__avatar">{initial}</span>
        <span className="account-menu__trigger-name">
          {user.name || "আমার অ্যাকাউন্ট"}
        </span>
        <span className="account-menu__arrow" aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen && (
        <div className="account-menu__dropdown" role="menu">
          <div className="account-menu__identity">
            <strong>{user.name || "ব্যবহারকারী"}</strong>
            <span>{user.email}</span>
          </div>

          <Link
            className="account-menu__item"
            href="/profile"
            role="menuitem"
            onClick={() => setIsOpen(false)}
          >
            <span aria-hidden="true">👤</span>
            আমার প্রোফাইল
          </Link>

          <button
            className="account-menu__item account-menu__signout"
            type="button"
            role="menuitem"
            disabled={isSigningOut}
            onClick={handleSignOut}
          >
            <span aria-hidden="true">↪</span>
            {isSigningOut ? "সাইন আউট হচ্ছে…" : "সাইন আউট"}
          </button>
        </div>
      )}
    </div>
  );
}