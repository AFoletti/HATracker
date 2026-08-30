# PRD — Mal di Testa Tracker

## Problem Statement (originale)
App mobile per uso personale, tutto on-device: registrazione rapida di episodi di mal di testa (scala 0–5 con colore verde→rosso scuro, checkbox Treno/bus, Tanto schermo, Sport, Scuola, Algifor, Itinerol, timestamp automatico), storico con eliminazione, export CSV via share sheet nativo. Nessun account, nessun backend, nessuna rete. Distribuzione via APK sideload. Richiesta originale in Kotlin nativo → utente ha accettato Expo/React Native. Widget homescreen fuori scope (non realizzabile in Expo): sostituito da apertura diretta sulla schermata di registrazione (scelta utente).

## Scelte utente
- Expo/React Native invece di Kotlin nativo ✔
- App si apre direttamente sulla schermata di registrazione (quick log) ✔
- UI in italiano ✔
- Export CSV via share sheet nativo ✔

## Architettura
- **Frontend only** — nessun backend usato (server.py template intatto ma inutilizzato)
- Dati: `expo-sqlite` su nativo (tabella `episodi` con soft delete `deleted_at`), fallback storage locale KV su web preview — `/app/frontend/src/db.ts`
- Export: `expo-file-system/legacy` + `expo-sharing` (nativo), download blob (web) — `/app/frontend/src/csv.ts`
- Schermate: `app/index.tsx` (Nuovo episodio), `app/storico.tsx` (Storico)
- Design: personalità "Hand-Drawn/Journal", font Fraunces + Nunito (locali in assets/fonts), scala colori 0–5: #8BA888 → #8F3B3B
- Quick-log: su Android dopo Salva/Annulla l'app va in background (`BackHandler.exitApp()`)

## Implementato (30 Giu 2026 — MVP)
- Schermata Nuovo episodio: selettore 0–5 a pillole colorate, numero grande dinamico, 6 chip fattori/farmaci, Salva con timestamp ISO automatico, Annulla, toast feedback, haptics
- Storico: lista cronologica inversa, badge intensità colorato, tag fattori, data italiana (dayjs locale it), eliminazione con conferma inline (soft delete), empty state
- Export CSV: header + una riga per episodio (booleani 0/1), share sheet nativo / download web
- Testing agent: 100% pass (12/12 flussi)

## Backlog / fuori scope v1 (dalla spec)
- P2: Statistiche/grafici in-app
- P2: Modifica episodi esistenti
- P2: Backup/sync cloud
- P2: Notifiche/promemoria
- Nota: widget homescreen non realizzabile in Expo standard

## Note distribuzione
APK per sideload: pulsante Publish → build Android. La condivisione CSV nativa (share sheet) funziona su dispositivo reale/Expo Go, non su web preview (dove diventa download).
