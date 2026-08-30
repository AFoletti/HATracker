import { Feather } from "@expo/vector-icons";
import dayjs from "dayjs";
import "dayjs/locale/it";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";

import { Episode, getEpisodes } from "@/src/db";
import { colors, fonts, radius, scaleColors, spacing } from "@/src/theme";

dayjs.locale("it");

type Period = "7" | "30" | "all";

const PERIODS: { key: Period; label: string }[] = [
  { key: "7", label: "7 giorni" },
  { key: "30", label: "30 giorni" },
  { key: "all", label: "Tutto" },
];

const CHART_HEIGHT = 240;
const PAD_LEFT = 28;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 32;

export default function GraficoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("30");

  useEffect(() => {
    getEpisodes()
      .then(setEpisodes)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let eps = [...episodes].sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
    if (period !== "all") {
      const cutoff = dayjs().subtract(Number(period), "day");
      eps = eps.filter((e) => dayjs(e.timestamp).isAfter(cutoff));
    }
    return eps;
  }, [episodes, period]);

  const stats = useMemo(() => {
    if (filtered.length === 0) return null;
    const values = filtered.map((e) => e.scala_mal_di_testa);
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    return {
      count: filtered.length,
      avg: avg.toFixed(1).replace(".", ","),
      max: Math.max(...values),
    };
  }, [filtered]);

  const chartWidth = Math.min(width, 500) - spacing.xl * 2;
  const plotW = chartWidth - PAD_LEFT - PAD_RIGHT;
  const plotH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

  const yFor = (v: number) => PAD_TOP + plotH - (v / 5) * plotH;

  const chart = useMemo(() => {
    if (filtered.length === 0) return null;
    const t0 = dayjs(filtered[0].timestamp).valueOf();
    const t1 = dayjs(filtered[filtered.length - 1].timestamp).valueOf();
    const range = Math.max(t1 - t0, 1);
    const points = filtered.map((e) => {
      const t = dayjs(e.timestamp).valueOf();
      const x =
        filtered.length === 1
          ? PAD_LEFT + plotW / 2
          : PAD_LEFT + ((t - t0) / range) * plotW;
      return { x, y: yFor(e.scala_mal_di_testa), v: e.scala_mal_di_testa, ts: e.timestamp };
    });
    const path = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");
    return {
      points,
      path,
      startLabel: dayjs(filtered[0].timestamp).format("D MMM"),
      endLabel: dayjs(filtered[filtered.length - 1].timestamp).format("D MMM"),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, plotW, plotH]);

  return (
    <View style={styles.root} testID="grafico-screen">
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
        <Text style={styles.title}>Andamento</Text>
        <View style={styles.iconBtnPlaceholder} />
      </View>

      <View style={styles.periodRow} testID="period-selector">
        {PERIODS.map((p) => {
          const on = period === p.key;
          return (
            <Pressable
              key={p.key}
              testID={`period-chip-${p.key}`}
              onPress={() => setPeriod(p.key)}
              style={[styles.periodChip, on && styles.periodChipOn]}
            >
              <Text style={[styles.periodChipText, on && styles.periodChipTextOn]}>
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.onSurfaceTertiary} />
        </View>
      ) : !chart ? (
        <View style={styles.center} testID="grafico-empty-state">
          <Text style={styles.emptyText}>Nessun episodio nel periodo selezionato</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.xl,
            paddingBottom: insets.bottom + spacing.xl,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.chartCard} testID="intensity-chart">
            <Svg width={chartWidth} height={CHART_HEIGHT}>
              {/* Grid lines + Y labels 0..5 */}
              {[0, 1, 2, 3, 4, 5].map((v) => (
                <React.Fragment key={v}>
                  <Line
                    x1={PAD_LEFT}
                    y1={yFor(v)}
                    x2={chartWidth - PAD_RIGHT}
                    y2={yFor(v)}
                    stroke={colors.border}
                    strokeWidth={1}
                  />
                  <SvgText
                    x={PAD_LEFT - 10}
                    y={yFor(v) + 4}
                    fontSize={11}
                    fill={colors.onSurfaceTertiary}
                    textAnchor="middle"
                  >
                    {v}
                  </SvgText>
                </React.Fragment>
              ))}
              {/* Line connecting episodes */}
              {chart.points.length > 1 && (
                <Path
                  d={chart.path}
                  stroke={colors.borderStrong}
                  strokeWidth={2}
                  fill="none"
                />
              )}
              {/* Dots colored by intensity */}
              {chart.points.map((p, i) => (
                <Circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={6}
                  fill={scaleColors[p.v]}
                  stroke={colors.surface}
                  strokeWidth={1.5}
                />
              ))}
              {/* X labels */}
              <SvgText
                x={PAD_LEFT}
                y={CHART_HEIGHT - 8}
                fontSize={11}
                fill={colors.onSurfaceTertiary}
                textAnchor="start"
              >
                {chart.startLabel}
              </SvgText>
              {chart.startLabel !== chart.endLabel && (
                <SvgText
                  x={chartWidth - PAD_RIGHT}
                  y={CHART_HEIGHT - 8}
                  fontSize={11}
                  fill={colors.onSurfaceTertiary}
                  textAnchor="end"
                >
                  {chart.endLabel}
                </SvgText>
              )}
            </Svg>
          </View>

          {stats && (
            <View style={styles.statsRow}>
              <View style={styles.statCard} testID="stat-count">
                <Text style={styles.statValue}>{stats.count}</Text>
                <Text style={styles.statLabel}>Episodi</Text>
              </View>
              <View style={styles.statCard} testID="stat-avg">
                <Text style={styles.statValue}>{stats.avg}</Text>
                <Text style={styles.statLabel}>Media</Text>
              </View>
              <View style={styles.statCard} testID="stat-max">
                <Text style={[styles.statValue, { color: scaleColors[stats.max] }]}>
                  {stats.max}
                </Text>
                <Text style={styles.statLabel}>Massimo</Text>
              </View>
            </View>
          )}

          {/* Legend */}
          <View style={styles.legendRow}>
            {scaleColors.map((c, i) => (
              <View key={i} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: c }]} />
                <Text style={styles.legendText}>{i}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
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
  iconBtnPlaceholder: {
    width: 44,
    height: 44,
  },
  periodRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  periodChip: {
    flexShrink: 0,
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  periodChipOn: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary,
  },
  periodChipText: {
    fontFamily: fonts.textBold,
    fontSize: 13,
    color: colors.onSurfaceSecondary,
  },
  periodChipTextOn: {
    color: colors.onBrandPrimary,
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
  chartCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.onSurface,
  },
  statLabel: {
    fontFamily: fonts.text,
    fontSize: 12,
    color: colors.onSurfaceTertiary,
    marginTop: 2,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontFamily: fonts.text,
    fontSize: 12,
    color: colors.onSurfaceTertiary,
  },
});
