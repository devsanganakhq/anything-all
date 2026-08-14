"use client";
/**
 * Heathland Links — Course Database Import
 * /admin/courses/import
 *
 * Admin-only tool for bulk-importing verified golf course records via CSV.
 * Three-step workflow:
 *   Step 1 — Upload or paste CSV
 *   Step 2 — Preview (dry run) with per-row validation and duplicate detection
 *   Step 3 — Confirm and execute the import
 *
 * No data is written to the database until Step 3 is explicitly confirmed.
 */

import { useState, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Upload,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Database,
  Copy,
  Flag,
} from "lucide-react";

// ─── CSV template ─────────────────────────────────────────────────────────────

const TEMPLATE_HEADERS = [
  "course_name",
  "club_name",
  "city",
  "county",
  "country",
  "latitude",
  "longitude",
  "course_type",
  "holes",
  "par",
  "description",
  "website",
  "course_image_url",
];

const TEMPLATE_EXAMPLE = [
  "Example Course Name",
  "Example Golf Club",
  "St Andrews",
  "Fife",
  "Scotland",
  "56.3429",
  "-2.8028",
  "Links",
  "18",
  "72",
  "A brief factual description of the course.",
  "https://www.exampleclub.co.uk",
  "",
];

function buildTemplateCSV() {
  const header = TEMPLATE_HEADERS.join(",");
  const row = TEMPLATE_EXAMPLE.map((v) =>
    v.includes(",") ? `"${v}"` : v,
  ).join(",");
  return `${header}\n${row}`;
}

function downloadCSV(content, filename) {
  if (typeof document === "undefined") return;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS = {
  ready: {
    label: "READY",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-800",
    dot: "bg-emerald-500",
    icon: CheckCircle,
  },
  imported: {
    label: "IMPORTED",
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    text: "text-emerald-800",
    dot: "bg-emerald-600",
    icon: CheckCircle,
  },
  duplicate: {
    label: "DUPLICATE",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    dot: "bg-amber-500",
    icon: Copy,
  },
  flagged: {
    label: "REVIEW",
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-800",
    dot: "bg-orange-500",
    icon: Flag,
  },
  error: {
    label: "ERROR",
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-800",
    dot: "bg-red-500",
    icon: XCircle,
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({ value, label, sublabel, color }) {
  const colors = {
    green: "border-l-emerald-500 bg-emerald-50",
    amber: "border-l-amber-500 bg-amber-50",
    orange: "border-l-orange-500 bg-orange-50",
    red: "border-l-red-500 bg-red-50",
    gray: "border-l-gray-400 bg-gray-50",
    blue: "border-l-blue-500 bg-blue-50",
  };
  const textColors = {
    green: "text-emerald-800",
    amber: "text-amber-800",
    orange: "text-orange-800",
    red: "text-red-800",
    gray: "text-gray-700",
    blue: "text-blue-800",
  };
  return (
    <div
      className={`border-l-4 rounded-r-lg px-4 py-3 ${colors[color] || colors.gray}`}
    >
      <div
        className={`text-2xl font-bold ${textColors[color] || "text-gray-700"}`}
      >
        {value}
      </div>
      <div
        className={`text-xs font-semibold tracking-wider mt-0.5 ${textColors[color] || "text-gray-600"}`}
      >
        {label}
      </div>
      {sublabel && (
        <div className="text-xs text-gray-500 mt-0.5">{sublabel}</div>
      )}
    </div>
  );
}

function RowDetail({ result, overrideRows, onToggleOverride }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS[result.status] || STATUS.error;
  const Icon = cfg.icon;

  return (
    <div className={`border rounded-lg overflow-hidden ${cfg.border}`}>
      <button
        onClick={() => setExpanded((e) => !e)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:opacity-80 transition-opacity ${cfg.bg}`}
      >
        {/* Status dot */}
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
        {/* Row number */}
        <span className="text-xs font-mono text-gray-400 flex-shrink-0 w-10">
          row {result.row}
        </span>
        {/* Course name */}
        <span className={`flex-1 text-sm font-semibold ${cfg.text}`}>
          {result.name}
        </span>
        {/* Location */}
        {(result.city || result.country) && (
          <span className="text-xs text-gray-500 hidden sm:block">
            {[result.city, result.country].filter(Boolean).join(", ")}
          </span>
        )}
        {/* Status badge */}
        <span
          className={`text-xs font-bold tracking-wider px-2 py-0.5 rounded ${cfg.bg} ${cfg.text} border ${cfg.border} flex-shrink-0`}
        >
          {cfg.label}
        </span>
        {/* Warnings badge */}
        {result.warnings?.length > 0 && (
          <span className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded flex-shrink-0">
            {result.warnings.length} warning
            {result.warnings.length > 1 ? "s" : ""}
          </span>
        )}
        {/* Expand icon */}
        <span className="text-gray-400 flex-shrink-0">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 bg-white space-y-3">
          {/* Errors */}
          {result.errors?.map((e, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-sm text-red-700"
            >
              <XCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{e}</span>
            </div>
          ))}

          {/* Warnings */}
          {result.warnings?.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-sm text-amber-700"
            >
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}

          {/* Exact duplicate info */}
          {result.duplicate && (
            <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded p-2">
              <Copy size={14} className="flex-shrink-0 mt-0.5" />
              <span>
                <strong>Existing course ID {result.duplicate.id}:</strong>{" "}
                {result.duplicate.name}
                {result.duplicate.city ? `, ${result.duplicate.city}` : ""}
                {result.duplicate.country
                  ? `, ${result.duplicate.country}`
                  : ""}
                . {result.duplicate.reason}.
              </span>
            </div>
          )}

          {/* Proximity flagged info */}
          {result.nearDuplicate && (
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm text-orange-700 bg-orange-50 rounded p-2">
                <Flag size={14} className="flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Proximity warning:</strong>{" "}
                  {result.nearDuplicate.reason}
                </span>
              </div>
              {/* Override toggle */}
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={overrideRows.includes(result.row)}
                  onChange={() => onToggleOverride(result.row)}
                  className="w-4 h-4 accent-[#1B3828]"
                />
                <span>
                  I have verified this is a different course — include in import
                </span>
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CourseImportPage() {
  const fileInputRef = useRef(null);
  const [csvText, setCsvText] = useState("");
  const [step, setStep] = useState("upload"); // upload | preview | done
  const [previewData, setPreviewData] = useState(null);
  const [overrideRows, setOverrideRows] = useState([]);
  const [activeTab, setActiveTab] = useState("all"); // all | ready | flagged | duplicate | error

  // ── Mutations ────────────────────────────────────────────────────────────

  const previewMutation = useMutation({
    mutationFn: async (csv) => {
      const res = await fetch("/api/admin/courses/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, dryRun: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Preview failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setPreviewData(data);
      setOverrideRows([]);
      setStep("preview");
      setActiveTab("all");
    },
  });

  const importMutation = useMutation({
    mutationFn: async ({ csv, overrideRows }) => {
      const res = await fetch("/api/admin/courses/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, dryRun: false, overrideRows }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Import failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setPreviewData(data);
      setStep("done");
    },
  });

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target.result);
    reader.readAsText(file, "UTF-8");
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target.result);
    reader.readAsText(file, "UTF-8");
  }, []);

  const handlePreview = useCallback(() => {
    if (!csvText.trim()) return;
    previewMutation.mutate(csvText);
  }, [csvText, previewMutation]);

  const handleImport = useCallback(() => {
    importMutation.mutate({ csv: csvText, overrideRows });
  }, [csvText, overrideRows, importMutation]);

  const handleReset = useCallback(() => {
    setCsvText("");
    setPreviewData(null);
    setOverrideRows([]);
    setStep("upload");
    setActiveTab("all");
    previewMutation.reset();
    importMutation.reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleToggleOverride = useCallback((rowNum) => {
    setOverrideRows((prev) =>
      prev.includes(rowNum)
        ? prev.filter((r) => r !== rowNum)
        : [...prev, rowNum],
    );
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────

  const results = previewData?.results || [];
  const summary = previewData?.summary || {};

  const filteredResults = results.filter((r) => {
    if (activeTab === "all") return true;
    if (activeTab === "ready")
      return r.status === "ready" || r.status === "imported";
    if (activeTab === "flagged") return r.status === "flagged";
    if (activeTab === "duplicate") return r.status === "duplicate";
    if (activeTab === "error") return r.status === "error";
    return true;
  });

  const canImport = summary.ready > 0 || overrideRows.length > 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F5F1EB]">
      {/* Header */}
      <div className="bg-[#1B3828] text-white">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-1">
            <Database size={20} className="text-[#C9952A]" />
            <span className="text-xs font-bold tracking-widest text-[#C9952A]">
              HEATHLAND LINKS — ADMIN
            </span>
          </div>
          <h1 className="text-2xl font-light italic text-white">
            Course Database Import
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Bulk-import verified golf courses via CSV. No data is written until
            you explicitly confirm.
          </p>
        </div>

        {/* Step indicator */}
        <div className="max-w-5xl mx-auto px-6 pb-0">
          <div className="flex">
            {["Upload CSV", "Preview & Review", "Import"].map((label, i) => {
              const isActive =
                (i === 0 && step === "upload") ||
                (i === 1 && step === "preview") ||
                (i === 2 && step === "done");
              const isDone =
                (i === 0 && step !== "upload") || (i === 1 && step === "done");
              return (
                <div
                  key={label}
                  className={`px-6 py-3 text-xs font-bold tracking-wider border-b-2 transition-colors ${
                    isActive
                      ? "border-[#C9952A] text-white"
                      : isDone
                        ? "border-emerald-400 text-emerald-300"
                        : "border-transparent text-white/40"
                  }`}
                >
                  {i + 1}. {label}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* ── STEP 1: UPLOAD ── */}
        {step === "upload" && (
          <>
            {/* Template download */}
            <div className="bg-white rounded-xl border border-[#E5E0D6] p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-start gap-3 flex-1">
                <FileText
                  size={20}
                  className="text-[#1B3828] flex-shrink-0 mt-0.5"
                />
                <div>
                  <p className="text-sm font-semibold text-[#1B2E1E]">
                    Step 1 — Download the CSV template
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Use the template to ensure your data is correctly formatted.
                    Required columns:{" "}
                    <code className="bg-gray-100 px-1 rounded">
                      course_name
                    </code>
                    , <code className="bg-gray-100 px-1 rounded">latitude</code>
                    ,{" "}
                    <code className="bg-gray-100 px-1 rounded">longitude</code>.
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  downloadCSV(
                    buildTemplateCSV(),
                    "heathland-links-course-import-template.csv",
                  )
                }
                className="flex items-center gap-2 px-4 py-2 bg-[#1B3828] text-white text-xs font-bold tracking-wider rounded-lg hover:bg-[#2C5240] transition-colors flex-shrink-0"
              >
                <Download size={14} />
                DOWNLOAD TEMPLATE
              </button>
            </div>

            {/* Upload area */}
            <div className="bg-white rounded-xl border border-[#E5E0D6] overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-[#E5E0D6]">
                <p className="text-sm font-semibold text-[#1B2E1E]">
                  Step 2 — Upload or paste your CSV
                </p>
              </div>

              <div className="p-5 space-y-4">
                {/* Drop zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#C5BDB0] rounded-lg p-8 text-center cursor-pointer hover:border-[#1B3828] hover:bg-[#F5F1EB]/50 transition-colors"
                >
                  <Upload size={28} className="text-[#8A7968] mx-auto mb-2" />
                  <p className="text-sm font-semibold text-[#1B2E1E]">
                    Drag and drop your CSV file here
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    or click to browse
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                {/* Paste area */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 tracking-wider mb-2">
                    OR PASTE CSV DIRECTLY
                  </label>
                  <textarea
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    placeholder={`course_name,club_name,city,county,country,latitude,longitude,course_type,holes,par,description,website,course_image_url\nExample Course,Example Club,St Andrews,Fife,Scotland,56.3429,-2.8028,Links,18,72,,, `}
                    rows={8}
                    className="w-full font-mono text-xs border border-[#E5E0D6] rounded-lg p-3 bg-[#FAFAF8] focus:outline-none focus:border-[#1B3828] resize-y placeholder-gray-300"
                  />
                  {csvText && (
                    <p className="text-xs text-gray-400 mt-1">
                      {csvText.trim().split("\n").length - 1} data row
                      {csvText.trim().split("\n").length - 1 !== 1 ? "s" : ""}{" "}
                      detected (excluding header)
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Data integrity notice */}
            <div className="bg-[#1B3828]/5 border border-[#1B3828]/15 rounded-xl p-4 flex items-start gap-3">
              <Info size={16} className="text-[#1B3828] flex-shrink-0 mt-0.5" />
              <div className="text-xs text-[#1B3828]/80 space-y-1">
                <p className="font-semibold">Data integrity rules</p>
                <ul className="list-disc list-inside space-y-0.5 text-[#1B3828]/70">
                  <li>Only import verified, real golf course data</li>
                  <li>Do not fabricate coordinates, descriptions or images</li>
                  <li>Existing courses are never overwritten</li>
                  <li>
                    All existing played, wishlist and ranking records are
                    preserved
                  </li>
                  <li>A dry-run preview is shown before anything is written</li>
                </ul>
              </div>
            </div>

            {/* Error from API */}
            {previewMutation.isError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <XCircle
                  size={16}
                  className="text-red-600 flex-shrink-0 mt-0.5"
                />
                <p className="text-sm text-red-700">
                  {previewMutation.error?.message}
                </p>
              </div>
            )}

            {/* Preview button */}
            <div className="flex justify-end">
              <button
                onClick={handlePreview}
                disabled={!csvText.trim() || previewMutation.isPending}
                className="flex items-center gap-2 px-6 py-3 bg-[#1B3828] text-white text-sm font-bold tracking-wider rounded-xl hover:bg-[#2C5240] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {previewMutation.isPending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ANALYSING…
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    PREVIEW IMPORT
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2: PREVIEW ── */}
        {step === "preview" && previewData && (
          <>
            {/* Summary cards */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-[#1B2E1E] tracking-wider">
                  IMPORT PREVIEW — DRY RUN (nothing written yet)
                </h2>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#1B3828] transition-colors"
                >
                  <RotateCcw size={12} />
                  Start over
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <SummaryCard
                  value={summary.total}
                  label="TOTAL ROWS"
                  color="blue"
                />
                <SummaryCard
                  value={summary.ready}
                  label="READY TO IMPORT"
                  color="green"
                />
                <SummaryCard
                  value={summary.duplicates}
                  label="DUPLICATES"
                  sublabel="skipped"
                  color="amber"
                />
                <SummaryCard
                  value={summary.flagged}
                  label="NEED REVIEW"
                  sublabel="proximity warning"
                  color="orange"
                />
                <SummaryCard
                  value={summary.errors}
                  label="ERRORS"
                  sublabel="validation failed"
                  color="red"
                />
                <SummaryCard
                  value={summary.warnings_total}
                  label="WARNINGS"
                  sublabel="data quality notes"
                  color="gray"
                />
              </div>
            </div>

            {/* Flagged rows helper */}
            {summary.flagged > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
                <Flag
                  size={16}
                  className="text-orange-600 flex-shrink-0 mt-0.5"
                />
                <div className="text-sm text-orange-800">
                  <p className="font-semibold">
                    {summary.flagged} row{summary.flagged > 1 ? "s" : ""} need
                    review
                  </p>
                  <p className="text-xs mt-0.5 text-orange-700">
                    These courses are within 2 km of an existing course in the
                    database. Expand each row to verify they are distinct
                    courses, then tick the checkbox to include them in the
                    import.
                  </p>
                </div>
              </div>
            )}

            {/* Filter tabs */}
            <div className="bg-white rounded-xl border border-[#E5E0D6] overflow-hidden">
              <div className="flex border-b border-[#E5E0D6] overflow-x-auto">
                {[
                  { key: "all", label: `All (${results.length})` },
                  {
                    key: "ready",
                    label: `Ready (${summary.ready})`,
                    color: "text-emerald-700",
                  },
                  {
                    key: "flagged",
                    label: `Review (${summary.flagged})`,
                    color: "text-orange-700",
                  },
                  {
                    key: "duplicate",
                    label: `Duplicates (${summary.duplicates})`,
                    color: "text-amber-700",
                  },
                  {
                    key: "error",
                    label: `Errors (${summary.errors})`,
                    color: "text-red-700",
                  },
                ].map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`px-5 py-3 text-xs font-bold whitespace-nowrap transition-colors border-b-2 ${
                      activeTab === key
                        ? `border-[#1B3828] ${color || "text-[#1B3828]"} bg-[#F5F1EB]`
                        : `border-transparent ${color || "text-gray-500"} hover:bg-gray-50`
                    }`}
                  >
                    {label.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Row list */}
              <div className="p-4 space-y-2 max-h-[480px] overflow-y-auto">
                {filteredResults.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-8">
                    No rows in this category
                  </p>
                ) : (
                  filteredResults.map((result) => (
                    <RowDetail
                      key={result.row}
                      result={result}
                      overrideRows={overrideRows}
                      onToggleOverride={handleToggleOverride}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Import error */}
            {importMutation.isError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <XCircle
                  size={16}
                  className="text-red-600 flex-shrink-0 mt-0.5"
                />
                <p className="text-sm text-red-700">
                  {importMutation.error?.message}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2.5 border border-[#E5E0D6] bg-white text-sm font-semibold text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <RotateCcw size={14} />
                Upload different CSV
              </button>

              <div className="flex items-center gap-3">
                {!canImport && (
                  <p className="text-xs text-gray-400">
                    No rows are ready to import
                  </p>
                )}
                <button
                  onClick={handleImport}
                  disabled={!canImport || importMutation.isPending}
                  className="flex items-center gap-2 px-6 py-3 bg-[#1B3828] text-white text-sm font-bold tracking-wider rounded-xl hover:bg-[#2C5240] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {importMutation.isPending ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      IMPORTING…
                    </>
                  ) : (
                    <>
                      <Database size={16} />
                      CONFIRM — IMPORT {summary.ready + overrideRows.length}{" "}
                      COURSE
                      {summary.ready + overrideRows.length !== 1 ? "S" : ""}
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 3: DONE ── */}
        {step === "done" && previewData && (
          <>
            {/* Result banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 flex items-start gap-4">
              <CheckCircle
                size={24}
                className="text-emerald-600 flex-shrink-0"
              />
              <div>
                <p className="text-base font-bold text-emerald-800">
                  Import complete — {summary.imported} course
                  {summary.imported !== 1 ? "s" : ""} added to the database
                </p>
                <p className="text-sm text-emerald-700 mt-1">
                  These courses are now live in the Heathland Links course
                  database, visible on the map and in search.
                </p>
              </div>
            </div>

            {/* Final summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <SummaryCard
                value={summary.imported}
                label="IMPORTED"
                color="green"
              />
              <SummaryCard
                value={summary.duplicates}
                label="SKIPPED"
                sublabel="exact duplicates"
                color="amber"
              />
              <SummaryCard
                value={summary.flagged}
                label="SKIPPED"
                sublabel="not verified"
                color="orange"
              />
              <SummaryCard
                value={summary.errors}
                label="ERRORS"
                sublabel="not imported"
                color="red"
              />
              <SummaryCard
                value={previewData.insertedIds?.length || 0}
                label="NEW IDs"
                sublabel="assigned by DB"
                color="blue"
              />
            </div>

            {/* Final row breakdown */}
            <div className="bg-white rounded-xl border border-[#E5E0D6] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#E5E0D6]">
                <p className="text-sm font-bold text-[#1B2E1E]">
                  Per-row results
                </p>
              </div>
              <div className="p-4 space-y-2 max-h-[480px] overflow-y-auto">
                {results.map((result) => (
                  <RowDetail
                    key={result.row}
                    result={result}
                    overrideRows={[]}
                    onToggleOverride={() => {}}
                  />
                ))}
              </div>
            </div>

            {/* Next steps */}
            <div className="bg-[#1B3828]/5 border border-[#1B3828]/15 rounded-xl p-5">
              <p className="text-xs font-bold tracking-wider text-[#1B3828] mb-3">
                NEXT STEPS
              </p>
              <ul className="text-sm text-[#1B3828]/80 space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle
                    size={14}
                    className="text-emerald-600 flex-shrink-0 mt-0.5"
                  />
                  New courses are immediately live in search and on the map
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle
                    size={14}
                    className="text-emerald-600 flex-shrink-0 mt-0.5"
                  />
                  Add ranking data for new courses via a separate rankings
                  import (coming soon)
                </li>
                <li className="flex items-start gap-2">
                  <Info
                    size={14}
                    className="text-[#1B3828]/60 flex-shrink-0 mt-0.5"
                  />
                  <span>
                    <code className="bg-[#1B3828]/10 px-1 rounded text-xs">
                      community_rating
                    </code>{" "}
                    and{" "}
                    <code className="bg-[#1B3828]/10 px-1 rounded text-xs">
                      played_count
                    </code>{" "}
                    will populate organically as members use the app
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Info
                    size={14}
                    className="text-[#1B3828]/60 flex-shrink-0 mt-0.5"
                  />
                  Course images remain NULL until club-provided or licensed
                  images are available
                </li>
              </ul>
            </div>

            {/* Reset */}
            <div className="flex justify-start">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1B3828] text-white text-sm font-bold tracking-wider rounded-xl hover:bg-[#2C5240] transition-colors"
              >
                <Upload size={14} />
                IMPORT ANOTHER CSV
              </button>
            </div>
          </>
        )}
      </div>

      <style jsx global>{`
        @keyframes hl-spin-kf {
          to {
            transform: rotate(360deg);
          }
        }
        .hl-spin {
          animation: hl-spin-kf 0.8s linear infinite;
        }
      `}</style>
    </div>
  );
}
