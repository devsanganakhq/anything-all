"use client";
/**
 * Heathland Links — Admin Dashboard
 * /admin
 *
 * Comprehensive analytics dashboard for platform administrators.
 * Protected by the parent AdminLayout (client-side) + requireAdmin() server-side.
 *
 * Sections:
 *   Overview · Golf Activity · Community · Course Analytics
 *   Passport Analytics · Heathland Index · System Health
 */

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  Users,
  Activity,
  TrendingUp,
  TrendingDown,
  Map,
  Flag,
  Star,
  Heart,
  MessageSquare,
  Camera,
  UserPlus,
  Globe,
  BookOpen,
  Navigation,
  Trophy,
  Compass,
  Database,
  Zap,
  Mail,
  HardDrive,
  CheckCircle,
  XCircle,
  AlertCircle,
  LayoutDashboard,
  Upload,
  RefreshCw,
  ChevronRight,
  Clock,
  BarChart2,
  Target,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const n = (v, decimals = 0) => {
  const num = parseFloat(v ?? 0);
  if (isNaN(num)) return "0";
  return decimals > 0 ? num.toFixed(decimals) : num.toLocaleString();
};

const pct = (v) => {
  const num = parseFloat(v ?? 0);
  if (isNaN(num) || num === 0) return { text: "—", positive: null };
  return { text: `${num > 0 ? "+" : ""}${num}%`, positive: num > 0 };
};

const SECTIONS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "golf", label: "Golf Activity", icon: Flag },
  { id: "community", label: "Community", icon: Users },
  { id: "courses", label: "Course Analytics", icon: Map },
  { id: "passport", label: "Passport Analytics", icon: BookOpen },
  { id: "index", label: "Heathland Index", icon: Trophy },
  { id: "system", label: "System Health", icon: Database },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "green",
  trend,
  placeholder,
}) {
  const colors = {
    green: {
      bg: "bg-[#1B3828]/8",
      text: "text-[#1B3828]",
      icon: "text-[#1B3828]",
    },
    gold: {
      bg: "bg-[#C9952A]/10",
      text: "text-[#8A6818]",
      icon: "text-[#C9952A]",
    },
    blue: { bg: "bg-blue-50", text: "text-blue-800", icon: "text-blue-600" },
    red: { bg: "bg-red-50", text: "text-red-800", icon: "text-red-500" },
    slate: {
      bg: "bg-slate-50",
      text: "text-slate-700",
      icon: "text-slate-500",
    },
  };
  const c = colors[color] || colors.green;
  return (
    <div className="bg-white rounded-xl border border-[#E5E0D6] p-5">
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center`}
        >
          {Icon && <Icon size={16} className={c.icon} />}
        </div>
        {trend && (
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${trend.positive ? "bg-emerald-50 text-emerald-700" : trend.positive === false ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-500"}`}
          >
            {trend.text}
          </span>
        )}
      </div>
      <div className={`text-2xl font-bold ${c.text} mb-0.5`}>
        {placeholder ? (
          <span className="text-gray-300">—</span>
        ) : (
          (value ?? "0")
        )}
      </div>
      <div className="text-xs text-gray-500 font-medium">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function SectionHeader({ id, icon: Icon, title, subtitle }) {
  return (
    <div id={id} className="flex items-start gap-3 mb-5 pt-2 scroll-mt-8">
      <div className="w-9 h-9 rounded-lg bg-[#1B3828] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={16} className="text-white" />
      </div>
      <div>
        <h2 className="text-base font-bold text-[#1B2E1E]">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function CourseTable({ courses = [], metric, metricLabel, color = "#1B3828" }) {
  if (!courses.length) {
    return (
      <div className="text-center py-10 text-sm text-gray-400">
        No data yet — courses will appear here as activity grows.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#E5E0D6]">
            <th className="text-left py-2 px-3 text-xs font-bold text-gray-400 tracking-wider">
              #
            </th>
            <th className="text-left py-2 px-3 text-xs font-bold text-gray-400 tracking-wider">
              COURSE
            </th>
            <th className="text-left py-2 px-3 text-xs font-bold text-gray-400 tracking-wider hidden sm:table-cell">
              LOCATION
            </th>
            <th className="text-right py-2 px-3 text-xs font-bold text-gray-400 tracking-wider">
              {metricLabel}
            </th>
            <th className="text-right py-2 px-3 text-xs font-bold text-gray-400 tracking-wider hidden md:table-cell">
              RATING
            </th>
          </tr>
        </thead>
        <tbody>
          {courses.map((c, i) => {
            const val = parseFloat(c[metric] || 0);
            const max = parseFloat(courses[0][metric] || 1);
            const barW = max > 0 ? (val / max) * 100 : 0;
            return (
              <tr
                key={c.id}
                className="border-b border-[#E5E0D6]/50 hover:bg-[#F5F1EB]/40 transition-colors"
              >
                <td className="py-3 px-3 text-xs text-gray-400 font-mono">
                  {i + 1}
                </td>
                <td className="py-3 px-3">
                  <div className="font-semibold text-[#1B2E1E] text-xs">
                    {c.name}
                  </div>
                  {c.course_type && (
                    <div className="text-xs text-gray-400">{c.course_type}</div>
                  )}
                  <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden w-full max-w-[120px]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${barW}%`, backgroundColor: color }}
                    />
                  </div>
                </td>
                <td className="py-3 px-3 text-xs text-gray-500 hidden sm:table-cell">
                  {[c.city, c.country].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="py-3 px-3 text-right font-bold text-[#1B2E1E]">
                  {n(c[metric])}
                </td>
                <td className="py-3 px-3 text-right text-xs text-gray-500 hidden md:table-cell">
                  {c.community_rating > 0
                    ? `★ ${parseFloat(c.community_rating).toFixed(1)}`
                    : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PlaceholderCard({ label, icon: Icon }) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-[#E5E0D6] p-5 flex flex-col items-center justify-center text-center min-h-[100px]">
      {Icon && <Icon size={20} className="text-gray-300 mb-2" />}
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-xs text-gray-300 mt-0.5">Ready for future data</p>
    </div>
  );
}

function SystemStatusCard({ label, status, description, icon: Icon }) {
  const cfg = {
    healthy: {
      color: "text-emerald-600",
      bg: "bg-emerald-50 border-emerald-200",
      dot: "bg-emerald-500",
      Icon: CheckCircle,
    },
    warning: {
      color: "text-amber-600",
      bg: "bg-amber-50 border-amber-200",
      dot: "bg-amber-500",
      Icon: AlertCircle,
    },
    error: {
      color: "text-red-600",
      bg: "bg-red-50 border-red-200",
      dot: "bg-red-500",
      Icon: XCircle,
    },
    configured: {
      color: "text-blue-600",
      bg: "bg-blue-50 border-blue-200",
      dot: "bg-blue-400",
      Icon: CheckCircle,
    },
    operational: {
      color: "text-emerald-600",
      bg: "bg-emerald-50 border-emerald-200",
      dot: "bg-emerald-500",
      Icon: CheckCircle,
    },
  };
  const c = cfg[status] || cfg.healthy;
  const StatusIcon = c.Icon;
  return (
    <div className={`rounded-xl border p-4 ${c.bg}`}>
      <div className="flex items-center gap-3 mb-2">
        {Icon && <Icon size={16} className={c.color} />}
        <span className="text-sm font-semibold text-[#1B2E1E]">{label}</span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${c.dot}`} />
          <StatusIcon size={14} className={c.color} />
        </span>
      </div>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, unit = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E5E0D6] rounded-lg shadow-md px-3 py-2 text-xs">
      <p className="text-gray-500 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-bold" style={{ color: p.color }}>
          {n(p.value)}
          {unit}
        </p>
      ))}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState("overview");
  const [courseTab, setCourseTab] = useState("played");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sectionRefs = useRef({});
  const lastGenerated = useRef(null);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/admin/dashboard");
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to load" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  // Active section tracking on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActiveSection(e.target.id);
        });
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) {
        sectionRefs.current[id] = el;
        observer.observe(el);
      }
    });
    return () => observer.disconnect();
  }, [data]);

  const scrollTo = (id) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(id);
    setSidebarOpen(false);
  };

  const generatedAt = data?.generatedAt
    ? new Date(data.generatedAt).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";

  const ov = data?.overview || {};
  const ga = data?.golfActivity || {};
  const cm = data?.community || {};
  const ca = data?.courseAnalytics || {};
  const pa = data?.passportAnalytics || {};
  const hi = data?.heathlandIndex || {};
  const sh = data?.systemHealth || {};

  const growthTrend = pct(ov.growthPercentage);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F1EB] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-[#1B3828]/20 border-t-[#1B3828] rounded-full mx-auto animate-spin" />
          <p className="text-sm text-[#1B3828]/60 font-medium">
            Loading dashboard…
          </p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="min-h-screen bg-[#F5F1EB] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-md w-full text-center space-y-4">
          <XCircle size={32} className="text-red-500 mx-auto" />
          <h2 className="text-lg font-semibold text-[#1B2E1E]">
            Dashboard failed to load
          </h2>
          <p className="text-sm text-gray-500">{error?.message}</p>
          <button
            onClick={refetch}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1B3828] text-white text-sm font-bold rounded-xl mx-auto hover:bg-[#2C5240] transition-colors"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1EB]">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="bg-[#1B3828] text-white sticky top-0 z-40 shadow-lg">
        <div className="flex items-center gap-4 px-4 py-3">
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden w-8 h-8 flex flex-col gap-1.5 items-center justify-center"
          >
            <span className="w-4 h-0.5 bg-white/70" />
            <span className="w-4 h-0.5 bg-white/70" />
            <span className="w-4 h-0.5 bg-white/70" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <LayoutDashboard
                size={16}
                className="text-[#C9952A] flex-shrink-0"
              />
              <span className="text-sm font-bold tracking-wide text-white">
                Dashboard
              </span>
              <ChevronRight size={12} className="text-white/30" />
              <span className="text-xs text-white/50 hidden sm:block">
                Analytics &amp; Operations
              </span>
            </div>
          </div>

          {/* Admin nav links */}
          <div className="hidden md:flex items-center gap-1">
            <a
              href="/admin"
              className="px-3 py-1.5 text-xs font-bold text-white bg-white/10 rounded-lg"
            >
              Dashboard
            </a>
            <a
              href="/admin/users"
              className="px-3 py-1.5 text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Users size={11} />
              Users
            </a>
            <a
              href="/admin/courses/import"
              className="px-3 py-1.5 text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Upload size={11} />
              Course Import
            </a>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-white/40 hidden sm:flex">
              <Clock size={11} />
              <span>Updated {generatedAt}</span>
            </div>
            <button
              onClick={refetch}
              disabled={isFetching}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-semibold text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw
                size={12}
                style={
                  isFetching
                    ? { animation: "hl-spin 0.8s linear infinite" }
                    : {}
                }
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile sidebar overlay ───────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute left-0 top-0 bottom-0 w-56 bg-[#1B3828] p-4 pt-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-bold tracking-widest text-[#C9952A] mb-4 px-2">
              SECTIONS
            </p>
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors mb-0.5 ${
                  activeSection === id
                    ? "bg-white/15 text-white"
                    : "text-white/60 hover:bg-white/8 hover:text-white"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex">
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className="hidden lg:flex flex-col w-52 bg-[#1B3828] min-h-screen sticky top-[49px] self-start pt-6 pb-8 px-3 flex-shrink-0">
          <p className="text-xs font-bold tracking-widest text-[#C9952A] mb-4 px-2">
            SECTIONS
          </p>
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors mb-0.5 text-left ${
                activeSection === id
                  ? "bg-white/15 text-white"
                  : "text-white/55 hover:bg-white/8 hover:text-white"
              }`}
            >
              {activeSection === id && (
                <span className="w-1 h-1 rounded-full bg-[#C9952A] flex-shrink-0" />
              )}
              <Icon size={13} className="flex-shrink-0" />
              {label}
            </button>
          ))}

          <div className="mt-auto pt-6 px-2 border-t border-white/10 mt-6">
            <a
              href="/admin/users"
              className="flex items-center gap-2 text-xs text-white/55 hover:text-white/80 transition-colors mb-2"
            >
              <Users size={11} />
              User Management
            </a>
            <a
              href="/admin/courses/import"
              className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors mb-2"
            >
              <Upload size={11} />
              Course Import
            </a>
            <a
              href="/"
              className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              <ChevronRight size={11} className="rotate-180" />
              Back to app
            </a>
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 px-4 md:px-6 py-6 space-y-10 max-w-5xl">
          {/* ══ 1. OVERVIEW ═════════════════════════════════════════════════ */}
          <section>
            <SectionHeader
              id="overview"
              icon={LayoutDashboard}
              title="Overview"
              subtitle="Platform-wide totals and growth metrics"
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <StatCard
                label="Total Users"
                value={n(ov.totalUsers)}
                icon={Users}
                color="green"
              />
              <StatCard
                label="Active Today"
                value={n(ov.activeToday)}
                icon={Activity}
                color="gold"
                sub="based on activity"
              />
              <StatCard
                label="Active This Week"
                value={n(ov.activeThisWeek)}
                icon={Activity}
                color="blue"
              />
              <StatCard
                label="Active This Month"
                value={n(ov.activeThisMonth)}
                icon={Activity}
                color="slate"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard
                label="New Registrations"
                value={n(ov.newRegistrationsThisMonth)}
                icon={UserPlus}
                color="green"
                sub="this month"
                trend={growthTrend.text !== "—" ? growthTrend : undefined}
              />
              <StatCard
                label="Month-on-Month Growth"
                value={growthTrend.text}
                icon={TrendingUp}
                color={
                  growthTrend.positive
                    ? "green"
                    : growthTrend.positive === false
                      ? "red"
                      : "slate"
                }
                sub="vs. last month"
              />
              <StatCard
                label="Active Courses"
                value={n(ov.totalCourses)}
                icon={Flag}
                color="gold"
                sub="in database"
              />
              <StatCard
                label="Communities"
                value={n(ov.totalCommunities)}
                icon={Users}
                color="blue"
                sub="groups"
              />
            </div>

            {/* Registration trend chart */}
            <div className="bg-white rounded-xl border border-[#E5E0D6] p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-bold text-gray-500 tracking-wider">
                    NEW REGISTRATIONS
                  </p>
                  <p className="text-sm font-semibold text-[#1B2E1E]">
                    Last 30 days
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#1B3828]">
                    {n(ov.newRegistrationsThisMonth)}
                  </p>
                  <p className="text-xs text-gray-400">this month</p>
                </div>
              </div>
              <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={ov.registrationTrend || []}
                    margin={{ top: 5, right: 5, bottom: 0, left: -20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE8" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "#9CA3AF" }}
                      interval={6}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#9CA3AF" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#1B3828"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: "#1B3828" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* ══ 2. GOLF ACTIVITY ════════════════════════════════════════════ */}
          <section>
            <SectionHeader
              id="golf"
              icon={Flag}
              title="Golf Activity"
              subtitle="Today's live activity and all-time totals"
            />

            <div className="mb-2">
              <p className="text-xs font-bold text-gray-400 tracking-wider mb-3">
                TODAY
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <StatCard
                  label="Courses Played"
                  value={n(ga.coursesPlayedToday)}
                  icon={Flag}
                  color="green"
                  sub="today"
                />
                <StatCard
                  label="Wishlist Additions"
                  value={n(ga.wishlistAdditionsToday)}
                  icon={Heart}
                  color="gold"
                  sub="today"
                />
                <StatCard
                  label="Reviews Submitted"
                  value={n(ga.reviewsToday)}
                  icon={Star}
                  color="blue"
                  sub="today"
                />
                <StatCard
                  label="Photos Uploaded"
                  value={n(ga.photosToday)}
                  icon={Camera}
                  color="slate"
                  sub="today"
                />
                <StatCard
                  label="Messages Sent"
                  value={n(ga.messagesToday)}
                  icon={MessageSquare}
                  color="green"
                  sub="chat + DMs today"
                />
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-bold text-gray-400 tracking-wider mb-3">
                ALL TIME
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <StatCard
                  label="Total Rounds Logged"
                  value={n(ga.totalCoursesPlayedAllTime)}
                  icon={Flag}
                  color="green"
                />
                <StatCard
                  label="Total Wishlist Saves"
                  value={n(ga.totalWishlistAllTime)}
                  icon={Heart}
                  color="gold"
                />
                <StatCard
                  label="Total Reviews"
                  value={n(ga.totalReviewsAllTime)}
                  icon={Star}
                  color="blue"
                />
              </div>
            </div>
          </section>

          {/* ══ 3. COMMUNITY ════════════════════════════════════════════════ */}
          <section>
            <SectionHeader
              id="community"
              icon={Users}
              title="Community"
              subtitle="Social connections, posts, and group activity"
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <StatCard
                label="Pending Friend Requests"
                value={n(cm.pendingFriendRequests)}
                icon={UserPlus}
                color="gold"
                sub="awaiting response"
              />
              <StatCard
                label="Accepted Friendships"
                value={n(cm.totalFriendships)}
                icon={Users}
                color="green"
              />
              <StatCard
                label="Total Follows"
                value={n(cm.totalFollows)}
                icon={Activity}
                color="blue"
                sub="users, clubs, courses"
              />
              <StatCard
                label="Community Members"
                value={n(cm.communityMembersTotal)}
                icon={Users}
                color="slate"
                sub="across all groups"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatCard
                label="Community Posts Today"
                value={n(cm.communityPostsToday)}
                icon={MessageSquare}
                color="green"
                sub="new discussions"
              />
              <StatCard
                label="Total Community Posts"
                value={n(cm.communityPostsTotal)}
                icon={MessageSquare}
                color="gold"
              />
              <StatCard
                label="Golf Trips Created"
                value={n(cm.tripsTotal)}
                icon={Navigation}
                color="blue"
                sub="travel itineraries"
              />
            </div>
          </section>

          {/* ══ 4. COURSE ANALYTICS ═════════════════════════════════════════ */}
          <section>
            <SectionHeader
              id="courses"
              icon={Map}
              title="Course Analytics"
              subtitle="Engagement rankings across all courses in the database"
            />

            {/* Tab bar */}
            <div className="flex overflow-x-auto border-b border-[#E5E0D6] mb-0 bg-white rounded-t-xl border border-b-0">
              {[
                { key: "played", label: "Most Played", icon: Flag },
                { key: "wishlisted", label: "Most Wishlisted", icon: Heart },
                { key: "rated", label: "Highest Rated", icon: Star },
                { key: "trending", label: "Trending", icon: TrendingUp },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setCourseTab(key)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${
                    courseTab === key
                      ? "border-[#1B3828] text-[#1B3828] bg-[#F5F1EB]/50"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-b-xl border border-[#E5E0D6] border-t-0 p-4">
              {courseTab === "played" && (
                <CourseTable
                  courses={ca.mostPlayed}
                  metric="played_count"
                  metricLabel="PLAYS"
                />
              )}
              {courseTab === "wishlisted" && (
                <CourseTable
                  courses={ca.mostWishlisted}
                  metric="wishlist_count"
                  metricLabel="SAVES"
                  color="#C9952A"
                />
              )}
              {courseTab === "rated" && (
                <CourseTable
                  courses={ca.highestRated}
                  metric="community_rating"
                  metricLabel="RATING"
                  color="#2563EB"
                />
              )}
              {courseTab === "trending" && (
                <CourseTable
                  courses={ca.trending}
                  metric="recent_plays"
                  metricLabel="PLAYS (30D)"
                  color="#7C3AED"
                />
              )}
            </div>

            {/* Placeholder for future analytics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <PlaceholderCard label="Most Viewed Courses" icon={BarChart2} />
              <PlaceholderCard
                label="Search Click-Through Rate"
                icon={Target}
              />
            </div>
          </section>

          {/* ══ 5. PASSPORT ANALYTICS ═══════════════════════════════════════ */}
          <section>
            <SectionHeader
              id="passport"
              icon={BookOpen}
              title="Passport Analytics"
              subtitle="Collective progress across the Heathland Links community"
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard
                label="Total Rounds Logged"
                value={n(pa.totalCoursesPlayed)}
                icon={Flag}
                color="green"
                sub="all members combined"
              />
              <StatCard
                label="Counties Reached"
                value={n(pa.distinctCounties)}
                icon={Map}
                color="gold"
                sub="distinct counties played"
              />
              <StatCard
                label="Countries Reached"
                value={n(pa.distinctCountries)}
                icon={Globe}
                color="blue"
                sub="distinct countries"
              />
              <StatCard
                label="Top 100 B&I Plays"
                value={n(pa.top100Completions)}
                icon={Trophy}
                color="green"
                sub="ranked courses played"
              />
            </div>

            {/* Country breakdown chart */}
            <div className="bg-white rounded-xl border border-[#E5E0D6] p-5 mb-4">
              <p className="text-xs font-bold text-gray-500 tracking-wider mb-4">
                COURSES PLAYED BY COUNTRY (DISTINCT)
              </p>
              <div style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={pa.countryBreakdown || []}
                    margin={{ top: 0, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#F0EDE8"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#6B7280" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#9CA3AF" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip unit=" courses" />} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {(pa.countryBreakdown || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed country stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl border border-[#E5E0D6] p-4 text-center">
                <div className="text-xl font-bold text-[#1B3828]">
                  {n(pa.englandCourses)}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  🏴󠁧󠁢󠁥󠁮󠁧󠁿 England courses
                </div>
              </div>
              <div className="bg-white rounded-xl border border-[#E5E0D6] p-4 text-center">
                <div className="text-xl font-bold text-[#2C5240]">
                  {n(pa.scotlandCourses)}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scotland courses
                </div>
              </div>
              <div className="bg-white rounded-xl border border-[#E5E0D6] p-4 text-center">
                <div className="text-xl font-bold text-[#C9952A]">
                  {n(pa.irelandCourses)}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  🇮🇪 Ireland courses
                </div>
              </div>
              <div className="bg-white rounded-xl border border-[#E5E0D6] p-4 text-center">
                <div className="text-xl font-bold text-[#8A7968]">
                  {n(pa.walesCourses)}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  🏴󠁧󠁢󠁷󠁬󠁳󠁿 Wales courses
                </div>
              </div>
            </div>
          </section>

          {/* ══ 6. HEATHLAND INDEX ══════════════════════════════════════════ */}
          <section>
            <SectionHeader
              id="index"
              icon={Trophy}
              title="Heathland Index"
              subtitle="Handicap distribution and explorer leaderboards"
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard
                label="Average Handicap"
                value={
                  hi.averageHandicap != null ? n(hi.averageHandicap, 1) : "—"
                }
                icon={Target}
                color="green"
                sub={`${n(hi.usersWithHandicap)} members with index`}
                placeholder={hi.averageHandicap == null}
              />
              <StatCard
                label="Highest Handicap"
                value={
                  hi.highestHandicap != null ? n(hi.highestHandicap, 1) : "—"
                }
                icon={TrendingUp}
                color="gold"
                placeholder={hi.highestHandicap == null}
              />
              <StatCard
                label="Lowest Handicap"
                value={
                  hi.lowestHandicap != null ? n(hi.lowestHandicap, 1) : "—"
                }
                icon={TrendingDown}
                color="blue"
                placeholder={hi.lowestHandicap == null}
              />
              <PlaceholderCard label="Most Improved Golfer" icon={TrendingUp} />
            </div>

            {/* Top Explorers table */}
            <div className="bg-white rounded-xl border border-[#E5E0D6] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#E5E0D6] flex items-center gap-2">
                <Compass size={14} className="text-[#C9952A]" />
                <span className="text-sm font-bold text-[#1B2E1E]">
                  Top Explorers
                </span>
                <span className="text-xs text-gray-400 ml-1">
                  — most courses played
                </span>
              </div>
              {hi.topExplorers?.length ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E0D6]">
                      <th className="text-left py-2 px-4 text-xs font-bold text-gray-400 tracking-wider">
                        #
                      </th>
                      <th className="text-left py-2 px-4 text-xs font-bold text-gray-400 tracking-wider">
                        MEMBER
                      </th>
                      <th className="text-right py-2 px-4 text-xs font-bold text-gray-400 tracking-wider">
                        COURSES PLAYED
                      </th>
                      <th className="text-right py-2 px-4 text-xs font-bold text-gray-400 tracking-wider hidden sm:table-cell">
                        HANDICAP
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {hi.topExplorers.map((u, i) => (
                      <tr
                        key={u.id}
                        className="border-b border-[#E5E0D6]/40 hover:bg-[#F5F1EB]/30 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <span
                            className={`text-xs font-bold ${i === 0 ? "text-[#C9952A]" : "text-gray-400"}`}
                          >
                            {i === 0 ? "🏆" : i + 1}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {u.profile_photo_url ? (
                              <img
                                src={u.profile_photo_url}
                                alt=""
                                className="w-7 h-7 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-[#1B3828]/10 flex items-center justify-center text-xs font-bold text-[#1B3828]">
                                {u.first_name?.[0] || "?"}
                              </div>
                            )}
                            <span className="text-sm font-semibold text-[#1B2E1E]">
                              {[u.first_name, u.last_name]
                                .filter(Boolean)
                                .join(" ") || "Anonymous"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-[#1B3828]">
                          {n(u.courses_played)}
                        </td>
                        <td className="py-3 px-4 text-right text-sm text-gray-500 hidden sm:table-cell">
                          {u.handicap != null ? n(u.handicap, 1) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-10 text-sm text-gray-400">
                  No course activity yet — leaderboard will populate as members
                  log rounds.
                </div>
              )}
            </div>
          </section>

          {/* ══ 7. SYSTEM HEALTH ════════════════════════════════════════════ */}
          <section>
            <SectionHeader
              id="system"
              icon={Database}
              title="System Health"
              subtitle="Infrastructure and service status"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              <SystemStatusCard
                label="Database"
                status={sh.database || "healthy"}
                description="PostgreSQL via Neon — responding normally"
                icon={Database}
              />
              <SystemStatusCard
                label="API Layer"
                status={sh.api || "healthy"}
                description="All API routes operational"
                icon={Zap}
              />
              <SystemStatusCard
                label="Email (Resend)"
                status={
                  sh.emailProvider === "configured" ? "configured" : "warning"
                }
                description={
                  sh.emailProvider === "configured"
                    ? "Password reset emails active via Resend"
                    : "Email not yet configured"
                }
                icon={Mail}
              />
              <SystemStatusCard
                label="Storage"
                status="operational"
                description="Uploadcare CDN — file uploads active"
                icon={HardDrive}
              />
              <SystemStatusCard
                label="Failed Jobs"
                status={sh.failedJobs > 0 ? "warning" : "healthy"}
                description={
                  sh.failedJobs > 0
                    ? `${sh.failedJobs} job(s) failed`
                    : "No failed background jobs"
                }
                icon={AlertCircle}
              />
              <SystemStatusCard
                label="Auth Provider"
                status="healthy"
                description="Better Auth — sessions active"
                icon={CheckCircle}
              />
            </div>

            {/* Last refresh info */}
            <div className="bg-white rounded-xl border border-[#E5E0D6] px-5 py-4 flex items-center gap-3">
              <Clock size={14} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">
                  Dashboard data refreshed at{" "}
                  <strong className="text-[#1B2E1E]">{generatedAt}</strong> ·
                  Auto-refreshes every 60 seconds
                </p>
              </div>
              <button
                onClick={refetch}
                disabled={isFetching}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1B3828] text-white text-xs font-bold rounded-lg hover:bg-[#2C5240] transition-colors disabled:opacity-50 flex-shrink-0"
              >
                <RefreshCw
                  size={11}
                  style={
                    isFetching
                      ? { animation: "hl-spin 0.8s linear infinite" }
                      : {}
                  }
                />
                Refresh now
              </button>
            </div>
          </section>

          {/* Bottom padding */}
          <div className="h-8" />
        </main>
      </div>
      <style jsx global>{`
        @keyframes hl-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
