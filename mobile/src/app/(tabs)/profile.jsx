import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Settings,
  Edit2,
  Share2,
  Shield,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  Users,
  MapPin,
  Award,
  BookOpen,
  Trophy,
  CheckCircle,
} from "lucide-react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";
import { Colors, Spacing, Radius, Shadow } from "@/constants/theme";
import { HomeClubIcon, MemberClubIcon } from "@/components/ClubIcons";
import { UserAvatar } from "@/components/UserAvatar";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();
  const [isPublic, setIsPublic] = React.useState(true);

  const {
    data: profileData,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const response = await fetch("/api/user/profile");
      if (!response.ok) throw new Error("Failed to fetch profile");
      return response.json();
    },
  });

  const profile = profileData?.profile ?? null;

  // Memberships returned alongside profile
  const memberships = profileData?.memberships ?? [];
  const homeClub = memberships.find((m) => m.membership_type === "home");
  const additionals = memberships
    .filter((m) => m.membership_type === "additional")
    .sort((a, b) => a.display_order - b.display_order);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.ivory,
          alignItems: "center",
          justifyContent: "center",
          paddingTop: insets.top,
        }}
      >
        <ActivityIndicator size="large" color={Colors.green} />
        <Text style={{ marginTop: 14, fontSize: 13, color: Colors.textMuted }}>
          Loading profile…
        </Text>
      </View>
    );
  }

  if (isError || !profile) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.ivory,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
          paddingTop: insets.top,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: Colors.textPrimary,
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Couldn't load your profile
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: Colors.textSecondary,
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          Sign in again or retry. Your account data lives on the server.
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
          disabled={isRefetching}
          style={{
            backgroundColor: Colors.green,
            paddingHorizontal: 28,
            paddingVertical: 13,
            borderRadius: Radius.pill,
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: "800",
              letterSpacing: 1.5,
              color: Colors.ivory,
            }}
          >
            {isRefetching ? "RETRYING…" : "TRY AGAIN"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            signOut();
          }}
        >
          <Text style={{ fontSize: 13, color: Colors.textSecondary }}>
            Sign out
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.ivory }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 100,
        }}
      >
        {/* Header */}
        <View
          style={{
            paddingHorizontal: Spacing.screenH,
            paddingTop: 16,
            paddingBottom: 20,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: "700",
              letterSpacing: 2,
              color: Colors.textSecondary,
            }}
          >
            PROFILE
          </Text>
          <TouchableOpacity>
            <Settings
              color={Colors.textSecondary}
              size={19}
              strokeWidth={1.6}
            />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View
          style={{
            alignItems: "center",
            paddingHorizontal: Spacing.screenH,
            marginBottom: 28,
          }}
        >
          {/* Avatar */}
          <View style={{ position: "relative", marginBottom: 14 }}>
            <UserAvatar
              uri={profile.profile_photo_url}
              name={
                [profile.first_name, profile.last_name]
                  .filter(Boolean)
                  .join(" ") ||
                profile.name ||
                "Golfer"
              }
              size={90}
              borderWidth={2}
              borderColor={Colors.border}
            />
            <TouchableOpacity
              onPress={() => router.push("/profile/edit")}
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: Colors.green,
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 2,
                borderColor: Colors.ivory,
              }}
            >
              <Edit2 color={Colors.ivory} size={12} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Name */}
          <Text
            style={{
              fontSize: 22,
              fontWeight: "300",
              fontStyle: "italic",
              color: Colors.textPrimary,
            }}
          >
            {profile.name?.trim() ||
              [profile.first_name, profile.last_name]
                .filter(Boolean)
                .join(" ") ||
              "Golfer"}
          </Text>
          {profile.location && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                marginTop: 5,
              }}
            >
              <MapPin
                color={Colors.textSecondary}
                size={12}
                strokeWidth={1.8}
              />
              <Text style={{ fontSize: 13, color: Colors.textSecondary }}>
                {profile.location}
              </Text>
            </View>
          )}

          {/* Handicap */}
          {profile.handicap != null && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginTop: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: Colors.textMuted,
                  fontWeight: "600",
                  letterSpacing: 0.8,
                }}
              >
                HANDICAP
              </Text>
              <Text
                style={{ fontSize: 16, color: Colors.green, fontWeight: "700" }}
              >
                {profile.handicap}
              </Text>
            </View>
          )}

          {/* ── Club Memberships ─────────────────────────────────────────── */}
          {(homeClub || additionals.length > 0) && (
            <View style={{ width: "100%", marginTop: 14, gap: 8 }}>
              {/* Home club */}
              {homeClub && (
                <TouchableOpacity
                  onPress={() =>
                    homeClub.course_id &&
                    router.push(`/course/${homeClub.course_id}`)
                  }
                  activeOpacity={homeClub.course_id ? 0.75 : 1}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 9,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: Radius.md,
                    borderWidth: 1,
                    borderColor: Colors.greenBorder,
                    backgroundColor: Colors.greenLight,
                  }}
                >
                  <HomeClubIcon size={18} color={Colors.green} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: Colors.green,
                      }}
                      numberOfLines={1}
                    >
                      {homeClub.club_name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        color: Colors.textSecondary,
                        marginTop: 1,
                      }}
                    >
                      Home Club
                      {homeClub.joined_year
                        ? ` · since ${homeClub.joined_year}`
                        : ""}
                      {homeClub.verified_status ? " · Verified" : ""}
                    </Text>
                  </View>
                  {homeClub.verified_status && (
                    <CheckCircle
                      size={13}
                      color={Colors.green}
                      strokeWidth={2}
                    />
                  )}
                </TouchableOpacity>
              )}

              {/* Additional clubs */}
              {additionals.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() =>
                    m.course_id && router.push(`/course/${m.course_id}`)
                  }
                  activeOpacity={m.course_id ? 0.75 : 1}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 9,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: Radius.md,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    backgroundColor: Colors.white,
                  }}
                >
                  <MemberClubIcon size={18} color={Colors.textSecondary} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: Colors.textPrimary,
                      }}
                      numberOfLines={1}
                    >
                      {m.club_name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        color: Colors.textMuted,
                        marginTop: 1,
                      }}
                    >
                      Member Club
                      {m.joined_year ? ` · since ${m.joined_year}` : ""}
                    </Text>
                  </View>
                  {m.verified_status && (
                    <CheckCircle
                      size={13}
                      color={Colors.green}
                      strokeWidth={2}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Bio */}
          {profile.bio && (
            <Text
              style={{
                marginTop: 14,
                paddingHorizontal: 4,
                fontSize: 14,
                color: Colors.textSecondary,
                textAlign: "center",
                lineHeight: 21,
              }}
            >
              {profile.bio}
            </Text>
          )}

          {/* Share Button */}
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                "Coming Soon",
                "Shareable Passport cards are on the roadmap — stay tuned.",
              )
            }
            style={{
              marginTop: 18,
              paddingHorizontal: 20,
              paddingVertical: 9,
              borderRadius: Radius.pill,
              borderWidth: 1,
              borderColor: Colors.border,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Share2 color={Colors.green} size={14} strokeWidth={1.8} />
            <Text
              style={{
                fontSize: 10,
                fontWeight: "700",
                letterSpacing: 1,
                color: Colors.green,
              }}
            >
              SHARE PASSPORT
            </Text>
          </TouchableOpacity>
        </View>

        {/* Passport & Communities Quick Links */}
        <View style={{ paddingHorizontal: Spacing.screenH, marginBottom: 22 }}>
          <Text
            style={{
              fontSize: 9,
              fontWeight: "700",
              letterSpacing: 1.5,
              color: Colors.textSecondary,
              marginBottom: 10,
            }}
          >
            MY GOLF
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/passport")}
              style={{
                flex: 1,
                backgroundColor: Colors.white,
                borderRadius: Radius.md,
                padding: 16,
                alignItems: "center",
                borderWidth: 1,
                borderColor: Colors.border,
                ...Shadow.card,
              }}
            >
              <BookOpen color={Colors.green} size={22} strokeWidth={1.6} />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: Colors.green,
                  marginTop: 8,
                  letterSpacing: 0.5,
                }}
              >
                PASSPORT
              </Text>
              <Text
                style={{
                  fontSize: 9,
                  color: Colors.textMuted,
                  marginTop: 2,
                  textAlign: "center",
                }}
              >
                Stats & Leaderboard
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/communities")}
              style={{
                flex: 1,
                backgroundColor: Colors.white,
                borderRadius: Radius.md,
                padding: 16,
                alignItems: "center",
                borderWidth: 1,
                borderColor: Colors.border,
                ...Shadow.card,
              }}
            >
              <Users color={Colors.green} size={22} strokeWidth={1.6} />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: Colors.green,
                  marginTop: 8,
                  letterSpacing: 0.5,
                }}
              >
                COMMUNITIES
              </Text>
              <Text
                style={{
                  fontSize: 9,
                  color: Colors.textMuted,
                  marginTop: 2,
                  textAlign: "center",
                }}
              >
                Groups & chat
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Privacy toggle */}
        <View
          style={{
            marginHorizontal: Spacing.screenH,
            backgroundColor: Colors.white,
            borderRadius: Radius.md,
            padding: 16,
            borderWidth: 1,
            borderColor: Colors.border,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 22,
            ...Shadow.card,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: Colors.textPrimary,
              }}
            >
              Public Profile
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: Colors.textSecondary,
                marginTop: 2,
              }}
            >
              Allow other golfers to view your Passport.
            </Text>
          </View>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ false: Colors.border, true: Colors.green }}
            thumbColor={Colors.ivory}
          />
        </View>

        {/* Account Settings */}
        <View style={{ paddingHorizontal: Spacing.screenH }}>
          <Text
            style={{
              fontSize: 9,
              fontWeight: "700",
              letterSpacing: 1.5,
              color: Colors.textSecondary,
              marginBottom: 10,
            }}
          >
            ACCOUNT SETTINGS
          </Text>
          <View
            style={{
              backgroundColor: Colors.white,
              borderRadius: Radius.md,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: Colors.border,
              ...Shadow.card,
              marginBottom: 20,
            }}
          >
            <MenuItem
              icon={Edit2}
              title="Edit Profile"
              onPress={() => router.push("/profile/edit")}
            />
            <MenuItem
              icon={HomeClubIcon}
              title="Club Memberships"
              subtitle={
                homeClub
                  ? `${homeClub.club_name}${additionals.length > 0 ? ` + ${additionals.length} more` : ""}`
                  : "Add your clubs"
              }
              onPress={() => router.push("/profile/edit-memberships")}
              isCustomIcon
            />
            <MenuItem
              icon={Shield}
              title="Privacy & Security"
              onPress={() => router.push("/profile/privacy")}
            />
            <MenuItem
              icon={Bell}
              title="Notifications"
              onPress={() => router.push("/notifications")}
            />
            <MenuItem
              icon={HelpCircle}
              title="Support & Help"
              onPress={() =>
                Alert.alert(
                  "Support & Help",
                  "For help, email us at Cameron@heathlandlinks.com or visit our website.",
                  [{ text: "OK" }],
                )
              }
            />
            <MenuItem
              icon={LogOut}
              title="Sign Out"
              titleColor={Colors.error}
              onPress={() => signOut()}
            />
          </View>
        </View>

        <View style={{ alignItems: "center", paddingBottom: 16 }}>
          <Text style={{ fontSize: 11, color: Colors.textMuted }}>
            Heathland Links · v1.0.0
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: Colors.textMuted,
              marginTop: 6,
            }}
          >
            Crafted with 💚@
            <Text
              style={{ fontWeight: "700", color: Colors.textPrimary }}
              onPress={() => Linking.openURL("https://www.sanganakhq.com/")}
            >
              SanganakHQ
            </Text>
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function MenuItem({
  icon: Icon,
  title,
  subtitle,
  titleColor,
  onPress,
  isCustomIcon,
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
      }}
    >
      {isCustomIcon ? (
        <Icon size={18} color={titleColor || Colors.textSecondary} />
      ) : (
        <Icon
          color={titleColor || Colors.textSecondary}
          size={18}
          strokeWidth={1.6}
        />
      )}
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text
          style={{
            fontSize: 15,
            color: titleColor || Colors.textPrimary,
            fontWeight: "500",
          }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={{ fontSize: 12, color: Colors.textSecondary, marginTop: 1 }}
          >
            {subtitle}
          </Text>
        )}
      </View>
      <ChevronRight color={Colors.textMuted} size={15} strokeWidth={1.8} />
    </TouchableOpacity>
  );
}

function QuickStat({ label, value }) {
  return (
    <View style={{ flex: 1, alignItems: "center", paddingVertical: 14 }}>
      <Text style={{ fontSize: 18, fontWeight: "700", color: Colors.green }}>
        {value}
      </Text>
      <Text
        style={{
          fontSize: 8,
          fontWeight: "700",
          letterSpacing: 1,
          color: Colors.textSecondary,
          marginTop: 3,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
