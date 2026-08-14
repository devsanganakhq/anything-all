import { PAGE_SIZE } from "./constants";

export async function fetchFeedPage({ pageParam = 1, filter }) {
  const res = await fetch(
    `/api/feed?filter=${filter}&page=${pageParam}&limit=${PAGE_SIZE}`,
  );
  if (!res.ok) throw new Error("Failed to fetch feed");
  return res.json();
}
