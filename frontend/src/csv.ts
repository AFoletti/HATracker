// CSV export: builds a CSV of all episodes and opens the native share sheet
// (Gmail, WhatsApp, ...). On web preview it downloads the file directly.

import { Platform } from "react-native";

import type { Episode, ImportedEpisode } from "@/src/db";

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

// ---------- Import ----------

// RFC 4180-style tokenizer: handles quoted fields with commas, quotes, newlines.
function tokenizeCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  row.push(field);
  rows.push(row);
  // Drop fully-empty trailing rows
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const BOOL_COLUMNS = [
  "treno_bus",
  "tanto_schermo",
  "sport",
  "scuola",
  "algifor",
  "itinerol",
  "bevuto_poco",
  "riposato_poco",
] as const;

function parseBool(v: string | undefined): boolean {
  return v === "1" || v?.toLowerCase() === "true";
}

// Parses CSV text in the app's export format. Throws Error with an Italian
// message on invalid input. Older exports missing newer columns are accepted.
export function parseCsv(text: string): ImportedEpisode[] {
  const clean = text.replace(/^\uFEFF/, ""); // strip BOM
  const rows = tokenizeCsv(clean);
  if (rows.length < 1) throw new Error("Il file CSV è vuoto");

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  if (col("timestamp") === -1 || col("scala_mal_di_testa") === -1) {
    throw new Error("Formato CSV non riconosciuto: mancano le colonne 'timestamp' o 'scala_mal_di_testa'");
  }

  const episodes: ImportedEpisode[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const get = (name: string) => {
      const i = col(name);
      return i === -1 ? undefined : cells[i];
    };

    const timestamp = (get("timestamp") ?? "").trim();
    if (!timestamp || isNaN(Date.parse(timestamp))) {
      throw new Error(`Riga ${r + 1}: data/ora non valida ("${timestamp}")`);
    }

    const scala = Number((get("scala_mal_di_testa") ?? "").trim());
    if (!Number.isInteger(scala) || scala < 0 || scala > 5) {
      throw new Error(`Riga ${r + 1}: intensità non valida (deve essere 0–5)`);
    }

    const flags = Object.fromEntries(
      BOOL_COLUMNS.map((k) => [k, parseBool(get(k)?.trim())]),
    ) as Record<(typeof BOOL_COLUMNS)[number], boolean>;

    episodes.push({
      timestamp: new Date(timestamp).toISOString(),
      scala_mal_di_testa: scala,
      ...flags,
      nota: get("nota") ?? "",
    });
  }

  if (episodes.length === 0) throw new Error("Il file CSV non contiene episodi");
  return episodes;
}

// Opens the system file picker and returns the selected CSV text,
// or null if the user cancelled.
export async function pickCsvText(): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DocumentPicker = require("expo-document-picker") as typeof import("expo-document-picker");
  const res = await DocumentPicker.getDocumentAsync({
    type: [
      "text/csv",
      "text/comma-separated-values",
      "text/plain",
      "application/csv",
      "application/vnd.ms-excel",
    ],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || res.assets.length === 0) return null;
  const asset = res.assets[0];

  if (Platform.OS === "web") {
    if (asset.file) return await asset.file.text();
    const resp = await fetch(asset.uri);
    return await resp.text();
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const FileSystem = require("expo-file-system/legacy") as typeof import("expo-file-system/legacy");
  return await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}
