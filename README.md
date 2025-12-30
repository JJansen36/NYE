# Spotify Quiz (2 Teams) — GitHub Pages + Supabase Realtime

Dit is een simpele 2-team muziekquiz met 4 categorieën:
1) Jaartal van nummer
2) Artiest - titel
3) Intro (5 sec preview) — raad welk nummer
4) Foto van artiest (vaag → helder, 20s)

## Bestanden
- `index.html` = **hoofscherm** (TV/Beamer)
- `admin.html` = **admin** (score + volgende vraag)
- `styles.css` = styling voor beide
- `supabase.js` = Supabase client init (vul je URL/KEY in!)
- `main.js` = logica hoofdscherm
- `admin.js` = logica admin
- `sql/schema.sql` = tabellen + (open) RLS policies
- `sql/seed.sql` = seed teams + quiz_state
- `sql/reset.sql` = reset statements

## 1) Supabase setup
1. Open Supabase → SQL Editor
2. Run `sql/schema.sql`
3. Run `sql/seed.sql`

> ⚠️ Let op: de policies zijn bewust **open** (anon write) zodat het zonder login werkt op GitHub Pages.
> Voor productie/veiligheid kun je later admin-auth toevoegen.

## 2) Vul je Supabase keys in
Open `supabase.js` en vul in:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## 3) Deploy op GitHub Pages
Zet alles in je repo (root) en deploy.
Open:
- `.../index.html` (TV)
- `.../admin.html` (Admin)

## 4) spotify_tracks velden
Deze set verwacht (minimaal) deze kolommen in `spotify_tracks`:
- `id` (uuid of int)
- `artist` (text)
- `title` (text)
- `release_year` (int)
- `spotify_url` (text, optioneel)
- `preview_url` (text, optioneel) — 5 sec mp3 preview
- `artist_image_url` (text, optioneel) — voor foto categorie

Als je kolomnamen anders zijn, pas ze aan in `admin.js` (select statement + mapping).

Veel plezier!
