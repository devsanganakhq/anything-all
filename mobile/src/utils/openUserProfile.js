import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";

function toUserId(value) {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function useCurrentUserId() {
  const { data } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const r = await fetch("/api/user/profile");
      if (!r.ok) throw new Error("Profile failed");
      return r.json();
    },
    staleTime: 300_000,
  });
  return toUserId(data?.profile?.id);
}

export function useIsSelfUser(userId) {
  const myId = useCurrentUserId();
  const id = toUserId(userId);
  return myId != null && id != null && myId === id;
}

export function useOpenUserProfile() {
  const router = useRouter();
  const myId = useCurrentUserId();

  return useCallback(
    (userId) => {
      const id = toUserId(userId);
      if (!id) return false;
      if (myId != null && myId === id) return false;
      router.push(`/social/${id}`);
      return true;
    },
    [router, myId],
  );
}
