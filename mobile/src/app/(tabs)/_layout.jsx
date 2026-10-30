import { Tabs } from "expo-router";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import { Home, Compass, BookOpen, Users, User } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, TabBar } from "@/constants/theme";

const {
  height: BAR_HEIGHT,
  radius: BAR_RADIUS,
  inset: BAR_INSET,
  lift: BAR_LIFT,
} = TabBar;

function TabBarBackground() {
  return <View style={styles.background} pointerEvents="none" />;
}

function TabIcon({ Icon, color, focused }) {
  return <Icon color={color} size={22} strokeWidth={focused ? 2.2 : 1.7} />;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const barHeight = BAR_HEIGHT + Math.max(0, fontScale - 1) * 24;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarBackground: TabBarBackground,
        tabBarHideOnKeyboard: Platform.OS === "android",
        tabBarStyle: {
          position: "absolute",
          // `start`/`end` win over `left`/`right` in Yoga, and the base tab bar
          // style pins them to 0 — set all four so the bar actually insets.
          start: BAR_INSET,
          end: BAR_INSET,
          left: BAR_INSET,
          right: BAR_INSET,
          bottom: Math.max(insets.bottom, 8) + BAR_LIFT,
          height: barHeight,
          borderRadius: BAR_RADIUS,
          borderTopWidth: 0,
          backgroundColor: "transparent",
          paddingTop: 9,
          paddingBottom: 9,
          elevation: 0,
        },
        tabBarActiveTintColor: Colors.green,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarItemStyle: {
          paddingHorizontal: 0,
        },
        tabBarLabelPosition: "below-icon",
        tabBarAllowFontScaling: true,
        tabBarLabelStyle: {
          fontSize: 9.5,
          fontWeight: "600",
          letterSpacing: 0,
          marginTop: 3,
          marginBottom: 0,
        },
      }}
    >
      {/* ── Visible tabs ── */}
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: (props) => <TabIcon Icon={Home} {...props} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: (props) => <TabIcon Icon={Compass} {...props} />,
        }}
      />
      <Tabs.Screen
        name="passport"
        options={{
          title: "Passport",
          tabBarIcon: (props) => <TabIcon Icon={BookOpen} {...props} />,
        }}
      />
      <Tabs.Screen
        name="communities"
        options={{
          title: "Communities",
          tabBarIcon: (props) => <TabIcon Icon={Users} {...props} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: (props) => <TabIcon Icon={User} {...props} />,
        }}
      />

      {/* ── Hidden — accessible by push/router but not in tab bar ── */}
      <Tabs.Screen name="discover" options={{ href: null }} />
      <Tabs.Screen name="community" options={{ href: null }} />
      <Tabs.Screen name="deals" options={{ href: null }} />
      <Tabs.Screen name="leaderboard" options={{ href: null }} />
      <Tabs.Screen name="activity" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: BAR_RADIUS,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 12,
  },
});
