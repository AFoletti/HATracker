import { Feather } from "@expo/vector-icons";
import dayjs from "dayjs";
import "dayjs/locale/it";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Toast from "@/src/components/Toast";
import { deleteEpisode, Episode, getEpisodes } from "@/src/db";
import { exportCsv } from "@/src/csv";
import { colors, fonts, radius, scaleColors, spacing } from "@/src/theme";

dayjs.locale("it");

const FACTOR_LABELS: [keyof Episode, string][] = [
  ["treno_bus", "Treno/bus"],
  ["tanto_schermo", "Tanto schermo"],
  ["sport", "Sport"],
  ["scuola", "Scuola"],
  ["algifor", "Algifor"],
  ["itinerol", "Itinerol"],
];

export default function StoricoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const eps = await getEpisodes();
      setEpisodes(eps);
    } catch {
      setToast({ msg: "Errore nel caricamento", error: true });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onDelete = async (id: number) => {
    await deleteEpisode(id);
    setEpisodes((eps) => eps.filter((e) => e.id !== id));
    setConfirmId(null);
    setToast({ msg: "Episodio eliminato" });
  };

  const onExport = async () => {
    if (episodes.length === 0) {
      setToast({ msg: "Nessun episodio da esportare", error: true });
      return;
    }
    const res = await exportCsv(episodes);
    setToast({ msg: res.message, error: !res.ok });
  };

  const renderItem = ({ item, index }: { item: Episode; index: number }) => {
    const tags = FACTOR_LABELS.filter(([k]) => item[k] === true).map(([, l]) => l);
    const color = scaleColors[item.scala_mal_di_testa] ?? scaleColors[0];
    const confirming = confirmId === item.id;
    return (
      <Animated.View
        entering={FadeInDown.delay(Math.min(index * 40, 300)).duration(250)}
        style={styles.card}
        testID={`episode-card-${item.id}`}
      >
        <View style={[styles.badge, { backgroundColor: color }]}>
          <Text style={styles.badgeText}>{item.scala_mal_di_testa}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardDate}>
            {dayjs(item.timestamp).format("ddd D MMM YYYY · HH:mm")}
          </Text>
          {tags.length > 0 ? (
            <Text style={styles.cardTags}>{tags.join(" · ")}</Text>
          ) : (
            <Text style={styles.cardTagsEmpty}>Nessun fattore</Text>
          )}
          {!!item.nota && (
            <Text style={styles.cardNota} numberOfLines={2} testID={`episode-nota-${item.id}`}>
              “{item.nota}”
            </Text>
          )}
        </View>
        {confirming ? (
          <View style={styles.confirmRow}>
            <Pressable
              testID={`confirm-delete-${item.id}`}
              onPress={() => onDelete(item.id)}
              style={styles.confirmBtn}
              hitSlop={6}
            >
              <Text style={styles.confirmBtnText}>Elimina</Text>
            </Pressable>
            <Pressable
              testID={`cancel-delete-${item.id}`}
              onPress={() => setConfirmId(null)}
              style={styles.confirmCancel}
              hitSlop={6}
            >
              <Feather name="x" size={16} color={colors.onSurfaceTertiary} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            testID={`delete-button-${item.id}`}
            onPress={() => setConfirmId(item.id)}
            style={({ pressed }) => [styles.trashBtn, pressed && { opacity: 0.6 }]}
            hitSlop={8}
          >
            <Feather name="trash-2" size={18} color={colors.onSurfaceTertiary} />
          </Pressable>
        )}
      </Animated.View>
    );
  };

  return (
    <View style={styles.root} testID="storico-screen">
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable
          testID="back-button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
          hitSlop={8}
        >
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Storico</Text>
        <Pressable
          testID="export-csv-button"
          onPress={onExport}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
          hitSlop={8}
        >
          <Feather name="share" size={20} color={colors.onSurface} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.onSurfaceTertiary} />
        </View>
      ) : episodes.length === 0 ? (
        <View style={styles.center} testID="empty-state">
          <Text style={styles.emptyText}>Nessun mal di testa registrato</Text>
        </View>
      ) : (
        <FlatList
          data={episodes}
          keyExtractor={(e) => String(e.id)}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.sm,
            paddingBottom: insets.bottom + spacing.xl,
            gap: spacing.md,
          }}
          showsVerticalScrollIndicator={false}
          testID="episodes-list"
        />
      )}

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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.onSurface,
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
  },
  emptyText: {
    fontFamily: fonts.text,
    fontSize: 15,
    color: colors.onSurfaceTertiary,
    textAlign: "center",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: "#FFFFFF",
  },
  cardBody: {
    flex: 1,
  },
  cardDate: {
    fontFamily: fonts.textBold,
    fontSize: 14,
    color: colors.onSurface,
    textTransform: "capitalize",
  },
  cardTags: {
    fontFamily: fonts.text,
    fontSize: 13,
    color: colors.onSurfaceTertiary,
    marginTop: 2,
  },
  cardTagsEmpty: {
    fontFamily: fonts.text,
    fontSize: 13,
    color: colors.borderStrong,
    marginTop: 2,
    fontStyle: "italic",
  },
  cardNota: {
    fontFamily: fonts.text,
    fontSize: 13,
    color: colors.onSurfaceSecondary,
    fontStyle: "italic",
    marginTop: spacing.xs,
  },
  trashBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
  confirmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  confirmBtn: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.md,
    height: 36,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnText: {
    fontFamily: fonts.textBold,
    fontSize: 13,
    color: "#FFFFFF",
  },
  confirmCancel: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
  },
});
