"use client";
import { useState } from "react";

export default function EditCourseDescription() {
  const [id, setId] = useState("");
  const [course, setCourse] = useState(null);
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load(event) {
    event.preventDefault();
    setBusy(true); setMessage(""); setCourse(null);
    try {
      const response = await fetch(`/api/admin/courses/${Number(id)}/description`);
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Course unavailable");
      setCourse(result.course); setDescription(result.course.description || "");
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/courses/${course.id}/description`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Unable to save");
      setCourse(result.course); setMessage("Description saved and recorded in the admin audit log.");
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-[#F6F4EF] p-6 text-[#1B2E1E]">
    <div className="mx-auto max-w-2xl">
      <a href="/admin" className="text-sm font-semibold text-[#245C3C]">← Admin dashboard</a>
      <h1 className="mt-6 text-3xl font-bold">Course descriptions</h1>
      <p className="mt-2 text-sm text-gray-600">Edit only facts confirmed by the club or a reliable course source.</p>
      <form onSubmit={load} className="mt-8 flex gap-3">
        <label className="flex-1 text-sm">Course ID
          <input className="mt-1 w-full rounded border p-3" type="number" min="1" required value={id}
            onChange={event => setId(event.target.value)} />
        </label>
        <button disabled={busy} className="self-end rounded bg-[#1B4D35] px-5 py-3 text-white disabled:opacity-50">Load</button>
      </form>
      {course && <form onSubmit={save} className="mt-8 rounded-xl border bg-white p-5">
        <h2 className="font-semibold">{course.club_name ? `${course.club_name} — ` : ""}{course.name}</h2>
        <p className="text-sm text-gray-500">{course.country}</p>
        <label className="mt-5 block text-sm">Verified description
          <textarea className="mt-2 min-h-40 w-full rounded border p-3" maxLength={5000} minLength={20}
            required value={description} onChange={event => setDescription(event.target.value)} />
        </label>
        <button disabled={busy} className="mt-4 rounded bg-[#1B4D35] px-5 py-3 text-white disabled:opacity-50">Save description</button>
      </form>}
      {message && <p role="status" className="mt-4 text-sm">{message}</p>}
    </div>
  </main>;
}
