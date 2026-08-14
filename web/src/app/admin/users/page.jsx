"use client";
/**
 * /admin/users
 * Heathland Links — Admin User Management
 *
 * Searchable, filterable, paginated table of all registered users.
 * Admin-gated by AdminLayout + requireAdmin() server-side on every API call.
 */

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Shield,
  ShieldOff,
  User,
  Clock,
  Flag,
  Heart,
  Star,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ExternalLink,
  BarChart2,
  Users,
} from "lucide-react";

// ─── Constants ─────────────────────────────────────────────────────────────────

const FILTERS = [
  { key: "all", label: "All Users" },
  { key: "active", label: "Active" },
  { key: "suspended", label: "Suspended" },
  { key: "admin", label: "Admins" },
  { key: "new_week", label: "New This Week" },
  { key: "new_month", label: "New This Month" },
];

const SORTS = [
  { key: "newest", label: "Newest First" },
  { key: "recently_active", label: "Recently Active" },
  { key: "most_played", label: "Most Courses Played" },
  { key: "most_reviews", label: "Most Reviews" },
  { key: "engagement", label: "Highest Engagement" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (v) =>
  v
    ? new Date(v).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
const fmtRel = (v) => {
  if (!v) return "Never";
  const diff = Date.now() - new Date(v).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 31) return `${Math.floor(days / 7)}w ago`;
  return fmtDate(v);
};

function Avatar({ user, size = 8 }) {
  const initials =
    [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join("") || "?";
  return user.profilePhotoUrl ? (
    <img
      src={user.profilePhotoUrl}
      alt={user.displayName}
      className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0`}
    />
  ) : (
    <div
      className={`w-${size} h-${size} rounded-full bg-[#1B3828]/10 flex items-center justify-center text-xs font-bold text-[#1B3828] flex-shrink-0`}
    >
      {initials}
    </div>
  );
}

function StatusBadge({ user }) {
  if (user.isSuspended) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
        <XCircle size={10} />
        Suspended
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
      <CheckCircle size={10} />
      Active
    </span>
  );
}

function Pagination({ page, pages, total, limit, onPage }) {
  const pages_ = Math.max(1, pages);
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E0D6]">
      <span className="text-xs text-gray-500">
        Page {page} of {pages_} · {total.toLocaleString()} users
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#E5E0D6] text-gray-500 hover:bg-[#F5F1EB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={13} />
        </button>
        {Array.from({ length: Math.min(5, pages_) }, (_, i) => {
          let p = i + 1;
          if (pages_ > 5) {
            if (page <= 3) p = i + 1;
            else if (page >= pages_ - 2) p = pages_ - 4 + i;
            else p = page - 2 + i;
          }
          return (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                p === page
                  ? "bg-[#1B3828] text-white"
                  : "border border-[#E5E0D6] text-gray-600 hover:bg-[#F5F1EB]"
              }`}
            >
              {p}
            </button>
          );
        })}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pages_}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#E5E0D6] text-gray-500 hover:bg-[#F5F1EB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [exportLoading, setExportLoading] = useState(false);

  // Committed search (only fires after submit / debounce)
  const [q, setQ] = useState("");

  const handleSearch = useCallback(
    (e) => {
      e.preventDefault();
      setQ(search);
      setPage(1);
    },
    [search],
  );

  const handleFilterChange = (f) => {
    setFilter(f);
    setPage(1);
  };
  const handleSortChange = (s) => {
    setSort(s);
    setPage(1);
  };

  const params = new URLSearchParams({
    q,
    filter,
    sort,
    page: String(page),
    limit: String(limit),
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-users", q, filter, sort, page, limit],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
    keepPreviousData: true,
    staleTime: 15_000,
  });

  const users = data?.users || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };

  // CSV export
  const handleExport = async () => {
    setExportLoading(true);
    try {
      const res = await fetch("/api/admin/users/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `heathland-users-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Export failed. Please try again.");
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F1EB]">
      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="bg-white border-b border-[#E5E0D6] px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href="/admin"
              className="text-xs text-gray-400 hover:text-[#1B3828] transition-colors flex items-center gap-1"
            >
              <ChevronLeft size={12} />
              Dashboard
            </a>
            <span className="text-gray-300">/</span>
            <div className="flex items-center gap-2">
              <Users size={16} className="text-[#1B3828]" />
              <h1 className="text-sm font-bold text-[#1B2E1E]">
                User Management
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refetch}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E5E0D6] text-gray-500 hover:bg-[#F5F1EB] transition-colors"
            >
              <RefreshCw size={13} />
            </button>
            <button
              onClick={handleExport}
              disabled={exportLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1B3828] text-white text-xs font-bold rounded-lg hover:bg-[#2C5240] transition-colors disabled:opacity-50"
            >
              <Download size={12} />
              {exportLoading ? "Exporting…" : "Export CSV"}
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 py-5 max-w-7xl">
        {/* ── Search + sort ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-[#E5E0D6] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3828]/20 focus:border-[#1B3828]"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1B3828] text-white text-sm font-bold rounded-xl hover:bg-[#2C5240] transition-colors"
            >
              Search
            </button>
          </form>

          <div className="relative">
            <select
              value={sort}
              onChange={(e) => handleSortChange(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-[#E5E0D6] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3828]/20 cursor-pointer"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>
        </div>

        {/* ── Filter tabs ───────────────────────────────────────────────── */}
        <div className="flex overflow-x-auto gap-1 mb-4 pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => handleFilterChange(f.key)}
              className={`flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                filter === f.key
                  ? "bg-[#1B3828] text-white"
                  : "bg-white border border-[#E5E0D6] text-gray-600 hover:bg-[#F5F1EB]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ── Table ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-[#E5E0D6] overflow-hidden">
          {/* Error */}
          {isError && (
            <div className="flex items-center gap-2 px-5 py-4 bg-red-50 border-b border-red-100">
              <AlertTriangle size={14} className="text-red-500" />
              <span className="text-sm text-red-700">
                {error?.message || "Failed to load users"}
              </span>
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading && (
            <div className="divide-y divide-[#E5E0D6]/50">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded w-40 animate-pulse" />
                    <div className="h-2.5 bg-gray-100 rounded w-56 animate-pulse" />
                  </div>
                  <div className="h-5 bg-gray-100 rounded-full w-16 animate-pulse hidden sm:block" />
                </div>
              ))}
            </div>
          )}

          {/* Empty */}
          {!isLoading && !isError && users.length === 0 && (
            <div className="text-center py-16">
              <Users size={28} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">
                No users found matching your criteria
              </p>
            </div>
          )}

          {/* Rows */}
          {!isLoading && users.length > 0 && (
            <>
              {/* Desktop table header */}
              <div className="hidden lg:grid grid-cols-[auto_1fr_160px_100px_90px_60px_60px_60px_60px_80px] gap-3 px-5 py-2 border-b border-[#E5E0D6] bg-[#F5F1EB]/60">
                {[
                  "USER",
                  "EMAIL",
                  "JOINED",
                  "LAST ACTIVE",
                  "STATUS",
                  "PLAYED",
                  "WISH",
                  "REVIEWS",
                  "POSTS",
                  "",
                ].map((h, i) => (
                  <span
                    key={i}
                    className="text-xs font-bold text-gray-400 tracking-wider truncate"
                  >
                    {h}
                  </span>
                ))}
              </div>

              {/* User rows */}
              <div className="divide-y divide-[#E5E0D6]/50">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="group hover:bg-[#F5F1EB]/40 transition-colors"
                  >
                    {/* Mobile layout */}
                    <div className="lg:hidden flex items-start gap-3 px-4 py-3">
                      <Avatar user={user} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-[#1B2E1E]">
                            {user.displayName}
                          </span>
                          {user.isAdmin && (
                            <Shield size={11} className="text-[#C9952A]" />
                          )}
                          <StatusBadge user={user} />
                        </div>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {user.email}
                        </p>
                        <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-400">
                          <span>ID #{user.id}</span>
                          <span>Joined {fmtDate(user.createdAt)}</span>
                          <span>Active {fmtRel(user.lastActive)}</span>
                          <span>
                            <Flag size={9} className="inline mr-0.5" />
                            {user.coursesPlayed}
                          </span>
                          <span>
                            <Heart size={9} className="inline mr-0.5" />
                            {user.wishlistCount}
                          </span>
                          <span>
                            <Star size={9} className="inline mr-0.5" />
                            {user.reviewsCount}
                          </span>
                        </div>
                      </div>
                      <a
                        href={`/admin/users/${user.id}`}
                        className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg border border-[#E5E0D6] text-gray-400 hover:bg-[#1B3828] hover:text-white hover:border-[#1B3828] transition-colors"
                      >
                        <ExternalLink size={11} />
                      </a>
                    </div>

                    {/* Desktop layout */}
                    <div className="hidden lg:grid grid-cols-[auto_1fr_160px_100px_90px_60px_60px_60px_60px_80px] gap-3 items-center px-5 py-3">
                      <Avatar user={user} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-[#1B2E1E] truncate">
                            {user.displayName}
                          </span>
                          {user.isAdmin && (
                            <Shield
                              size={11}
                              className="text-[#C9952A] flex-shrink-0"
                              title="Administrator"
                            />
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">
                          #{user.id}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {user.email}
                      </p>
                      <p className="text-xs text-gray-500">
                        {fmtDate(user.createdAt)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {fmtRel(user.lastActive)}
                      </p>
                      <StatusBadge user={user} />
                      <p className="text-xs font-bold text-[#1B2E1E] text-center">
                        {user.coursesPlayed}
                      </p>
                      <p className="text-xs text-gray-600 text-center">
                        {user.wishlistCount}
                      </p>
                      <p className="text-xs text-gray-600 text-center">
                        {user.reviewsCount}
                      </p>
                      <div className="flex items-center justify-end">
                        <a
                          href={`/admin/users/${user.id}`}
                          className="flex items-center gap-1 px-2.5 py-1 bg-[#1B3828] text-white text-xs font-bold rounded-lg hover:bg-[#2C5240] transition-colors opacity-0 group-hover:opacity-100"
                        >
                          View <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Pagination
                page={pagination.page}
                pages={pagination.pages}
                total={pagination.total}
                limit={limit}
                onPage={setPage}
              />
            </>
          )}
        </div>

        {/* Stats summary bar */}
        {!isLoading && !isError && (
          <div className="flex items-center gap-4 mt-3 px-1">
            <span className="text-xs text-gray-400">
              Showing {users.length} of {pagination.total.toLocaleString()}{" "}
              users
            </span>
            {filter !== "all" && (
              <button
                onClick={() => handleFilterChange("all")}
                className="text-xs text-[#1B3828] hover:underline font-medium"
              >
                Clear filter
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
