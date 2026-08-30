import React, { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts, radius, spacing } from "@/src/theme";

interface ToastProps {
  message: string;
  visible: boolean;
  onHide: () => void;
  variant?: "default" | "error";
}

export default function Toast({ message, visible, onHide, variant = "default" }: ToastProps) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onHide, 2200);
    return () => clearTimeout(t);
  }, [visible, onHide]);

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutDown.duration(180)}
      style={[
        styles.toast,
        { bottom: insets.bottom + 96 },
        variant === "error" && { backgroundColor: colors.error },
      ]}
      testID="toast-message"
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: spacing.xl,
    right: spacing.xl,
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  text: {
    color: colors.onBrandPrimary,
    fontFamily: fonts.textBold,
    fontSize: 14,
  },
});
