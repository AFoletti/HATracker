// On-device data layer for headache episodes.
// Native (iOS/Android): expo-sqlite. Web preview: local key-value storage fallback.

import { Platform } from "react-native";

import { storage } from "@/src/utils/storage";

export interface NewEpisode {
  scala_mal_di_testa: number;
  treno_bus: boolean;
  tanto_schermo: boolean;
  sport: boolean;
  scuola: boolean;
  algifor: boolean;
  itinerol: boolean;
  nota: string;
}

export interface Episode extends NewEpisode {
  id: number;
  timestamp: string; // ISO 8601
}

const isNative = Platform.OS !== "web";

// ---------- Native (SQLite) ----------

let _db: import("expo-sqlite").SQLiteDatabase | null = null;

function getDb(): import("expo-sqlite").SQLiteDatabase {
  if (!_db) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SQLite = require("expo-sqlite") as typeof import("expo-sqlite");
    _db = SQLite.openDatabaseSync("malditesta.db");
    _db.execSync(`
      CREATE TABLE IF NOT EXISTS episodi (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        scala_mal_di_testa INTEGER NOT NULL,
        treno_bus INTEGER NOT NULL DEFAULT 0,
        tanto_schermo INTEGER NOT NULL DEFAULT 0,
        sport INTEGER NOT NULL DEFAULT 0,
        scuola INTEGER NOT NULL DEFAULT 0,
        algifor INTEGER NOT NULL DEFAULT 0,
        itinerol INTEGER NOT NULL DEFAULT 0,
        deleted_at TEXT
      );
    `);
    // Migration: add nota column to databases created before it existed.
    try {
      _db.execSync(`ALTER TABLE episodi ADD COLUMN nota TEXT NOT NULL DEFAULT ''`);
    } catch {
      // column already exists
    }
  }
  return _db;
}

interface Row {
  id: number;
  timestamp: string;
  scala_mal_di_testa: number;
  treno_bus: number;
  tanto_schermo: number;
  sport: number;
  scuola: number;
  algifor: number;
  itinerol: number;
  nota: string | null;
}

function rowToEpisode(r: Row): Episode {
  return {
    id: r.id,
    timestamp: r.timestamp,
    scala_mal_di_testa: r.scala_mal_di_testa,
    treno_bus: !!r.treno_bus,
    tanto_schermo: !!r.tanto_schermo,
    sport: !!r.sport,
    scuola: !!r.scuola,
    algifor: !!r.algifor,
    itinerol: !!r.itinerol,
    nota: r.nota ?? "",
  };
}

// ---------- Web fallback (local KV storage) ----------

const WEB_KEY = "episodi_v1";

interface WebStore {
  nextId: number;
  episodes: (Episode & { deleted_at?: string | null })[];
}

async function webLoad(): Promise<WebStore> {
  const raw = await storage.getItem(WEB_KEY, "");
  if (!raw) return { nextId: 1, episodes: [] };
  try {
    return JSON.parse(raw) as WebStore;
  } catch {
    return { nextId: 1, episodes: [] };
  }
}

async function webSave(store: WebStore): Promise<void> {
  await storage.setItem(WEB_KEY, JSON.stringify(store));
}

// ---------- Public API ----------

export async function addEpisode(e: NewEpisode): Promise<Episode> {
  const timestamp = new Date().toISOString();
  if (isNative) {
    const db = getDb();
    const res = db.runSync(
      `INSERT INTO episodi (timestamp, scala_mal_di_testa, treno_bus, tanto_schermo, sport, scuola, algifor, itinerol, nota)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        timestamp,
        e.scala_mal_di_testa,
        e.treno_bus ? 1 : 0,
        e.tanto_schermo ? 1 : 0,
        e.sport ? 1 : 0,
        e.scuola ? 1 : 0,
        e.algifor ? 1 : 0,
        e.itinerol ? 1 : 0,
        e.nota,
      ],
    );
    return { id: res.lastInsertRowId, timestamp, ...e };
  }
  const store = await webLoad();
  const episode: Episode = { id: store.nextId, timestamp, ...e };
  store.episodes.push({ ...episode, deleted_at: null });
  store.nextId += 1;
  await webSave(store);
  return episode;
}

export async function getEpisodes(): Promise<Episode[]> {
  if (isNative) {
    const db = getDb();
    const rows = db.getAllSync<Row>(
      `SELECT id, timestamp, scala_mal_di_testa, treno_bus, tanto_schermo, sport, scuola, algifor, itinerol, nota
       FROM episodi WHERE deleted_at IS NULL ORDER BY timestamp DESC`,
    );
    return rows.map(rowToEpisode);
  }
  const store = await webLoad();
  return store.episodes
    .filter((e) => !e.deleted_at)
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
    .map(({ deleted_at: _d, ...rest }) => ({ ...rest, nota: rest.nota ?? "" }));
}

export async function deleteEpisode(id: number): Promise<void> {
  const deletedAt = new Date().toISOString();
  if (isNative) {
    const db = getDb();
    db.runSync(`UPDATE episodi SET deleted_at = ? WHERE id = ?`, [deletedAt, id]);
    return;
  }
  const store = await webLoad();
  const ep = store.episodes.find((e) => e.id === id);
  if (ep) ep.deleted_at = deletedAt;
  await webSave(store);
}
