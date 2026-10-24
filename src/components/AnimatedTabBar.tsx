import React, { useEffect, useState } from "react";
import {
  Keyboard,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  House,
  Package,
  ScanLine,
  ChartNoAxesCombined,
  Settings2,
} from "lucide-react-native";
import { C, R, shadow } from "../theme";
import { ease, easeInOut } from "../motion";

const ICONS: Record<
  string,
  React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>
> = {
  index: House,
  inventory: Package,
  checkout: ScanLine,
  sales: ChartNoAxesCombined,
  settings: Settings2,
};
const BAR_H = 66;
const FAB = 58;
const HEADROOM = 26; // space above the bar that the raised centre button occupies

/** A single slot: icon + label cross-fade between muted and primary, lift and scale when focused.
 *  The centre slot only renders its label — the raised button is <CenterButton/>, a sibling that sits inside the
 *  wrapper's bounds so it is tappable on Android as well as iOS. */
function TabItem({
  name,
  label,
  focused,
  onPress,
  onLongPress,
  center,
}: {
  name: string;
  label: string;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  center: boolean;
}) {
  const Icon = ICONS[name] ?? House;
  const p = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    p.value = withTiming(focused ? 1 : 0, { duration: 240, easing: ease });
  }, [focused]);
  const press = useSharedValue(1);

  const lift = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(p.value, [0, 1], [0, -1.5]) },
      { scale: press.value },
    ],
  }));
  const activeIcon = useAnimatedStyle(() => ({ opacity: p.value }));
  const idleIcon = useAnimatedStyle(() => ({ opacity: 1 - p.value }));
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(p.value, [0, 1], [C.muted, C.primary]),
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        press.value = withTiming(0.94, { duration: 90, easing: ease });
      }}
      onPressOut={() => {
        press.value = withTiming(1, { duration: 160, easing: ease });
      }}
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: center ? "flex-end" : "center",
        height: BAR_H,
        paddingBottom: center ? 9 : 0,
      }}
    >
      {center ? null : (
        <Animated.View
          style={[
            {
              width: 26,
              height: 26,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 4,
            },
            lift,
          ]}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { alignItems: "center", justifyContent: "center" },
              idleIcon,
            ]}
          >
            <Icon size={22} color={C.muted} strokeWidth={2} />
          </Animated.View>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { alignItems: "center", justifyContent: "center" },
              activeIcon,
            ]}
          >
            <Icon size={22} color={C.primary} strokeWidth={2.3} />
          </Animated.View>
        </Animated.View>
      )}
      <Animated.Text
        numberOfLines={1}
        style={[{ fontSize: 10.5, fontWeight: "700" }, labelStyle]}
      >
        {label}
      </Animated.Text>
    </Pressable>
  );
}

/** Raised centre action (checkout / scan). Springs up when focused, squeezes on touch. */
function CenterButton({
  name,
  label,
  focused,
  left,
  onPress,
  onLongPress,
}: {
  name: string;
  label: string;
  focused: boolean;
  left: number;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const Icon = ICONS[name] ?? ScanLine;
  const p = useSharedValue(focused ? 1 : 0);
  const press = useSharedValue(1);
  useEffect(() => {
    p.value = withTiming(focused ? 1 : 0, { duration: 240, easing: ease });
  }, [focused]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(p.value, [0, 1], [0, -2]) },
      { scale: press.value },
    ],
  }));
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        press.value = withTiming(0.94, { duration: 90, easing: ease });
      }}
      onPressOut={() => {
        press.value = withTiming(1, { duration: 160, easing: ease });
      }}
      style={{ position: "absolute", top: 0, left, width: FAB, height: FAB }}
    >
      <Animated.View
        style={[
          {
            width: FAB,
            height: FAB,
            borderRadius: FAB / 2,
            backgroundColor: C.primary,
            borderWidth: 5,
            borderColor: C.surface,
            alignItems: "center",
            justifyContent: "center",
            ...shadow.md,
            shadowColor: C.primary,
          },
          style,
        ]}
      >
        <Icon size={25} color="#fff" strokeWidth={2.3} />
      </Animated.View>
    </Pressable>
  );
}

export function AnimatedTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const count = state.routes.length;
  const slot = width / count;

  // Sliding pill behind the active tab (Framer "layoutId" style shared indicator).
  const x = useSharedValue(0);
  const visible = useSharedValue(1);
  const ready = React.useRef(false);
  const activeName = state.routes[state.index]?.name;
  const centerActive = activeName === "checkout";

  useEffect(() => {
    if (!slot) return;
    const target = state.index * slot;
    if (!ready.current) {
      x.value = target;
      ready.current = true;
    } else x.value = withTiming(target, { duration: 280, easing: easeInOut });
  }, [state.index, slot]);
  useEffect(() => {
    visible.value = withTiming(centerActive ? 0 : 1, { duration: 180 });
  }, [centerActive]);

  const pill = useAnimatedStyle(() => ({
    opacity: visible.value,
    transform: [
      { translateX: x.value + 6 },
      { scaleX: interpolate(visible.value, [0, 1], [0.6, 1]) },
    ],
  }));

  // Slide the bar away while the keyboard is open so it never covers inputs.
  const hide = useSharedValue(0);
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        hide.value = withTiming(1, { duration: 200 });
      },
    );
    const off = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        hide.value = withTiming(0, { duration: 200 });
      },
    );
    return () => {
      show.remove();
      off.remove();
    };
  }, []);
  const wrap = useAnimatedStyle(() => ({
    opacity: 1 - hide.value,
    transform: [
      { translateY: hide.value * (BAR_H + HEADROOM + insets.bottom + 40) },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: Math.max(insets.bottom, 12),
          height: BAR_H + HEADROOM,
        },
        wrap,
      ]}
    >
      <View
        onLayout={(e: LayoutChangeEvent) =>
          setWidth(e.nativeEvent.layout.width)
        }
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          flexDirection: "row",
          height: BAR_H,
          backgroundColor: C.surface,
          borderRadius: R.xl + 2,
          ...shadow.lg,
        }}
      >
        {slot > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                top: 8,
                left: 0,
                width: slot - 12,
                height: BAR_H - 16,
                borderRadius: 20,
                backgroundColor: C.pale,
              },
              pill,
            ]}
          />
        )}
        {state.routes.map((route, i) => {
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : (options.title ?? route.name);
          const focused = state.index === i;
          return (
            <TabItem
              key={route.key}
              name={route.name}
              label={label}
              focused={focused}
              center={route.name === "checkout"}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented)
                  navigation.navigate(route.name, route.params);
              }}
              onLongPress={() =>
                navigation.emit({ type: "tabLongPress", target: route.key })
              }
            />
          );
        })}
      </View>
      {slot > 0 &&
        state.routes.map((route, i) =>
          route.name !== "checkout" ? null : (
            <CenterButton
              key={route.key}
              name={route.name}
              label={descriptors[route.key].options.title ?? route.name}
              focused={state.index === i}
              left={i * slot + slot / 2 - FAB / 2}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (state.index !== i && !event.defaultPrevented)
                  navigation.navigate(route.name, route.params);
              }}
              onLongPress={() =>
                navigation.emit({ type: "tabLongPress", target: route.key })
              }
            />
          ),
        )}
    </Animated.View>
  );
}
