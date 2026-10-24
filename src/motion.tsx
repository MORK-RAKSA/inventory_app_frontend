/**
 * Motion kit — calm, no bounce.
 *
 * Framer Motion is web-only, so this uses react-native-reanimated with the same ideas
 * (initial → animate, whileTap, layout, presence). Everything is a short eased timing curve:
 * nothing overshoots or springs back.
 */
import React, { useEffect, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  PressableProps,
  StyleProp,
  Text,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutLeft,
  LinearTransition,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { C, R } from "./theme";

export const ease = Easing.out(Easing.cubic);
export const easeInOut = Easing.inOut(Easing.cubic);
/** Standard timing config used across the app. */
export const timing = (ms = 220) => ({ duration: ms, easing: ease });

/** `layout` prop for lists: siblings slide smoothly when an item is added or removed. */
export const listLayout = LinearTransition.duration(220).easing(ease);

/** Entering preset: soft fade + short rise, lightly staggered by index. */
export const rise = (index = 0) =>
  FadeInDown.delay(Math.min(index, 8) * 40)
    .duration(300)
    .easing(ease);
export const fade = FadeIn.duration(200);
export const fadeOut = FadeOut.duration(150);
export const popIn = FadeIn.duration(160);
export const slideOut = FadeOutLeft.duration(180);

/** <Rise index={n}> — staggered entrance wrapper. */
export function Rise({
  index = 0,
  children,
  style,
}: {
  index?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View entering={rise(index)} style={style}>
      {children}
    </Animated.View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** <Press> — subtle press feedback (Framer `whileTap`), eased, no overshoot. */
export function Press({
  children,
  style,
  scale = 0.97,
  disabled,
  ...rest
}: Omit<PressableProps, "style" | "children"> & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scale?: number;
}) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        s.value = withTiming(scale, { duration: 90, easing: ease });
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.value = withTiming(1, { duration: 160, easing: ease });
        rest.onPressOut?.(e);
      }}
      style={[style, anim]}
    >
      {children}
    </AnimatedPressable>
  );
}

/** Filter chip whose background/text colour cross-fade when selected. */
export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const p = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    p.value = withTiming(active ? 1 : 0, timing(200));
  }, [active]);
  const box = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], [C.surface, C.primary]),
    borderColor: interpolateColor(p.value, [0, 1], [C.border, C.primary]),
  }));
  const txt = useAnimatedStyle(() => ({
    color: interpolateColor(p.value, [0, 1], [C.text, "#FFFFFF"]),
  }));
  return (
    <Press
      onPress={onPress}
      scale={0.97}
      style={[
        {
          marginRight: 8,
          borderRadius: R.pill,
          borderWidth: 1,
          paddingHorizontal: 15,
          paddingVertical: 9,
        },
        box,
      ]}
    >
      <Animated.Text style={[{ fontSize: 12.5, fontWeight: "700" }, txt]}>
        {label}
      </Animated.Text>
    </Press>
  );
}

/** Segmented control with a thumb that glides between options. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const [w, setW] = useState(0);
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const seg = w > 0 ? (w - 8) / options.length : 0;
  const x = useSharedValue(0);
  const first = useRef(true);
  useEffect(() => {
    if (!seg) return;
    if (first.current) {
      x.value = index * seg;
      first.current = false;
    } else
      x.value = withTiming(index * seg, { duration: 240, easing: easeInOut });
  }, [index, seg]);
  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));
  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      style={{
        flexDirection: "row",
        backgroundColor: C.pale,
        borderRadius: R.md + 2,
        padding: 4,
      }}
    >
      {seg > 0 && (
        <Animated.View
          style={[
            {
              position: "absolute",
              top: 4,
              left: 4,
              width: seg,
              bottom: 4,
              borderRadius: R.md - 2,
              backgroundColor: C.surface,
              shadowColor: "#3B2A7A",
              shadowOpacity: 0.12,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 2,
            },
            thumb,
          ]}
        />
      )}
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => onChange(o.value)}
          accessibilityRole="button"
          accessibilityState={{ selected: o.value === value }}
          style={{ flex: 1, paddingVertical: 11, alignItems: "center" }}
        >
          <Text
            style={{
              fontWeight: "800",
              fontSize: 13,
              color: o.value === value ? C.primary : C.muted,
            }}
          >
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
