# Quiz System (Hoofdscherm + Team 1/2 + Admin) — Supabase

Dit project is een **download-klare basis** voor jouw quiz-setup:

- **Hoofdscherm** (`index.html`): scores Team 1/2 + huidige vraag
- **Team pagina** (`team.html`): QR scannen of token invoeren → vraag openen → (optioneel) open antwoord insturen
- **Admin** (`admin.html`): game aanmaken/activeren, vraag forceren, score aanpassen, antwoorden monitoren, token reset

De kern: een **QR token** verwijst naar een vraag. Teams bepalen zo zelf de volgorde/categorie.

---

## 1) Supabase setup (stappen)

### A. Maak een nieuw Supabase project
1. Ga naar Supabase → nieuw project
2. Noteer:
   - **Project URL**
   - **anon public key**

### B. Draai de SQL (schema + seed)
1. Open Supabase → **SQL Editor**
2. Plak en run: `sql/01_schema_and_seed.sql`

Dit maakt:
- tabellen: `games`, `teams`, `categories`, `questions`, `qr_tokens`, `answers`, `admins`
- functies (RPC):
  - `rpc_create_game()`
  - `rpc_set_active_game(game_id)`
  - `rpc_admin_set_current_question(game_id, question_id)`
  - `rpc_admin_adjust_score(game_id, team_id, delta)`
  - `rpc_admin_reset_token(game_id, token)`
  - `rpc_team_use_token(game_id, team_id, token, answer_text)`

### C. Maak jouw admin account
1. Supabase → **Authentication → Users → Add user**
2. Maak een user (email+password)
3. Kopieer de **User UID**
4. Supabase → SQL Editor → run:

```sql
insert into public.admins(user_id) values ('PASTE_ADMIN_UID_HERE');
```

> Vanaf nu mag alleen dit account de admin-RPC’s uitvoeren (score, reset, force question, etc.).

---

## 2) Project lokaal testen

### A. Zet Supabase keys in `js/config.js`
Open `js/config.js` en vul jouw waarden:

```js
export const SUPABASE_URL = "https://...supabase.co";
export const SUPABASE_ANON_KEY = "eyJ...";
```

### B. Start een lokale webserver
Browser security blokkeert vaak `camera` en `modules` via `file://`. Gebruik dus een server:

**Optie 1 (Python):**
```bash
python3 -m http.server 5500
```
Open: `http://localhost:5500`

**Optie 2 (VSCode Live Server):**
- Rechtermuisklik `index.html` → “Open with Live Server”

---

## 3) Deploy (aanrader)

Je kunt dit als statische site hosten:
- **GitHub Pages**
- **Netlify**
- **Vercel**

Omdat alles client-side is, hoef je alleen de bestanden te uploaden.

---

## 4) Gebruik (spel flow)

### A. Admin
1. Open `admin.html`
2. Log in
3. Klik **Create new game**
4. Klik **Set active** bij die game

### B. Hoofdscherm (TV)
1. Open `index.html?game=GAME_UUID`
   - Of open `index.html`, en plak/selecteer game in het scherm
2. Laat fullscreen staan

### C. Team pagina’s
- Team 1: `team.html?team=1&game=GAME_UUID`
- Team 2: `team.html?team=2&game=GAME_UUID`

Teams kunnen:
- QR scannen (camera)
- of token plakken

> Bij token-gebruik wordt de vraag automatisch "current" in het actieve spel.

---

## 5) QR codes maken

In Supabase staat per vraag een `qr_tokens.token`.

Je maakt QR’s die óf:
- alleen de token-string bevatten (bijv. `A1B2C3D4`)
- óf een URL zoals:
  - `https://jouwsite.nl/team.html?team=1&game=GAME_UUID&token=A1B2C3D4`

Tip: gebruik een batch QR generator (online) en maak kaartjes per categorie.

---

## 6) Vragen toevoegen

- Voeg records toe in `questions`
- Maak tokens in `qr_tokens` (of genereer ze via SQL)

In `sql/01_schema_and_seed.sql` staat voorbeeld-data en hoe je bulk tokens maakt.

---

## 7) Aanpassen naar jouw 4 categorieën (muziek-quiz)

In `categories` staan standaard 4 categorieën:
1. Artiest/Trivia
2. Foto reveal
3. Tekst aanvullen
4. Karaoke

`questions.media_url` kun je gebruiken voor:
- Spotify embed URL
- afbeelding URL
- video URL

---

Veel plezier! Als je wilt, kan ik hierna:
- categorie-specifieke UI (foto reveal timer, karaoke woordscore, etc.)
- “beurt”-logica (wie is aan de beurt)
- bonusvragen / jokers
- nette QR-kaartjes als print-PDF
