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
- Schermata Nuovo episodio: selettore 0–5 a pillole colorate, 6 chip fattori/farmaci, Salva con timestamp ISO automatico, Annulla, toast feedback, haptics
- Storico: lista cronologica inversa, badge intensità colorato, tag fattori, data italiana (dayjs locale it), eliminazione con conferma inline (soft delete), empty state testuale
- Export CSV: header + una riga per episodio (booleani 0/1), share sheet nativo / download web
- Testing agent: 100% pass (12/12 flussi)

## Iterazione 2 (30 Giu 2026 — feedback utente)
- Rimosso il numero grande sopra la scala (solo selettore a pillole)
- Empty state Storico: solo testo "Nessun mal di testa registrato" (niente immagine)
- Font cambiato in Manrope (sans serif pulito, 400/600/700 locali in assets/fonts) — Fraunces/Nunito non più caricati
- Nuova icona app generata (6 punti crescenti verde→rosso su sfondo ink #2A2825): icon.png, adaptive-icon.png, splash-image.png, favicon.png; app.json aggiornato (adaptiveIcon/splash background #2A2825). Nota: l'icona si vede solo dopo build APK, non in Expo Go.

## Iterazione 3 (30 Giu 2026)
- Nome app impostato a "Mal di Testa" in app.json (appare sotto l'icona dopo la build APK)

## Iterazione 4 (30 Giu 2026 — Grafico Andamento)
- Nuova schermata `app/grafico.tsx` "Andamento": grafico SVG (react-native-svg) intensità nel tempo — linea + punti colorati con la scala 0–5, asse Y 0–5, etichette date
- Filtro periodo: chip 7 giorni / 30 giorni / Tutto
- Statistiche: Episodi, Media (virgola decimale), Massimo (colorato per intensità) + legenda colori
- Accesso via icona trending-up nell'header della schermata Nuovo
- Testing agent: 7/7 pass (incl. regressione salvataggio/storico)

## Iterazione 5 (30 Giu 2026 — Fattori Ricorrenti)
- Nella schermata Andamento: sezione "Fattori ricorrenti (episodi forti 4–5)" — conta i fattori negli episodi con intensità ≥4 nel periodo selezionato, con barre orizzontali, conteggio e percentuale; ordinati per frequenza; stati vuoti gestiti ("Nessun episodio forte nel periodo" / "Nessun fattore registrato")
- Verificato via screenshot: calcoli corretti (episodio lieve escluso dal conteggio)

## Iterazione 6 (30 Giu 2026 — Nota Libera)
- Campo "Nota" facoltativo (multiline, max 300 caratteri) nella schermata Nuovo — colonna `nota` in SQLite (migrazione ALTER TABLE) e nel fallback web
- Storico: la nota appare in corsivo tra virgolette sulla card (solo se presente)
- CSV: colonna `nota` in coda, con escaping corretto (virgole/virgolette/a-capo)
- Keyboard UX: `react-native-keyboard-controller` (KeyboardProvider in _layout, KeyboardAwareScrollView + KeyboardStickyView in Nuovo)
- Testing agent: 7/7 pass

## Iterazione 7 (30 Giu 2026 — fix minori)
- L'app resta aperta dopo il salvataggio (rimosso BackHandler.exitApp; il form si resetta con toast di conferma)
- Due nuovi fattori booleani: "Bevuto poco" (`bevuto_poco`) e "Riposato poco" (`riposato_poco`) — chip in Nuovo, tag in Storico, conteggio in Fattori ricorrenti, colonne in SQLite (migrazione ALTER TABLE) e nell'export CSV

## Iterazione 8 (30 Giu 2026 — Import CSV)
- Pulsante Import (icona download) nell'header dello Storico → modal di conferma ("sostituirà tutti gli episodi attuali") → file picker di sistema (expo-document-picker)
- Parser CSV RFC4180 in `src/csv.ts` (parseCsv, pickCsvText): gestisce campi tra virgolette, virgole/a-capo nelle note, BOM; accetta anche export vecchi senza le colonne nuove (default 0/vuoto)
- `replaceAllEpisodes` in db.ts: soft-delete di tutti gli episodi correnti + insert dei nuovi in transazione (SQLite) / fallback web
- Validazione con messaggi di errore in italiano; import fallito NON tocca i dati esistenti
- Testing agent: 9/9 pass (incl. round-trip export→import e regressione)

## Iterazione 9 (30 Giu 2026 — analisi errore deploy)
- Build APK fallita per `503 Service Unavailable` dall'API EAS Build di Expo (outage lato Expo, DOPO upload e fingerprint riusciti) — nessun errore di codice nei log
- Health check deployment: rimossi i pattern `.env`/`.env.*`/`*.env` dal .gitignore root (finding del deployment agent; i .env dell'app non contengono segreti)
- Nota: i finding "SQLite non supportato" del deployment agent sono policy statiche — lo storage on-device è requisito esplicito dell'utente e la pipeline di build accetta expo-sqlite (upload EAS riuscito)
- Smoke regression testing agent: 6/6 pass — app pronta per nuovo tentativo di deploy

## Backlog aggiornato
- P1: Modifica episodi esistenti
- P2: Filtri storico, riepilogo mensile, notifiche

## Backlog / fuori scope v1 (dalla spec)
- P2: Statistiche/grafici in-app
- P2: Modifica episodi esistenti
- P2: Backup/sync cloud
- P2: Notifiche/promemoria
- Nota: widget homescreen non realizzabile in Expo standard

## Note distribuzione
APK per sideload: pulsante Publish → build Android. La condivisione CSV nativa (share sheet) funziona su dispositivo reale/Expo Go, non su web preview (dove diventa download).
