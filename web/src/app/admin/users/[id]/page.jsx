"use client";
/**
 * /admin/users/[id]
 * Heathland Links — Admin User Detail & Moderation
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Shield,
  ShieldOff,
  UserX,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Flag,
  Heart,
  Star,
  Camera,
  MessageSquare,
  Users,
  Clock,
  MapPin,
  Home,
  Eye,
  EyeOff,
  Lock,
  Globe,
  FileText,
  Trash2,
  Plus,
  RefreshCw,
  ExternalLink,
  Info,
  BookOpen,
  Navigation,
} from "lucide-react";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (v) =>
  v
    ? new Date(v).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
const fmtDatetime = (v) =>
  v
    ? new Date(v).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
const fmtRel = (v) => {
  if (!v) return "Never";
  const d = Math.floor((Date.now() - new Date(v).getTime()) / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  if (d < 31) return `${Math.floor(d / 7)}w ago`;
  return fmtDate(v);
};

const ACTION_COLORS = {
  account_suspended: "red",
  account_unsuspended: "emerald",
  admin_granted: "amber",
  admin_revoked: "amber",
  content_removed: "orange",
  moderation_note_added: "blue",
  moderation_note_deleted: "gray",
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function Avatar({ user, size = 16 }) {
  const initials =
    [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join("") || "?";
  return user.profilePhotoUrl ? (
    <img
      src={user.profilePhotoUrl}
      alt={user.displayName}
      className={`w-${size} h-${size} rounded-full object-cover ring-2 ring-white shadow`}
    />
  ) : (
    <div
      className={`w-${size} h-${size} rounded-full bg-[#1B3828]/10 flex items-center justify-center text-xl font-bold text-[#1B3828] ring-2 ring-white shadow`}
    >
      {initials}
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, badge }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E0D6] overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[#E5E0D6] bg-[#F5F1EB]/40">
        {Icon && <Icon size={13} className="text-[#1B3828]" />}
        <span className="text-sm font-bold text-[#1B2E1E]">{title}</span>
        {badge != null && (
          <span className="ml-auto text-xs font-bold text-gray-400">
            {badge}
          </span>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function DataLabel({ type }) {
  const cfg = {
    "moderation-only": {
      color: "text-red-600 bg-red-50 border-red-200",
      label: "Moderation Only",
      icon: Lock,
    },
    private: {
      color: "text-amber-700 bg-amber-50 border-amber-200",
      label: "Private",
      icon: EyeOff,
    },
    friends: {
      color: "text-blue-700 bg-blue-50 border-blue-200",
      label: "Friends Only",
      icon: Users,
    },
    public: {
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
      label: "Public",
      icon: Globe,
    },
  };
  const c = cfg[type] || cfg.public;
  const Icon = c.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-bold rounded border ${c.color}`}
    >
      <Icon size={9} />
      {c.label}
    </span>
  );
}

function ConfirmModal({
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
  children,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-[#E5E0D6]">
          <h3 className="text-base font-bold text-[#1B2E1E]">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">{message}</p>
        </div>
        <div className="px-6 py-4 space-y-3">{children}</div>
        <div className="flex gap-2 px-6 pb-5">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-[#E5E0D6] text-sm font-bold text-gray-600 rounded-xl hover:bg-[#F5F1EB] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 text-sm font-bold text-white rounded-xl transition-colors ${danger ? "bg-red-600 hover:bg-red-700" : "bg-[#1B3828] hover:bg-[#2C5240]"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, type = "success", onClose }) {
  return (
    <div
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-sm ${
        type === "success" ? "bg-[#1B3828] text-white" : "bg-red-600 text-white"
      }`}
    >
      {type === "success" ? <CheckCircle size={14} /> : <XCircle size={14} />}
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="opacity-70 hover:opacity-100 ml-2">
        ✕
      </button>
    </div>
  );
}

// ─── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "overview", label: "Overview", icon: Info },
  { key: "courses", label: "Courses", icon: Flag },
  { key: "wishlist", label: "Wishlist", icon: Heart },
  { key: "posts", label: "Feed Posts", icon: MessageSquare },
  { key: "photos", label: "Photos", icon: Camera },
  { key: "communities", label: "Communities", icon: Users },
  { key: "moderation", label: "Moderation", icon: Shield },
  { key: "audit", label: "Audit Log", icon: FileText },
];

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function AdminUserDetailPage({ params }) {
  const userId = params.id;
  const qc = useQueryClient();

  const [tab, setTab] = useState("overview");
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null); // { type, data }
  const [note, setNote] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [removeReason, setRemoveReason] = useState("");
  const [removeForm, setRemoveForm] = useState({
    contentType: "",
    contentId: "",
    reason: "",
  });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Data fetching ────────────────────────────────────────────────────────
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
  });

  const { data: auditData, refetch: refetchAudit } = useQuery({
    queryKey: ["admin-audit", userId],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/audit-log?targetId=${userId}&limit=50`,
      );
      if (!res.ok) return { logs: [] };
      return res.json();
    },
    enabled: tab === "audit",
  });

  // ── Mutations ────────────────────────────────────────────────────────────
  const suspendMutation = useMutation({
    mutationFn: ({ action, reason }) =>
      fetch(`/api/admin/users/${userId}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      }).then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        return d;
      }),
    onSuccess: (d) => {
      showToast(d.message);
      setModal(null);
      qc.invalidateQueries({ queryKey: ["admin-user", userId] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e) => showToast(e.message, "error"),
  });

  const adminRoleMutation = useMutation({
    mutationFn: ({ action, reason }) =>
      fetch(`/api/admin/users/${userId}/admin-role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      }).then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        return d;
      }),
    onSuccess: (d) => {
      showToast(d.message);
      setModal(null);
      qc.invalidateQueries({ queryKey: ["admin-user", userId] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e) => showToast(e.message, "error"),
  });

  const addNoteMutation = useMutation({
    mutationFn: (noteText) =>
      fetch(`/api/admin/users/${userId}/moderation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: noteText }),
      }).then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        return d;
      }),
    onSuccess: () => {
      showToast("Moderation note added");
      setNote("");
      qc.invalidateQueries({ queryKey: ["admin-user", userId] });
    },
    onError: (e) => showToast(e.message, "error"),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId) =>
      fetch(`/api/admin/users/${userId}/moderation?noteId=${noteId}`, {
        method: "DELETE",
      }).then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        return d;
      }),
    onSuccess: () => {
      showToast("Note removed");
      qc.invalidateQueries({ queryKey: ["admin-user", userId] });
    },
    onError: (e) => showToast(e.message, "error"),
  });

  const removeContentMutation = useMutation({
    mutationFn: (payload) =>
      fetch(`/api/admin/users/${userId}/content`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        return d;
      }),
    onSuccess: (d) => {
      showToast(d.message);
      setModal(null);
      setRemoveForm({ contentType: "", contentId: "", reason: "" });
      qc.invalidateQueries({ queryKey: ["admin-user", userId] });
    },
    onError: (e) => showToast(e.message, "error"),
  });

  // ── Loading / Error ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F1EB] flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-9 h-9 border-2 border-[#1B3828]/20 border-t-[#1B3828] rounded-full mx-auto"
            style={{ animation: "spin 0.8s linear infinite" }}
          />
          <p className="text-sm text-gray-500 mt-3">Loading user…</p>
        </div>
        <style
          jsx
          global
        >{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[#F5F1EB] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-md text-center space-y-3">
          <XCircle size={28} className="text-red-500 mx-auto" />
          <p className="text-sm text-red-700">
            {error?.message || "User not found"}
          </p>
          <a
            href="/admin/users"
            className="inline-flex items-center gap-1 text-sm text-[#1B3828] font-bold hover:underline"
          >
            <ChevronLeft size={14} />
            Back to users
          </a>
        </div>
      </div>
    );
  }

  const {
    profile,
    memberships = [],
    coursesPlayed = [],
    wishlistItems = [],
    feedPosts = [],
    communityMemberships = [],
    photos = [],
    moderationNotes = [],
    reportsReceived = [],
    recentActivity = [],
    stats = {},
  } = data;

  const isSuspended = profile.isSuspended;
  const isAdmin = profile.isAdmin;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F5F1EB]">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-[#E5E0D6] px-5 py-3 flex items-center gap-2">
        <a href="/admin" className="text-xs text-gray-400 hover:text-[#1B3828]">
          Dashboard
        </a>
        <span className="text-gray-300 text-xs">/</span>
        <a
          href="/admin/users"
          className="text-xs text-gray-400 hover:text-[#1B3828]"
        >
          Users
        </a>
        <span className="text-gray-300 text-xs">/</span>
        <span className="text-xs font-semibold text-[#1B2E1E]">
          {profile.displayName}
        </span>
        <button
          onClick={refetch}
          className="ml-auto w-7 h-7 flex items-center justify-center rounded-lg border border-[#E5E0D6] text-gray-400 hover:bg-[#F5F1EB] transition-colors"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      <div className="px-4 md:px-6 py-5 max-w-5xl space-y-5">
        {/* ── Profile header ─────────────────────────────────────────────── */}
        <div
          className={`bg-white rounded-xl border overflow-hidden ${isSuspended ? "border-red-300" : "border-[#E5E0D6]"}`}
        >
          {isSuspended && (
            <div className="flex items-center gap-2 px-5 py-2.5 bg-red-50 border-b border-red-200">
              <AlertTriangle size={13} className="text-red-600 flex-shrink-0" />
              <span className="text-xs font-bold text-red-700">
                Account suspended
              </span>
              <span className="text-xs text-red-600 ml-1">
                · {fmtDatetime(profile.suspendedAt)} ·{" "}
                {profile.suspensionReason}
              </span>
              <span className="text-xs text-red-500 ml-1">
                by {profile.suspendedByName || "Admin"}
              </span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start gap-5 p-6">
            <Avatar user={profile} />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-[#1B2E1E]">
                  {profile.displayName}
                </h1>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#C9952A]/10 text-[#8A6818] text-xs font-bold rounded-full border border-[#C9952A]/30">
                    <Shield size={10} />
                    Administrator
                  </span>
                )}
                {isSuspended ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                    <XCircle size={10} />
                    Suspended
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">
                    <CheckCircle size={10} />
                    Active
                  </span>
                )}
              </div>

              {/* Email — moderation context */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-500">{profile.email}</span>
                <DataLabel type="moderation-only" />
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                <span>
                  <span className="text-gray-400">ID</span> #{profile.id}
                </span>
                {profile.location && (
                  <span>
                    <MapPin size={10} className="inline mr-0.5" />
                    {profile.location}
                  </span>
                )}
                {profile.homeClubName && (
                  <span>
                    <Home size={10} className="inline mr-0.5" />
                    {profile.homeClubName}
                  </span>
                )}
                {profile.handicap != null && (
                  <span>Index {parseFloat(profile.handicap).toFixed(1)}</span>
                )}
                <span>
                  <Clock size={10} className="inline mr-0.5" />
                  Joined {fmtDate(profile.createdAt)}
                </span>
              </div>

              {/* Stats strip */}
              <div className="flex flex-wrap gap-4 mt-3">
                {[
                  {
                    icon: Flag,
                    label: "Played",
                    val: stats.totalCoursesPlayed,
                  },
                  { icon: Heart, label: "Wishlist", val: stats.totalWishlist },
                  {
                    icon: MessageSquare,
                    label: "Posts",
                    val: stats.totalFeedPosts,
                  },
                  { icon: Camera, label: "Photos", val: stats.totalPhotos },
                  { icon: Users, label: "Groups", val: stats.totalCommunities },
                  {
                    icon: AlertTriangle,
                    label: "Reports",
                    val: stats.reportCount,
                    red: stats.reportCount > 0,
                  },
                ].map(({ icon: Icon, label, val, red }) => (
                  <div key={label} className="text-center">
                    <div
                      className={`text-sm font-bold ${red ? "text-red-600" : "text-[#1B2E1E]"}`}
                    >
                      {val ?? 0}
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-0.5">
                      <Icon size={9} />
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 flex-shrink-0 w-full sm:w-auto">
              {isSuspended ? (
                <button
                  onClick={() => setModal({ type: "unsuspend" })}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors"
                >
                  <UserCheck size={13} />
                  Unsuspend Account
                </button>
              ) : (
                <button
                  onClick={() => setModal({ type: "suspend" })}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-colors"
                >
                  <UserX size={13} />
                  Suspend Account
                </button>
              )}
              {isAdmin ? (
                <button
                  onClick={() => setModal({ type: "revoke-admin" })}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-100 text-amber-800 text-xs font-bold rounded-xl hover:bg-amber-200 transition-colors border border-amber-200"
                >
                  <ShieldOff size={13} />
                  Revoke Admin
                </button>
              ) : (
                <button
                  onClick={() => setModal({ type: "grant-admin" })}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#C9952A]/10 text-[#8A6818] text-xs font-bold rounded-xl hover:bg-[#C9952A]/20 transition-colors border border-[#C9952A]/30"
                >
                  <Shield size={13} />
                  Grant Admin
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className="flex overflow-x-auto gap-1 pb-1">
          {TABS.map(({ key, label, icon: Icon }) => {
            let badge = null;
            if (key === "moderation" && stats.reportCount > 0)
              badge = stats.reportCount;
            if (key === "moderation" && stats.moderationNoteCount > 0 && !badge)
              badge = stats.moderationNoteCount;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-colors ${
                  tab === key
                    ? "bg-[#1B3828] text-white"
                    : "bg-white border border-[#E5E0D6] text-gray-600 hover:bg-[#F5F1EB]"
                }`}
              >
                <Icon size={11} />
                {label}
                {badge != null && (
                  <span
                    className={`text-xs rounded-full px-1.5 py-px font-bold ${tab === key ? "bg-white/20 text-white" : "bg-red-100 text-red-700"}`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Tab content ────────────────────────────────────────────────── */}

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div className="space-y-4">
            {/* Privacy settings */}
            <SectionCard title="Privacy Settings" icon={EyeOff}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(profile.privacySettings || {}).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    {v ? (
                      <Eye size={12} className="text-emerald-500" />
                    ) : (
                      <EyeOff size={12} className="text-gray-300" />
                    )}
                    <span className="text-xs text-gray-600 capitalize">
                      {k.replace(/_/g, " ")}
                    </span>
                    <DataLabel type="private" />
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Club memberships */}
            {memberships.length > 0 && (
              <SectionCard
                title="Club Memberships"
                icon={Home}
                badge={memberships.length}
              >
                <div className="space-y-2">
                  {memberships.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between py-1.5 border-b border-[#E5E0D6]/50 last:border-0"
                    >
                      <div>
                        <span className="text-sm font-semibold text-[#1B2E1E]">
                          {m.club_name}
                        </span>
                        <span
                          className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${m.membership_type === "home" ? "bg-[#1B3828] text-white" : "bg-gray-100 text-gray-600"}`}
                        >
                          {m.membership_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DataLabel
                          type={
                            m.visibility === "public"
                              ? "public"
                              : m.visibility === "friends"
                                ? "friends"
                                : "private"
                          }
                        />
                        {m.joined_year && (
                          <span className="text-xs text-gray-400">
                            Since {m.joined_year}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Recent activity */}
            <SectionCard
              title="Recent Activity"
              icon={Clock}
              badge={recentActivity.length}
            >
              {recentActivity.length ? (
                <div className="space-y-2">
                  {recentActivity.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 py-1">
                      <Flag
                        size={12}
                        className="text-[#C9952A] flex-shrink-0"
                      />
                      <span className="text-xs text-gray-600 flex-1 capitalize">
                        {a.activity_type.replace(/_/g, " ")}
                        {a.course_name ? ` · ${a.course_name}` : ""}
                      </span>
                      <span className="text-xs text-gray-400">
                        {fmtRel(a.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">
                  No activity recorded
                </p>
              )}
            </SectionCard>
          </div>
        )}

        {/* COURSES PLAYED */}
        {tab === "courses" && (
          <SectionCard
            title="Courses Played"
            icon={Flag}
            badge={coursesPlayed.length}
          >
            {coursesPlayed.length ? (
              <div className="divide-y divide-[#E5E0D6]/50">
                {coursesPlayed.map((pc) => (
                  <div key={pc.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1B2E1E]">
                          {pc.course_name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {[pc.city, pc.county, pc.country]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                        {pc.review_text && (
                          <div className="mt-1.5 p-2.5 bg-[#F5F1EB] rounded-lg">
                            <p className="text-xs text-gray-600 italic">
                              "{pc.review_text}"
                            </p>
                            <button
                              onClick={() =>
                                setModal({
                                  type: "remove-content",
                                  data: {
                                    contentType: "review_text",
                                    contentId: pc.id,
                                    label: "review",
                                  },
                                })
                              }
                              className="mt-1 text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium"
                            >
                              <Trash2 size={10} />
                              Remove review text
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        {pc.rating && (
                          <div className="text-xs font-bold text-[#C9952A]">
                            ★ {pc.rating}/5
                          </div>
                        )}
                        <div className="text-xs text-gray-400">
                          {fmtDate(pc.date_played || pc.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">
                No courses played yet
              </p>
            )}
          </SectionCard>
        )}

        {/* WISHLIST */}
        {tab === "wishlist" && (
          <SectionCard
            title="Wishlist"
            icon={Heart}
            badge={wishlistItems.length}
          >
            {wishlistItems.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {wishlistItems.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between py-2 px-3 bg-[#F5F1EB] rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#1B2E1E]">
                        {w.course_name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {[w.city, w.country].filter(Boolean).join(", ")}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {fmtRel(w.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">
                No wishlist items
              </p>
            )}
          </SectionCard>
        )}

        {/* FEED POSTS */}
        {tab === "posts" && (
          <SectionCard
            title="Feed Posts"
            icon={MessageSquare}
            badge={feedPosts.length}
          >
            {feedPosts.length ? (
              <div className="divide-y divide-[#E5E0D6]/50">
                {feedPosts.map((p) => (
                  <div
                    key={p.id}
                    className="py-3 flex items-start justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-500 capitalize bg-gray-100 px-2 py-0.5 rounded">
                          {p.post_type.replace(/_/g, " ")}
                        </span>
                        {p.is_private && (
                          <span className="text-xs text-amber-600 flex items-center gap-0.5">
                            <Lock size={9} />
                            Private
                          </span>
                        )}
                        {p.is_sponsored && (
                          <span className="text-xs text-blue-600">
                            Sponsored
                          </span>
                        )}
                      </div>
                      {p.caption ? (
                        <p className="text-sm text-gray-700">"{p.caption}"</p>
                      ) : (
                        <p className="text-xs text-gray-400 italic">
                          No caption
                        </p>
                      )}
                      {p.course_name && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          @ {p.course_name}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {fmtDatetime(p.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setModal({
                          type: "remove-content",
                          data: {
                            contentType: "feed_post",
                            contentId: p.id,
                            label: "feed post",
                          },
                        })
                      }
                      className="flex-shrink-0 flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors font-medium"
                    >
                      <Trash2 size={10} />
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">
                No feed posts
              </p>
            )}
          </SectionCard>
        )}

        {/* PHOTOS */}
        {tab === "photos" && (
          <SectionCard title="Photos" icon={Camera} badge={photos.length}>
            {photos.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {photos.map((ph) => (
                  <div
                    key={ph.id}
                    className="relative group rounded-lg overflow-hidden border border-[#E5E0D6] aspect-square bg-gray-100"
                  >
                    {ph.photo_url ? (
                      <img
                        src={ph.photo_url}
                        alt={ph.caption || ""}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xs text-gray-300">[removed]</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                      <span className="text-xs text-white truncate">
                        {ph.course_name || "No course"}
                      </span>
                      {ph.photo_url && (
                        <button
                          onClick={() =>
                            setModal({
                              type: "remove-content",
                              data: {
                                contentType: "photo",
                                contentId: ph.id,
                                label: "photo",
                              },
                            })
                          }
                          className="w-6 h-6 bg-red-600 rounded flex items-center justify-center flex-shrink-0"
                        >
                          <Trash2 size={10} className="text-white" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">
                No photos uploaded
              </p>
            )}
          </SectionCard>
        )}

        {/* COMMUNITIES */}
        {tab === "communities" && (
          <SectionCard
            title="Community Memberships"
            icon={Users}
            badge={communityMemberships.length}
          >
            {communityMemberships.length ? (
              <div className="divide-y divide-[#E5E0D6]/50">
                {communityMemberships.map((cm) => (
                  <div
                    key={cm.id}
                    className="py-2.5 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#1B2E1E]">
                        {cm.community_name}
                      </p>
                      <p className="text-xs text-gray-400 capitalize">
                        {cm.community_type?.replace(/_/g, " ")} · Joined{" "}
                        {fmtDate(cm.joined_at)}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        cm.role === "admin"
                          ? "bg-[#C9952A]/10 text-[#8A6818]"
                          : cm.role === "moderator"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {cm.role}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">
                Not a member of any communities
              </p>
            )}
          </SectionCard>
        )}

        {/* MODERATION */}
        {tab === "moderation" && (
          <div className="space-y-4">
            {/* Reports received */}
            {reportsReceived.length > 0 && (
              <SectionCard
                title="Reports Received"
                icon={AlertTriangle}
                badge={reportsReceived.length}
              >
                <div className="divide-y divide-[#E5E0D6]/50">
                  {reportsReceived.map((r) => (
                    <div key={r.id} className="py-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-red-600 capitalize bg-red-50 px-2 py-0.5 rounded">
                          {r.reason}
                        </span>
                        <span className="text-xs text-gray-400">
                          {fmtDatetime(r.created_at)}
                        </span>
                      </div>
                      {r.details && (
                        <p className="text-xs text-gray-600">"{r.details}"</p>
                      )}
                      {r.caption && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Post: "{r.caption}"
                        </p>
                      )}
                      <button
                        onClick={() =>
                          setModal({
                            type: "remove-content",
                            data: {
                              contentType: "feed_post",
                              contentId: r.post_id,
                              label: "reported post",
                            },
                          })
                        }
                        className="mt-1 text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium"
                      >
                        <Trash2 size={10} />
                        Remove this post
                      </button>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Remove profile content */}
            <SectionCard title="Remove Profile Content" icon={Trash2}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    setModal({
                      type: "remove-content",
                      data: { contentType: "profile_bio", label: "bio" },
                    })
                  }
                  className="flex items-center gap-2 px-3 py-2 border border-[#E5E0D6] rounded-lg text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors"
                >
                  <Trash2 size={11} />
                  Remove Bio
                </button>
                <button
                  onClick={() =>
                    setModal({
                      type: "remove-content",
                      data: {
                        contentType: "profile_photo",
                        label: "profile photo",
                      },
                    })
                  }
                  className="flex items-center gap-2 px-3 py-2 border border-[#E5E0D6] rounded-lg text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors"
                >
                  <Trash2 size={11} />
                  Remove Profile Photo
                </button>
              </div>
            </SectionCard>

            {/* Moderation notes */}
            <SectionCard
              title="Internal Moderation Notes"
              icon={FileText}
              badge={moderationNotes.length}
            >
              <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
                <Lock size={10} />
                These notes are only visible to administrators.
              </p>

              {/* Add note */}
              <div className="flex gap-2 mb-4">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add an internal moderation note…"
                  className="flex-1 text-sm border border-[#E5E0D6] rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#1B3828]/20 focus:border-[#1B3828]"
                  rows={2}
                />
                <button
                  onClick={() => {
                    if (note.trim()) addNoteMutation.mutate(note.trim());
                  }}
                  disabled={!note.trim() || addNoteMutation.isPending}
                  className="flex items-center gap-1 px-3 py-2 bg-[#1B3828] text-white text-xs font-bold rounded-xl hover:bg-[#2C5240] transition-colors disabled:opacity-50 self-end"
                >
                  <Plus size={12} />
                  Add
                </button>
              </div>

              {/* Existing notes */}
              {moderationNotes.length > 0 ? (
                <div className="space-y-2">
                  {moderationNotes.map((n) => (
                    <div
                      key={n.id}
                      className="p-3 bg-amber-50 border border-amber-200 rounded-lg"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs text-gray-700 flex-1">
                          {n.note_text}
                        </p>
                        <button
                          onClick={() => deleteNoteMutation.mutate(n.id)}
                          className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5">
                        {n.admin_name} · {fmtDatetime(n.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-3">
                  No moderation notes yet
                </p>
              )}
            </SectionCard>
          </div>
        )}

        {/* AUDIT LOG */}
        {tab === "audit" && (
          <SectionCard
            title="Audit Log"
            icon={FileText}
            badge={auditData?.pagination?.total}
          >
            {!auditData ? (
              <p className="text-sm text-gray-400 text-center py-6">Loading…</p>
            ) : auditData.logs?.length > 0 ? (
              <div className="divide-y divide-[#E5E0D6]/50">
                {auditData.logs.map((log) => {
                  const col = ACTION_COLORS[log.action] || "gray";
                  const colorMap = {
                    red: "bg-red-50 text-red-700 border-red-200",
                    emerald:
                      "bg-emerald-50 text-emerald-700 border-emerald-200",
                    amber: "bg-amber-50 text-amber-700 border-amber-200",
                    orange: "bg-orange-50 text-orange-700 border-orange-200",
                    blue: "bg-blue-50 text-blue-700 border-blue-200",
                    gray: "bg-gray-50 text-gray-600 border-gray-200",
                  };
                  return (
                    <div key={log.id} className="py-3">
                      <div className="flex items-start gap-3">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded border flex-shrink-0 mt-0.5 ${colorMap[col]}`}
                        >
                          {log.actionLabel}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-600">
                            by <strong>{log.admin.name}</strong>
                          </p>
                          {log.reason && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Reason: {log.reason}
                            </p>
                          )}
                          {log.note && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {log.note}
                            </p>
                          )}
                          {(log.previousValue || log.newValue) && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {log.previousValue} → {log.newValue}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {fmtDatetime(log.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">
                No moderation actions recorded for this user
              </p>
            )}
          </SectionCard>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      {/* Suspend */}
      {modal?.type === "suspend" && (
        <ConfirmModal
          title="Suspend Account"
          message={`This will immediately invalidate ${profile.displayName}'s active sessions and prevent login. Their data will be preserved.`}
          confirmLabel="Suspend Account"
          danger
          onCancel={() => {
            setModal(null);
            setSuspendReason("");
          }}
          onConfirm={() => {
            if (suspendReason.trim())
              suspendMutation.mutate({
                action: "suspend",
                reason: suspendReason,
              });
          }}
        >
          <textarea
            placeholder="Reason for suspension (required)…"
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            className="w-full text-sm border border-[#E5E0D6] rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
            rows={3}
            autoFocus
          />
          {!suspendReason.trim() && (
            <p className="text-xs text-red-500">A reason is required.</p>
          )}
        </ConfirmModal>
      )}

      {/* Unsuspend */}
      {modal?.type === "unsuspend" && (
        <ConfirmModal
          title="Unsuspend Account"
          message={`Restore ${profile.displayName}'s access. They will be able to log in again immediately.`}
          confirmLabel="Unsuspend Account"
          onCancel={() => setModal(null)}
          onConfirm={() =>
            suspendMutation.mutate({
              action: "unsuspend",
              reason: "Lifted by admin",
            })
          }
        />
      )}

      {/* Grant admin */}
      {modal?.type === "grant-admin" && (
        <ConfirmModal
          title="Grant Admin Access"
          message={`Give ${profile.displayName} full administrator access to the Heathland Links admin panel. This cannot be undone without revoking it.`}
          confirmLabel="Grant Admin Access"
          onCancel={() => setModal(null)}
          onConfirm={() => adminRoleMutation.mutate({ action: "grant" })}
        />
      )}

      {/* Revoke admin */}
      {modal?.type === "revoke-admin" && (
        <ConfirmModal
          title="Revoke Admin Access"
          message={`Remove ${profile.displayName}'s administrator privileges. They will no longer be able to access the admin panel.`}
          confirmLabel="Revoke Admin Access"
          danger
          onCancel={() => setModal(null)}
          onConfirm={() => adminRoleMutation.mutate({ action: "revoke" })}
        />
      )}

      {/* Remove content */}
      {modal?.type === "remove-content" && (
        <ConfirmModal
          title={`Remove ${modal.data?.label}`}
          message={`The ${modal.data?.label} will be cleared. The user's account and all other data will be preserved.`}
          confirmLabel={`Remove ${modal.data?.label}`}
          danger
          onCancel={() => {
            setModal(null);
            setRemoveReason("");
          }}
          onConfirm={() => {
            if (removeReason.trim())
              removeContentMutation.mutate({
                contentType: modal.data?.contentType,
                contentId: modal.data?.contentId,
                reason: removeReason,
              });
          }}
        >
          <textarea
            placeholder="Reason for removal (required)…"
            value={removeReason}
            onChange={(e) => setRemoveReason(e.target.value)}
            className="w-full text-sm border border-[#E5E0D6] rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
            rows={2}
            autoFocus
          />
          {!removeReason.trim() && (
            <p className="text-xs text-red-500">A reason is required.</p>
          )}
        </ConfirmModal>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
