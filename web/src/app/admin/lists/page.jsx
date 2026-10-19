"use client";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
const empty = {
  title: "",
  description: "",
  courseIds: [],
  isPublished: false,
  displayOrder: 0,
};
export default function AdminLists() {
  const qc = useQueryClient(),
    [form, setForm] = useState(empty),
    [editing, setEditing] = useState(null),
    [q, setQ] = useState(""),
    [results, setResults] = useState([]),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [importReport, setImportReport] = useState(null),
    [importing, setImporting] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-lists"],
    queryFn: async () => {
      const r = await fetch("/api/admin/lists");
      if (!r.ok) throw Error("Unable to load lists");
      return r.json();
    },
  });
  useEffect(() => {
    const c = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(
          `/api/courses/list?q=${encodeURIComponent(q)}&limit=30`,
          { signal: c.signal },
        );
        if (!r.ok) throw Error();
        setResults(await r.json());
      } catch (e) {
        if (e.name !== "AbortError") setError("Course search unavailable");
      }
    }, 250);
    return () => {
      clearTimeout(t);
      c.abort();
    };
  }, [q]);
  const set = (key, value) => setForm((p) => ({ ...p, [key]: value }));
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const r = await fetch(`/api/admin/lists${editing ? `/${editing}` : ""}`, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await r.json();
      if (!r.ok) throw Error(j.error);
      await qc.invalidateQueries({ queryKey: ["admin-lists"] });
      setEditing(j.id);
      setError("Saved successfully.");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  const importClientLists = async (apply = false) => {
    setImporting(true);
    try {
      const r = await fetch(
        "/api/admin/lists/import",
        apply
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ apply: true }),
            }
          : {},
      );
      const j = await r.json();
      if (!r.ok && j.error) throw Error(j.error);
      setImportReport(j);
      if (j.applied) await qc.invalidateQueries({ queryKey: ["admin-lists"] });
    } catch (e) {
      setError(e.message);
    } finally {
      setImporting(false);
    }
  };
  return (
    <main className="max-w-6xl mx-auto p-6 text-[#1B3828]">
      <h1 className="text-3xl mb-6">Curated lists</h1>
      <section className="border rounded-lg bg-white p-4 mb-6">
        <h2 className="font-semibold">Six client lists — 2026</h2>
        <button
          type="button"
          disabled={importing}
          onClick={() => importClientLists(false)}
          className="border rounded p-2 mt-3"
        >
          Validate import
        </button>
        {importReport ? (
          <>
            <p className="mt-3">
              {importReport.lists} lists · {importReport.entries} venue entries
              · {importReport.playable} playable memberships ·{" "}
              {importReport.additions?.length} new profiles
            </p>
            {importReport.errors?.map((e, i) => (
              <p key={i} className="text-red-700">
                {e.sourceId || e.entryKey}: {e.error}
              </p>
            ))}
            {importReport.applied ? (
              <p>Imported successfully.</p>
            ) : !importReport.errors?.length ? (
              <button
                type="button"
                disabled={importing}
                onClick={() => importClientLists(true)}
                className="bg-[#1B3828] text-white rounded p-3 mt-3"
              >
                Import six client lists
              </button>
            ) : null}
          </>
        ) : null}
      </section>
      <div className="grid md:grid-cols-[260px_1fr] gap-6">
        <aside>
          <button
            className="bg-[#1B3828] text-white rounded-lg p-3 mb-4 w-full"
            onClick={() => {
              setEditing(null);
              setForm(empty);
              setError("");
            }}
          >
            New list
          </button>
          {isLoading
            ? "Loading…"
            : isError
              ? "Unable to load lists."
              : data?.lists.map((l) => (
                  <button
                    key={l.id}
                    className="block bg-white rounded-lg p-4 mb-2 w-full text-left border"
                    onClick={() => {
                      setEditing(l.id);
                      setForm({
                        title: l.title,
                        description: l.description,
                        courseIds: l.course_ids,
                        isPublished: l.is_published,
                        displayOrder: l.display_order,
                      });
                      setError("");
                    }}
                  >
                    {l.title}
                    <small className="block mt-1">
                      {l.is_published ? "Published" : "Draft"} ·{" "}
                      {l.course_ids.length} courses
                    </small>
                  </button>
                ))}
        </aside>
        <form
          onSubmit={save}
          className="bg-white rounded-xl border p-6 space-y-5"
        >
          <label className="block">
            Title
            <input
              required
              maxLength={160}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className="block w-full border rounded p-3 mt-2"
            />
          </label>
          <label className="block">
            Description
            <textarea
              value={form.description}
              maxLength={20000}
              onChange={(e) => set("description", e.target.value)}
              className="block w-full border rounded p-3 mt-2"
              rows={5}
            />
          </label>
          <label className="block">
            Display order
            <input
              type="number"
              value={form.displayOrder}
              onChange={(e) => set("displayOrder", Number(e.target.value))}
              className="block border rounded p-3 mt-2"
            />
          </label>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => set("isPublished", e.target.checked)}
            />
            Published
          </label>
          <h2 className="font-semibold">Courses in display order</h2>
          {form.courseIds.map((id, index) => (
            <div
              key={id}
              className="flex gap-3 items-center border rounded p-2"
            >
              <span className="flex-1">
                {index + 1}.{" "}
                {results.find((c) => c.id === id)?.club_name ||
                  results.find((c) => c.id === id)?.name ||
                  `Course #${id}`}
              </span>
              <button
                type="button"
                disabled={index === 0}
                onClick={() => {
                  const ids = [...form.courseIds];
                  [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
                  set("courseIds", ids);
                }}
              >
                ↑
              </button>
              <button
                type="button"
                disabled={index === form.courseIds.length - 1}
                onClick={() => {
                  const ids = [...form.courseIds];
                  [ids[index + 1], ids[index]] = [ids[index], ids[index + 1]];
                  set("courseIds", ids);
                }}
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() =>
                  set(
                    "courseIds",
                    form.courseIds.filter((c) => c !== id),
                  )
                }
              >
                Remove
              </button>
            </div>
          ))}
          <label className="block">
            Find courses
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="block w-full border rounded p-3 mt-2"
              placeholder="Search club or course"
            />
          </label>
          <div className="max-h-64 overflow-auto">
            {results
              .filter((c) => !form.courseIds.includes(c.id))
              .map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => set("courseIds", [...form.courseIds, c.id])}
                  className="block w-full text-left border-b p-3"
                >
                  +{" "}
                  {[c.club_name, c.name]
                    .filter(Boolean)
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .join(", ")}{" "}
                  · {c.country}
                </button>
              ))}
          </div>
          <p role="status">{error}</p>
          <button
            disabled={saving}
            className="bg-[#1B3828] text-white rounded-lg px-6 py-3"
          >
            {saving ? "Saving…" : "Save list"}
          </button>
        </form>
      </div>
    </main>
  );
}
