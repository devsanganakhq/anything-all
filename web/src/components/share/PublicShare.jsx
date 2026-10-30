"use client";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
export default function PublicShare({ kind }) {
  const params = useParams(),
    id = params.id || params.postId;
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    const c = new AbortController();
    setData(null);
    setError("");
    fetch(`/api/${kind === "course" ? "courses" : kind}/${id}`, {
      signal: c.signal,
    })
      .then(async (r) => {
        if (!r.ok)
          throw Error(
            r.status === 401
              ? "Sign in to view this post."
              : "This page is unavailable or private.",
          );
        return r.json();
      })
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => c.abort();
  }, [id, kind]);
  const item = data?.course || data?.post || data?.list;
  const title =
    kind === "course"
      ? [item?.club_name, item?.name]
          .filter(Boolean)
          .filter((v, i, a) => a.indexOf(v) === i)
          .join(", ")
      : kind === "lists"
        ? item?.title
        : item?.author_name
          ? "A post from " + item.author_name
          : "Heathland Links";
  return (
    <main className="min-h-screen bg-[#F5F1EB] p-6 flex items-center justify-center">
      <article className="max-w-xl w-full bg-white rounded-2xl border p-8 text-[#1B3828]">
        <p className="text-xs tracking-widest mb-5">HEATHLAND LINKS</p>
        <h1 className="text-3xl mb-4">{title || "Heathland Links"}</h1>
        {error ? (
          <p role="status" className="mb-5">
            {error}
          </p>
        ) : !item ? (
          <p>Loading…</p>
        ) : (
          <>
            {kind === "course" && (
              <p className="mb-5">
                {[item.county, item.country].filter(Boolean).join(", ")}
              </p>
            )}
            <p className="whitespace-pre-wrap mb-6">
              {item.caption || item.description || ""}
            </p>
          </>
        )}
        <a
          href={`heathlandlinks://${kind}/${id}`}
          className="inline-block rounded-lg bg-[#1B3828] text-white px-6 py-3"
        >
          Open in Heathland Links
        </a>
        <a
          href={`/account/signin?callbackUrl=${encodeURIComponent(`/${kind}/${id}`)}`}
          className="block mt-5 underline text-sm"
        >
          Sign in
        </a>
      </article>
    </main>
  );
}
