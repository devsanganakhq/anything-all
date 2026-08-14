"use client";
/**
 * Admin — Course Photo Moderation
 * /admin/course-photos
 *
 * Allows admins to:
 *  - View pending / approved / rejected / removed photos
 *  - Filter by course or user
 *  - Approve, Reject (with reason), Remove, Feature, Unfeature
 *  - View open report count per photo
 *  - View uploader and linked review
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const STATUS_TABS = [
  { key: "pending", label: "Pending", color: "#D97706" },
  { key: "approved", label: "Approved", color: "#059669" },
  { key: "rejected", label: "Rejected", color: "#DC2626" },
  { key: "removed", label: "Removed", color: "#6B7280" },
];

export default function CoursePhotosModerationPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("pending");
  const [courseId, setCourseId] = useState("");
  const [userId, setUserId] = useState("");
  const [page, setPage] = useState(1);
  const [rejectModal, setRejectModal] = useState(null); // { photoId }
  const [rejectReason, setRejectReason] = useState("");
  const [removeModal, setRemoveModal] = useState(null);
  const [removeReason, setRemoveReason] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Fetch photos ──────────────────────────────────────────────────────────
  const params = new URLSearchParams({
    status,
    page,
    ...(courseId ? { courseId } : {}),
    ...(userId ? { userId } : {}),
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-course-photos", status, courseId, userId, page],
    queryFn: async () => {
      const res = await fetch(`/api/admin/course-photos?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch photos");
      return res.json();
    },
    staleTime: 15_000,
  });

  // ── Moderation mutation ───────────────────────────────────────────────────
  const moderateMutation = useMutation({
    mutationFn: async ({ photoId, action, reason, displayOrder }) => {
      const res = await fetch(`/api/admin/course-photos/${photoId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason, displayOrder }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Action failed");
      return json;
    },
    onSuccess: (_, { action }) => {
      qc.invalidateQueries({ queryKey: ["admin-course-photos"] });
      showToast(`Action "${action}" applied successfully.`);
      setRejectModal(null);
      setRejectReason("");
      setRemoveModal(null);
      setRemoveReason("");
    },
    onError: (err) => showToast(err.message, false),
  });

  const act = (photoId, action, reason) =>
    moderateMutation.mutate({ photoId, action, reason });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const summary = data?.summary ?? {};
  const photos = data?.photos ?? [];
  const pag = data?.pagination ?? {};

  return (
    <div
      style={{
        padding: "24px 28px",
        maxWidth: 1100,
        margin: "0 auto",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#1B2E22",
          marginBottom: 4,
        }}
      >
        Course Photo Moderation
      </h1>
      <p style={{ color: "#7A8570", fontSize: 13, marginBottom: 24 }}>
        Review, approve and manage community-uploaded course photos.
      </p>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 9999,
            padding: "12px 20px",
            borderRadius: 8,
            backgroundColor: toast.ok ? "#1B3828" : "#C0392B",
            color: "#FFF",
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Summary counts */}
      <div
        style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}
      >
        {STATUS_TABS.map((t) => (
          <div
            key={t.key}
            onClick={() => {
              setStatus(t.key);
              setPage(1);
            }}
            style={{
              cursor: "pointer",
              padding: "10px 20px",
              borderRadius: 8,
              border: `2px solid ${status === t.key ? t.color : "#E3DED5"}`,
              backgroundColor: status === t.key ? t.color + "15" : "#FFF",
              fontWeight: 700,
              fontSize: 13,
              color: status === t.key ? t.color : "#7A8570",
            }}
          >
            {t.label}
            <span
              style={{
                marginLeft: 8,
                backgroundColor: t.color + "22",
                color: t.color,
                borderRadius: 20,
                padding: "2px 8px",
                fontSize: 11,
              }}
            >
              {summary[t.key] ?? 0}
            </span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div
        style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}
      >
        <input
          placeholder="Filter by course ID"
          value={courseId}
          onChange={(e) => {
            setCourseId(e.target.value);
            setPage(1);
          }}
          style={inputStyle}
        />
        <input
          placeholder="Filter by user ID"
          value={userId}
          onChange={(e) => {
            setUserId(e.target.value);
            setPage(1);
          }}
          style={inputStyle}
        />
      </div>

      {/* Photo grid */}
      {isLoading ? (
        <p style={{ color: "#7A8570" }}>Loading photos…</p>
      ) : photos.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "#A89F93",
            borderRadius: 12,
            border: "1px solid #E3DED5",
          }}
        >
          <p style={{ fontSize: 32, marginBottom: 8 }}>📷</p>
          <p style={{ fontWeight: 600, color: "#1B2E22" }}>
            No photos in this queue
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
          {photos.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              status={status}
              onApprove={() => act(photo.id, "approve")}
              onReject={() => {
                setRejectModal({ photoId: photo.id });
                setRejectReason("");
              }}
              onRemove={() => {
                setRemoveModal({ photoId: photo.id });
                setRemoveReason("");
              }}
              onFeature={() =>
                act(photo.id, photo.is_featured ? "unfeature" : "feature")
              }
              loading={
                moderateMutation.isPending &&
                moderateMutation.variables?.photoId === photo.id
              }
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pag.total > (pag.limit ?? 20) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 24,
            justifyContent: "center",
          }}
        >
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            style={btnStyle("#F5F1EB")}
          >
            ← Prev
          </button>
          <span style={{ fontSize: 13, color: "#7A8570" }}>
            Page {page} · {pag.total} total
          </span>
          <button
            disabled={!pag.hasMore}
            onClick={() => setPage((p) => p + 1)}
            style={btnStyle("#F5F1EB")}
          >
            Next →
          </button>
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <Modal
          title="Reject photo"
          onClose={() => setRejectModal(null)}
          onConfirm={() => act(rejectModal.photoId, "reject", rejectReason)}
          confirmLabel="Reject"
          confirmColor="#DC2626"
          disabled={!rejectReason.trim() || moderateMutation.isPending}
        >
          <label style={labelStyle}>Rejection reason (required)</label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="e.g. Photo does not show the course clearly"
            style={{ ...inputStyle, width: "100%", resize: "vertical" }}
          />
        </Modal>
      )}

      {/* Remove modal */}
      {removeModal && (
        <Modal
          title="Remove approved photo"
          onClose={() => setRemoveModal(null)}
          onConfirm={() =>
            act(
              removeModal.photoId,
              "remove",
              removeReason || "Removed by admin",
            )
          }
          confirmLabel="Remove"
          confirmColor="#DC2626"
          disabled={moderateMutation.isPending}
        >
          <label style={labelStyle}>Reason (optional)</label>
          <textarea
            value={removeReason}
            onChange={(e) => setRemoveReason(e.target.value)}
            rows={2}
            placeholder="Reason for removal"
            style={{ ...inputStyle, width: "100%", resize: "vertical" }}
          />
        </Modal>
      )}
    </div>
  );
}

// ─── Photo card ───────────────────────────────────────────────────────────────
function PhotoCard({
  photo,
  status,
  onApprove,
  onReject,
  onRemove,
  onFeature,
  loading,
}) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <div
      style={{
        backgroundColor: "#FFF",
        borderRadius: 12,
        border: "1px solid #E3DED5",
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      {/* Image */}
      <div
        style={{
          height: 180,
          backgroundColor: "#F5F1EB",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {imgErr ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#A89F93",
              fontSize: 12,
            }}
          >
            Image unavailable
          </div>
        ) : (
          <img
            src={photo.thumbnail_url || photo.image_url}
            alt="Course photo"
            onError={() => setImgErr(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
        {photo.is_featured && (
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              backgroundColor: "#C9A84C",
              color: "#FFF",
              fontSize: 9,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 12,
              letterSpacing: 1,
            }}
          >
            FEATURED
          </div>
        )}
        {photo.is_official && (
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              backgroundColor: "#1B3828",
              color: "#FFF",
              fontSize: 9,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 12,
              letterSpacing: 1,
            }}
          >
            OFFICIAL
          </div>
        )}
        {photo.open_reports > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: 8,
              right: 8,
              backgroundColor: "#DC2626",
              color: "#FFF",
              fontSize: 9,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 12,
            }}
          >
            ⚑ {photo.open_reports} report{photo.open_reports !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Meta */}
      <div style={{ padding: 12 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#1B2E22",
            marginBottom: 2,
          }}
        >
          {photo.course_name}
        </div>
        {photo.caption && (
          <div
            style={{
              fontSize: 11,
              color: "#7A8570",
              fontStyle: "italic",
              marginBottom: 4,
            }}
          >
            "{photo.caption}"
          </div>
        )}
        <div style={{ fontSize: 10, color: "#A89F93", marginBottom: 8 }}>
          By {photo.first_name || "Unknown"} {photo.last_name || ""}
          {photo.email && <span> · {photo.email}</span>}
          {" · "}
          {new Date(photo.uploaded_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </div>
        <div style={{ fontSize: 10, color: "#A89F93", marginBottom: 10 }}>
          ❤ {photo.like_count} ·{" "}
          {photo.report_count > 0
            ? `⚑ ${photo.report_count} total reports`
            : "No reports"}
          {photo.rejection_reason && (
            <span style={{ color: "#DC2626", display: "block", marginTop: 3 }}>
              Reason: {photo.rejection_reason}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {status === "pending" && (
            <>
              <button
                onClick={onApprove}
                disabled={loading}
                style={btnStyle("#059669", "#FFF")}
              >
                ✓ Approve
              </button>
              <button
                onClick={onReject}
                disabled={loading}
                style={btnStyle("#DC2626", "#FFF")}
              >
                ✗ Reject
              </button>
            </>
          )}
          {status === "approved" && (
            <>
              <button
                onClick={onFeature}
                disabled={loading}
                style={btnStyle(
                  photo.is_featured ? "#6B4F8A" : "#C9A84C",
                  "#FFF",
                )}
              >
                {photo.is_featured ? "★ Unfeature" : "☆ Feature"}
              </button>
              <button
                onClick={onRemove}
                disabled={loading}
                style={btnStyle("#DC2626", "#FFF")}
              >
                Remove
              </button>
            </>
          )}
          {(status === "rejected" || status === "removed") && (
            <button
              onClick={onApprove}
              disabled={loading}
              style={btnStyle("#059669", "#FFF")}
            >
              Restore
            </button>
          )}
          {photo.review_id && (
            <span
              style={{ fontSize: 10, color: "#7A8570", alignSelf: "center" }}
            >
              Review #{photo.review_id}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Simple modal ─────────────────────────────────────────────────────────────
function Modal({
  title,
  children,
  onClose,
  onConfirm,
  confirmLabel,
  confirmColor,
  disabled,
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.4)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          backgroundColor: "#FFF",
          borderRadius: 12,
          padding: 24,
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
        }}
      >
        <h3
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#1B2E22",
            marginBottom: 16,
          }}
        >
          {title}
        </h3>
        {children}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 20,
            justifyContent: "flex-end",
          }}
        >
          <button onClick={onClose} style={btnStyle("#F5F1EB")}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={disabled}
            style={btnStyle(confirmColor, "#FFF")}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Micro styles ─────────────────────────────────────────────────────────────
const inputStyle = {
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid #E3DED5",
  fontSize: 13,
  outline: "none",
  color: "#1B2E22",
  backgroundColor: "#FFF",
};
const labelStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: "#7A8570",
  display: "block",
  marginBottom: 6,
  letterSpacing: 0.5,
};
function btnStyle(bg = "#1B3828", color = "#FFF") {
  return {
    padding: "7px 14px",
    borderRadius: 6,
    border: "none",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.5,
    cursor: "pointer",
    backgroundColor: bg,
    color,
    opacity: 1,
    transition: "opacity 0.15s",
  };
}
