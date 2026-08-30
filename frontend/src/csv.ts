// CSV export: builds a CSV of all episodes and opens the native share sheet
// (Gmail, WhatsApp, ...). On web preview it downloads the file directly.

import { Platform } from "react-native";

import type { Episode } from "@/src/db";

const HEADER = [
  "id",
  "timestamp",
  "scala_mal_di_testa",
  "treno_bus",
  "tanto_schermo",
  "sport",
  "scuola",
  "algifor",
  "itinerol",
  "bevuto_poco",
  "riposato_poco",
  "nota",
].join(",");

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCsv(episodes: Episode[]): string {
  const lines = episodes.map((e) =>
    [
      e.id,
      e.timestamp,
      e.scala_mal_di_testa,
      e.treno_bus ? 1 : 0,
      e.tanto_schermo ? 1 : 0,
      e.sport ? 1 : 0,
      e.scuola ? 1 : 0,
      e.algifor ? 1 : 0,
      e.itinerol ? 1 : 0,
      e.bevuto_poco ? 1 : 0,
      e.riposato_poco ? 1 : 0,
      csvEscape(e.nota ?? ""),
    ].join(","),
  );
  return [HEADER, ...lines].join("\n");
}

function fileName(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `mal_di_testa_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.csv`;
}

export async function exportCsv(
  episodes: Episode[],
): Promise<{ ok: boolean; message: string }> {
  const csv = buildCsv(episodes);
  const name = fileName();

  if (Platform.OS === "web") {
    try {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      return { ok: true, message: "CSV scaricato" };
    } catch {
      return { ok: false, message: "Errore durante l'export" };
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const FileSystem = require("expo-file-system/legacy") as typeof import("expo-file-system/legacy");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sharing = require("expo-sharing") as typeof import("expo-sharing");

    const uri = FileSystem.cacheDirectory + name;
    await FileSystem.writeAsStringAsync(uri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const available = await Sharing.isAvailableAsync();
    if (!available) {
      return { ok: false, message: "Condivisione non disponibile" };
    }
    await Sharing.shareAsync(uri, {
      mimeType: "text/csv",
      dialogTitle: "Esporta episodi (CSV)",
      UTI: "public.comma-separated-values-text",
    });
    return { ok: true, message: "CSV pronto per la condivisione" };
  } catch {
    return { ok: false, message: "Errore durante l'export" };
  }
}
