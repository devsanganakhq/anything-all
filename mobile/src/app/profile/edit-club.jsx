import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, Search, Award } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function EditClubScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClub, setSelectedClub] = useState(null);
  const [memberSince, setMemberSince] = useState("");

  const updateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeClubId: selectedClub?.id,
          homeClubName: selectedClub?.name,
          memberSince: memberSince ? parseInt(memberSince) : null,
        }),
      });
      if (!response.ok) throw new Error("Failed to update");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["user-profile"]);
      router.back();
    },
  });

  // Sample clubs - in production, this would fetch from API
  const clubs = [
    { id: 1, name: "St Andrews Links" },
    { id: 2, name: "Royal County Down" },
    { id: 3, name: "Muirfield" },
    { id: 4, name: "Royal Birkdale" },
    { id: 5, name: "Turnberry" },
    { id: 6, name: "Royal Portrush" },
    { id: 7, name: "Carnoustie" },
    { id: 8, name: "Royal Dornoch" },
  ].filter((club) =>
    club.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F2EA" }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 10,
          paddingHorizontal: 20,
          paddingBottom: 15,
          backgroundColor: "#F5F2EA",
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#FFFFFF",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <ChevronLeft color="#1A3C34" size={24} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#1A3C34" }}>
            Home Club
          </Text>
          <TouchableOpacity
            onPress={() => updateMutation.mutate()}
            disabled={!selectedClub}
          >
            <Text
              style={{
                fontSize: 16,
                color: selectedClub ? "#1A3C34" : "#8E918B",
                fontWeight: "700",
              }}
            >
              Save
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: insets.bottom + 100,
        }}
      >
        {/* Search */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            paddingHorizontal: 15,
            paddingVertical: 12,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            marginBottom: 20,
          }}
        >
          <Search color="#8E918B" size={20} />
          <TextInput
            style={{
              flex: 1,
              marginLeft: 10,
              fontSize: 16,
              color: "#1A3C34",
            }}
            placeholder="Search for your club..."
            placeholderTextColor="#8E918B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Member Since */}
        {selectedClub && (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: 20,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 14, color: "#8E918B", marginBottom: 10 }}>
              Member Since (Year)
            </Text>
            <TextInput
              style={{
                fontSize: 16,
                color: "#1A3C34",
                borderBottomWidth: 1,
                borderBottomColor: "#E5E7EB",
                paddingVertical: 8,
              }}
              placeholder="e.g., 2015"
              placeholderTextColor="#8E918B"
              keyboardType="number-pad"
              value={memberSince}
              onChangeText={setMemberSince}
              maxLength={4}
            />
          </View>
        )}

        {/* Club List */}
        <View style={{ gap: 12 }}>
          {clubs.map((club) => (
            <TouchableOpacity
              key={club.id}
              onPress={() => setSelectedClub(club)}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                padding: 18,
                borderWidth: 2,
                borderColor:
                  selectedClub?.id === club.id ? "#1A3C34" : "#E5E7EB",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 15 }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor:
                      selectedClub?.id === club.id
                        ? "rgba(26, 60, 52, 0.1)"
                        : "#F5F2EA",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Award
                    color={selectedClub?.id === club.id ? "#1A3C34" : "#8E918B"}
                    size={20}
                  />
                </View>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: selectedClub?.id === club.id ? "700" : "500",
                    color: "#1A3C34",
                  }}
                >
                  {club.name}
                </Text>
              </View>
              {selectedClub?.id === club.id && (
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: "#1A3C34",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#F5F2EA", fontSize: 16 }}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {clubs.length === 0 && (
          <View
            style={{
              padding: 40,
              alignItems: "center",
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            <Text
              style={{
                fontSize: 16,
                color: "#8E918B",
                textAlign: "center",
              }}
            >
              No clubs found. Try a different search.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
