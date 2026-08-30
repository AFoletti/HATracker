import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Toast from "@/src/components/Toast";
import { addEpisode } from "@/src/db";
import { colors, fonts, radius, scaleColors, spacing } from "@/src/theme";

const FACTORS: { key: FactorKey; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "treno_bus", label: "Treno/bus", icon: "truck" },
  { key: "tanto_schermo", label: "Tanto schermo", icon: "monitor" },
  { key: "sport", label: "Sport", icon: "activity" },
  { key: "scuola", label: "Scuola", icon: "book-open" },
  { key: "algifor", label: "Algifor", icon: "plus-circle" },
  { key: "itinerol", label: "Itinerol", icon: "droplet" },
];

type FactorKey =
  | "treno_bus"
  | "tanto_schermo"
  | "sport"
  | "scuola"
  | "algifor"
  | "itinerol";

const EMPTY_FLAGS: Record<FactorKey, boolean> = {
  treno_bus: false,
  tanto_schermo: false,
  sport: false,
  scuola: false,
  algifor: false,
  itinerol: false,
};

export default function NuovoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [scala, setScala] = useState(0);
  const [flags, setFlags] = useState<Record<FactorKey, boolean>>(EMPTY_FLAGS);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);

  const activeColor = scaleColors[scala];

  const selectScala = (v: number) => {
    setScala(v);
    if (Platform.OS !== "web") Haptics.selectionAsync();
  };

  const toggleFlag = (key: FactorKey) => {
    setFlags((f) => ({ ...f, [key]: !f[key] }));
    if (Platform.OS !== "web") Haptics.selectionAsync();
  };

  const resetForm = useCallback(() => {
    setScala(0);
    setFlags(EMPTY_FLAGS);
  }, []);

  const closeOrReset = useCallback(() => {
    resetForm();
    // Quick-log behavior: on Android the app goes to background after save/cancel.
    if (Platform.OS === "android") {
      setTimeout(() => BackHandler.exitApp(), 600);
    }
  }, [resetForm]);

  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await addEpisode({ scala_mal_di_testa: scala, ...flags });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setToast({ msg: "Episodio salvato" });
      closeOrReset();
    } catch {
      setToast({ msg: "Errore durante il salvataggio", error: true });
    } finally {
      setSaving(false);
    }
  };

  const onCancel = () => {
    closeOrReset();
    setToast({ msg: "Annullato, niente salvato" });
  };

  return (
    <View style={styles.root} testID="nuovo-screen">
      <StatusBar style="dark" />
      {/* Soft tint of the selected intensity color on the top block */}
      <View style={[styles.tintBlock, { backgroundColor: activeColor + "1A" }]} />

      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View>
          <Text style={styles.title}>Nuovo episodio</Text>
          <Text style={styles.subtitle}>Come va il mal di testa?</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            testID="open-grafico-button"
            onPress={() => router.push("/grafico")}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            hitSlop={8}
          >
            <Feather name="trending-up" size={20} color={colors.onSurface} />
          </Pressable>
          <Pressable
            testID="open-storico-button"
            onPress={() => router.push("/storico")}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            hitSlop={8}
          >
            <Feather name="list" size={22} color={colors.onSurface} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Intensità</Text>
        <View style={styles.scaleRow} testID="intensity-selector">
          {scaleColors.map((c, i) => {
            const selected = scala === i;
            return (
              <Pressable
                key={i}
                testID={`intensity-pill-${i}`}
                onPress={() => selectScala(i)}
                style={[
                  styles.scalePill,
                  { backgroundColor: selected ? c : colors.surfaceSecondary },
                  selected && styles.scalePillSelected,
                ]}
              >
                <Text
                  style={[
                    styles.scalePillText,
                    { color: selected ? "#FFFFFF" : colors.onSurfaceTertiary },
                  ]}
                >
                  {i}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Fattori e farmaci</Text>
        <View style={styles.chipsWrap}>
          {FACTORS.map((f) => {
            const on = flags[f.key];
            return (
              <Pressable
                key={f.key}
                testID={`factor-chip-${f.key}`}
                onPress={() => toggleFlag(f.key)}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Feather
                  name={f.icon}
                  size={15}
                  color={on ? colors.onBrandPrimary : colors.onSurfaceSecondary}
                />
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Pressable
          testID="cancel-button"
          onPress={onCancel}
          style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
        >
          <Text style={styles.ghostBtnText}>Annulla</Text>
        </Pressable>
        <Pressable
          testID="save-button"
          onPress={onSave}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveBtn,
            (pressed || saving) && styles.pressed,
          ]}
        >
          <Feather name="check" size={18} color={colors.onBrandPrimary} />
          <Text style={styles.saveBtnText}>{saving ? "Salvo…" : "Salva"}</Text>
        </Pressable>
      </View>

      <Toast
        message={toast?.msg ?? ""}
        visible={!!toast}
        variant={toast?.error ? "error" : "default"}
        onHide={() => setToast(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  tintBlock: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 225,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.onSurface,
  },
  subtitle: {
    fontFamily: fonts.text,
    fontSize: 14,
    color: colors.onSurfaceTertiary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  scaleRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  scalePill: {
    flex: 1,
    height: 52,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  scalePillSelected: {
    transform: [{ scale: 1.08 }],
    borderColor: "transparent",
  },
  scalePillText: {
    fontFamily: fonts.textBold,
    fontSize: 18,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.onSurface,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm + 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm - 2,
    paddingHorizontal: spacing.lg,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary,
  },
  chipText: {
    fontFamily: fonts.textBold,
    fontSize: 14,
    color: colors.onSurfaceSecondary,
  },
  chipTextOn: {
    color: colors.onBrandPrimary,
  },
  footer: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  ghostBtn: {
    flex: 1,
    height: 54,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  ghostBtnText: {
    fontFamily: fonts.textBold,
    fontSize: 16,
    color: colors.onSurfaceSecondary,
  },
  saveBtn: {
    flex: 2,
    height: 54,
    borderRadius: radius.lg,
    backgroundColor: colors.brandPrimary,
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    fontFamily: fonts.textBold,
    fontSize: 16,
    color: colors.onBrandPrimary,
  },
  pressed: {
    opacity: 0.7,
  },
});
