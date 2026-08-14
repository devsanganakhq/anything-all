/**
 * Create Community screen
 */
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, Globe, Lock, Users } from "lucide-react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Colors, Spacing, Radius, Shadow } from "@/constants/theme";

const CATEGORIES = [
  "Golf Travel",
  "Top 100 Chasers",
  "Regional Golf",
  "Golf Societies",
  "Course Recommendations",
  "Golf Photography",
  "Golf Architecture",
  "Club Communities",
];

export default function CreateCommunityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [rules, setRules] = useState(["", "", ""]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const slug = name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      const r = await fetch("/api/communities/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug,
          description: description.trim(),
          category,
          communityType: isPrivate ? "private" : "public",
          rules: rules.filter((r) => r.trim()),
        }),
      });
      if (!r.ok) throw new Error("Failed to create community");
      return r.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["communities"] });
      if (data.communityId) {
        router.replace(`/communities/${data.communityId}`);
      } else {
        router.back();
      }
    },
    onError: () =>
      Alert.alert("Error", "Could not create community. Please try again."),
  });

  const handleCreate = () => {
    if (!name.trim() || name.trim().length < 3) {
      return Alert.alert(
        "Name required",
        "Community name must be at least 3 characters.",
      );
    }
    if (!category) {
      return Alert.alert(
        "Category required",
        "Please select a category for your community.",
      );
    }
    if (!description.trim() || description.trim().length < 20) {
      return Alert.alert(
        "Description required",
        "Please write a description of at least 20 characters.",
      );
    }
    createMutation.mutate();
  };

  const updateRule = (i, value) => {
    const updated = [...rules];
    updated[i] = value;
    setRules(updated);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.ivory }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 10,
          paddingHorizontal: Spacing.screenH,
          paddingBottom: 14,
          backgroundColor: Colors.white,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: Colors.greenLight,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ChevronLeft color={Colors.green} size={20} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            fontSize: 18,
            fontWeight: "300",
            fontStyle: "italic",
            color: Colors.textPrimary,
          }}
        >
          Create Community
        </Text>
        <TouchableOpacity
          onPress={handleCreate}
          disabled={createMutation.isPending}
          style={{
            backgroundColor: Colors.green,
            paddingHorizontal: 16,
            paddingVertical: 9,
            borderRadius: Radius.pill,
          }}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color={Colors.ivory} size="small" />
          ) : (
            <Text
              style={{
                fontSize: 10,
                fontWeight: "700",
                color: Colors.ivory,
                letterSpacing: 1.2,
              }}
            >
              CREATE
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: Spacing.screenH,
          paddingTop: 20,
          paddingBottom: insets.bottom + 40,
        }}
      >
        {/* Name */}
        <FieldLabel>COMMUNITY NAME</FieldLabel>
        <TextInput
          style={inputStyle}
          placeholder="e.g. Yorkshire Links Golfers"
          placeholderTextColor={Colors.textMuted}
          value={name}
          onChangeText={setName}
          maxLength={80}
        />
        <Text
          style={{
            fontSize: 11,
            color: Colors.textMuted,
            marginTop: 4,
            marginBottom: 16,
          }}
        >
          {name.length}/80 characters
        </Text>

        {/* Category */}
        <FieldLabel>CATEGORY</FieldLabel>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 20,
          }}
        >
          {CATEGORIES.map((cat) => {
            const active = category === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: Radius.pill,
                  backgroundColor: active ? Colors.green : Colors.white,
                  borderWidth: 1,
                  borderColor: active ? Colors.green : Colors.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: active ? Colors.ivory : Colors.textSecondary,
                  }}
                >
                  {cat.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Description */}
        <FieldLabel>DESCRIPTION</FieldLabel>
        <TextInput
          style={[inputStyle, { height: 100, textAlignVertical: "top" }]}
          placeholder="Describe what your community is about and who it's for."
          placeholderTextColor={Colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={500}
        />
        <Text
          style={{
            fontSize: 11,
            color: Colors.textMuted,
            marginTop: 4,
            marginBottom: 20,
          }}
        >
          {description.length}/500 characters
        </Text>

        {/* Privacy */}
        <View
          style={{
            backgroundColor: Colors.white,
            borderRadius: Radius.md,
            padding: 16,
            borderWidth: 1,
            borderColor: Colors.border,
            marginBottom: 20,
            flexDirection: "row",
            alignItems: "center",
            ...Shadow.card,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: isPrivate ? Colors.ivoryDeep : Colors.greenLight,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 12,
            }}
          >
            {isPrivate ? (
              <Lock color={Colors.textSecondary} size={18} strokeWidth={1.8} />
            ) : (
              <Globe color={Colors.green} size={18} strokeWidth={1.8} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: Colors.textPrimary,
              }}
            >
              {isPrivate ? "Private Community" : "Public Community"}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: Colors.textSecondary,
                marginTop: 2,
              }}
            >
              {isPrivate
                ? "Members must request access and be approved."
                : "Anyone can discover and join immediately."}
            </Text>
          </View>
          <Switch
            value={isPrivate}
            onValueChange={setIsPrivate}
            trackColor={{ false: Colors.border, true: Colors.green }}
            thumbColor={Colors.ivory}
          />
        </View>

        {/* Rules */}
        <FieldLabel>COMMUNITY RULES (optional)</FieldLabel>
        <Text
          style={{
            fontSize: 12,
            color: Colors.textSecondary,
            marginBottom: 10,
          }}
        >
          Add up to 4 rules to help keep your community focused and welcoming.
        </Text>
        {rules.map((rule, i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: Colors.green,
                justifyContent: "center",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <Text
                style={{ fontSize: 11, fontWeight: "700", color: Colors.ivory }}
              >
                {i + 1}
              </Text>
            </View>
            <TextInput
              style={[inputStyle, { flex: 1, marginBottom: 0 }]}
              placeholder={`Rule ${i + 1}`}
              placeholderTextColor={Colors.textMuted}
              value={rule}
              onChangeText={(v) => updateRule(i, v)}
              maxLength={120}
            />
          </View>
        ))}
        {rules.length < 4 && (
          <TouchableOpacity
            onPress={() => setRules([...rules, ""])}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginTop: 4,
              marginBottom: 20,
            }}
          >
            <Text
              style={{ fontSize: 12, fontWeight: "600", color: Colors.green }}
            >
              + Add another rule
            </Text>
          </TouchableOpacity>
        )}

        {/* Note */}
        <View
          style={{
            backgroundColor: Colors.greenLight,
            borderRadius: Radius.md,
            padding: 14,
            borderWidth: 1,
            borderColor: Colors.greenBorder,
            flexDirection: "row",
            gap: 10,
          }}
        >
          <Users
            color={Colors.green}
            size={16}
            strokeWidth={1.8}
            style={{ flexShrink: 0 }}
          />
          <Text
            style={{
              flex: 1,
              fontSize: 12,
              color: Colors.green,
              lineHeight: 18,
            }}
          >
            You will automatically become the owner of this community. Invite
            members and appoint moderators from the community settings.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function FieldLabel({ children }) {
  return (
    <Text
      style={{
        fontSize: 9,
        fontWeight: "700",
        letterSpacing: 1.5,
        color: Colors.textMuted,
        marginBottom: 8,
      }}
    >
      {children}
    </Text>
  );
}

const inputStyle = {
  backgroundColor: Colors.white,
  borderRadius: Radius.md,
  paddingHorizontal: 12,
  paddingVertical: 11,
  fontSize: 14,
  color: Colors.textPrimary,
  borderWidth: 1,
  borderColor: Colors.border,
  marginBottom: 0,
};
