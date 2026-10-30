const configured =
  process.env.EXPO_PUBLIC_BASE_URL || "https://anything-all.vercel.app";
export function shareLink(kind, id) {
  const base = new URL(configured).origin;
  if (!["course", "feed", "lists"].includes(kind) || !/^\d+$/.test(String(id)))
    throw Error("Invalid share link");
  return `${base}/${kind}/${id}`;
}
