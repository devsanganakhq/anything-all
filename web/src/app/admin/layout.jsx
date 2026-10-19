"use client";
/**
 * Admin Layout — /admin/*
 *
 * Client-side gate for all admin pages. Calls GET /api/admin/verify on mount
 * to confirm the current user is a signed-in administrator.
 *
 * Possible states:
 *   loading   — session check in flight; shows spinner
 *   denied    — not signed in → shows sign-in prompt
 *   forbidden — signed in but not admin → shows access-denied screen
 *   ok        — verified admin → renders children
 *
 * This is defence-in-depth only. Every admin API route independently
 * enforces the same check server-side via requireAdmin(). Even if this
 * layout is bypassed the API calls will still return 401 / 403.
 */

import { useEffect, useState } from "react";
import {
  Shield,
  Lock,
  LogIn,
  AlertTriangle,
  LayoutDashboard,
  Users,
  BookOpen,
  Upload,
  Camera,
} from "lucide-react";

export default function AdminLayout({ children }) {
  const [state, setState] = useState("loading"); // loading | denied | forbidden | ok
  const [adminInfo, setAdminInfo] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      try {
        const res = await fetch("/api/admin/verify", {
          credentials: "include",
        });

        if (cancelled) return;

        if (res.status === 401) {
          setState("denied");
          return;
        }
        if (res.status === 403) {
          setState("forbidden");
          return;
        }
        if (!res.ok) {
          setState("forbidden");
          return;
        }

        const data = await res.json();
        setAdminInfo(data);
        setState("ok");
      } catch {
        if (!cancelled) setState("denied");
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (state === "loading") {
    return (
      <div className="min-h-screen bg-[#F5F1EB] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div
            className="w-10 h-10 border-2 border-[#1B3828]/20 border-t-[#1B3828] rounded-full mx-auto"
            style={{ animation: "spin 0.8s linear infinite" }}
          />
          <p className="text-sm text-[#1B3828]/60 font-medium">
            Verifying access…
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Not signed in ─────────────────────────────────────────────────────────
  if (state === "denied") {
    return (
      <div className="min-h-screen bg-[#F5F1EB] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-[#E5E0D6] shadow-sm max-w-md w-full p-8 text-center space-y-5">
          <div className="w-14 h-14 bg-[#1B3828]/8 rounded-full flex items-center justify-center mx-auto">
            <LogIn size={24} className="text-[#1B3828]" />
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest text-[#C9952A] mb-1">
              HEATHLAND LINKS — ADMIN
            </p>
            <h1 className="text-xl font-light text-[#1B2E1E]">
              Sign in required
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              You must be signed in to access admin tools.
            </p>
          </div>
          <a
            href={`/account/signin?callbackUrl=${encodeURIComponent("/admin/courses/import")}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1B3828] text-white text-sm font-bold tracking-wider rounded-xl hover:bg-[#2C5240] transition-colors"
          >
            <LogIn size={15} />
            SIGN IN
          </a>
        </div>
      </div>
    );
  }

  // ── Signed in but not admin ───────────────────────────────────────────────
  if (state === "forbidden") {
    return (
      <div className="min-h-screen bg-[#F5F1EB] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-[#E5E0D6] shadow-sm max-w-md w-full p-8 text-center space-y-5">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <Lock size={24} className="text-red-600" />
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest text-[#C9952A] mb-1">
              HEATHLAND LINKS — ADMIN
            </p>
            <h1 className="text-xl font-light text-[#1B2E1E]">Access denied</h1>
            <p className="text-sm text-gray-500 mt-2">
              Your account does not have administrator permissions. Contact the
              platform operator to request access.
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
            <div className="flex items-start gap-2">
              <AlertTriangle
                size={14}
                className="text-amber-600 flex-shrink-0 mt-0.5"
              />
              <p className="text-xs text-amber-800">
                This restriction is enforced server-side. Modifying this page in
                your browser will not grant access — all admin API calls
                independently verify administrator status.
              </p>
            </div>
          </div>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 border border-[#E5E0D6] bg-white text-sm font-semibold text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Return to app
          </a>
        </div>
      </div>
    );
  }

  // ── Verified admin ────────────────────────────────────────────────────────
  return (
    <div>
      {/* Slim admin session bar */}
      <div className="bg-[#0F2118] text-white/50 px-4 py-1.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Shield size={11} className="text-[#C9952A]" />
          <span className="font-bold tracking-wider text-[#C9952A]">
            ADMIN SESSION
          </span>
          {adminInfo?.email && (
            <span className="text-white/40">— {adminInfo.email}</span>
          )}
        </div>
        <a
          href="/"
          className="text-white/40 hover:text-white/70 transition-colors"
        >
          ← Back to app
        </a>
      </div>

      {/* Admin nav bar */}
      <div className="bg-[#0F2118]/90 border-b border-white/5 px-4">
        <nav className="flex items-center gap-1 overflow-x-auto">
          {[
            { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
            { href: "/admin/users", label: "Users", icon: Users },
            { href: "/admin/lists", label: "Curated Lists", icon: BookOpen },
            {
              href: "/admin/course-photos",
              label: "Course Photos",
              icon: Camera,
            },
            {
              href: "/admin/courses/import",
              label: "Course Import",
              icon: Upload,
            },
          ].map(({ href, label, icon: Icon }) => {
            const isActive =
              typeof window !== "undefined" &&
              window.location.pathname.startsWith(href) &&
              (href === "/admin"
                ? window.location.pathname === "/admin"
                : true);
            return (
              <a
                key={href}
                href={href}
                className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-white/50 hover:text-white/90 whitespace-nowrap transition-colors border-b-2 border-transparent hover:border-[#C9952A]/50"
              >
                <Icon size={11} />
                {label}
              </a>
            );
          })}
        </nav>
      </div>

      {children}
    </div>
  );
}
