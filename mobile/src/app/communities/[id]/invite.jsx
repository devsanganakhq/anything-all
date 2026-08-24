/**
 * Invite members to a private community — search golfers and send invites
 */
import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, Search, UserPlus, Award, MapPin } from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Colors, Spacing, Radius, Shadow } from "@/constants/theme";
import { UserAvatar } from "@/components/UserAvatar";
import { useOpenUserProfile } from "@/utils/openUserProfile";

export default function CommunityInviteScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const openUserProfile = useOpenUserProfile();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams();
  const commId = parseInt(Array.isArray(id) ? id[0] : id, 10);

  const [query, setQuery] = useState("");
  const debounceRef = useRef(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const handleSearch = (text) => {
    setQuery(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(text), 350);
  };

  const { data: invitesData } = useQuery({
    queryKey: ["community-invites", commId],
    queryFn: async () => {
      const r = await fetch(`/api/communities/${commId}/invites`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const invitedUserIds = useMemo(
    () => new Set((invitesData?.invites ?? []).map((i) => i.user_id)),
    [invitesData],
  );

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["social", "search", "invite", commId, debouncedQuery],
    queryFn: async () => {
      const r = await fetch(
        `/api/social/search?q=${encodeURIComponent(debouncedQuery)}&limit=30`,
      );
      if (!r.ok) throw new Error("Search failed");
      return r.json();
    },
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 30_000,
  });

  const users = data?.users ?? [];

  const inviteMutation = useMutation({
    mutationFn: async (userId) => {
      const r = await fetch(`/api/communities/${commId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "Failed to send invite");
      }
      return r.json();
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["community-invites", commId] });
      if (result.action !== "already_invited") {
        Alert.alert("Invite sent", "They will be notified to join your community.");
      }
    },
    onError: (err) => Alert.alert("Could not invite", err.message),
  });

  const renderUser = useCallback(
    ({ item: u }) => {
      const alreadyInvited = invitedUserIds.has(u.id);
      const isPending =
        inviteMutation.isPending && inviteMutation.variables === u.id;

      return (
        <TouchableOpacity
          onPress={() => openUserProfile(u.id)}
          style={{
            backgroundColor: Colors.white,
            borderRadius: Radius.lg,
            padding: 14,
            marginBottom: 10,
            borderWidth: 1,
            borderColor: Colors.border,
            ...Shadow.card,
          }}
          activeOpacity={0.85}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <UserAvatar uri={u.avatar} name={u.name} size={52} />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: Colors.textPrimary,
                }}
              >
                {u.name}
              </Text>
              {u.home_club ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    marginTop: 3,
                  }}
                >
                  <Award color={Colors.textMuted} size={11} strokeWidth={1.8} />
                  <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
                    {u.home_club}
                  </Text>
                </View>
              ) : null}
              {u.location ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    marginTop: 2,
                  }}
                >
                  <MapPin color={Colors.textMuted} size={11} strokeWidth={1.8} />
                  <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
                    {u.location}
                  </Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation?.();
                if (!alreadyInvited) inviteMutation.mutate(u.id);
              }}
              disabled={alreadyInvited || inviteMutation.isPending}
              style={{
                backgroundColor: alreadyInvited ? Colors.ivoryDeep : Colors.green,
                borderRadius: Radius.pill,
                paddingHorizontal: 14,
                paddingVertical: 8,
                minWidth: 72,
                alignItems: "center",
                borderWidth: alreadyInvited ? 1 : 0,
                borderColor: Colors.border,
              }}
            >
              {isPending ? (
                <ActivityIndicator size="small" color={Colors.ivory} />
              ) : (
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: "700",
                    letterSpacing: 0.8,
                    color: alreadyInvited ? Colors.textMuted : Colors.ivory,
                  }}
                >
                  {alreadyInvited ? "INVITED" : "INVITE"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    },
    [invitedUserIds, inviteMutation, openUserProfile],
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.ivory }}>
      <View
        style={{
          paddingTop: insets.top + 10,
          paddingHorizontal: Spacing.screenH,
          paddingBottom: 14,
          backgroundColor: Colors.white,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: Colors.ivoryDeep,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <ChevronLeft color={Colors.textPrimary} size={20} strokeWidth={1.8} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: Colors.textPrimary,
              }}
            >
              Invite members
            </Text>
            <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 2 }}>
              Search golfers to invite to your private community
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: Colors.ivoryDeep,
            borderRadius: Radius.lg,
            paddingHorizontal: 12,
            marginTop: 14,
            borderWidth: 1,
            borderColor: Colors.border,
          }}
        >
          <Search color={Colors.textMuted} size={16} strokeWidth={1.8} />
          <TextInput
            style={{
              flex: 1,
              paddingVertical: 12,
              paddingHorizontal: 10,
              fontSize: 15,
              color: Colors.textPrimary,
            }}
            placeholder="Search by name or home club..."
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      {debouncedQuery.trim().length < 2 ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: Spacing.screenH,
          }}
        >
          <UserPlus color={Colors.textMuted} size={36} strokeWidth={1.5} />
          <Text
            style={{
              fontSize: 14,
              color: Colors.textSecondary,
              textAlign: "center",
              marginTop: 12,
              lineHeight: 21,
            }}
          >
            Type at least 2 characters to search for golfers to invite.
          </Text>
        </View>
      ) : isLoading || isFetching ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={Colors.green} />
        </View>
      ) : isError ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: Spacing.screenH,
          }}
        >
          <Text style={{ color: Colors.textSecondary, marginBottom: 12 }}>
            Search failed. Try again.
          </Text>
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={{ color: Colors.green, fontWeight: "700" }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderUser}
          contentContainerStyle={{
            padding: Spacing.screenH,
            paddingBottom: insets.bottom + 24,
          }}
          ListEmptyComponent={
            <Text
              style={{
                textAlign: "center",
                color: Colors.textMuted,
                marginTop: 40,
                fontSize: 14,
              }}
            >
              No golfers found for "{debouncedQuery}"
            </Text>
          }
        />
      )}
    </View>
  );
}
