-- ================================
-- Spotify Quiz schema (simpel, 2 teams)
-- ================================

-- quiz_teams
create table if not exists public.quiz_teams (
  id int primary key,
  name text not null default 'Team',
  score int not null default 0
);

-- quiz_questions
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  spotify_track_id uuid,
  question_text text,
  correct_answer text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- quiz_state (1 rij)
create table if not exists public.quiz_state (
  id int primary key,
  active_category text,
  active_question_id uuid references public.quiz_questions(id) on delete set null,
  show_answer boolean not null default false
);

-- FK naar spotify_tracks:
-- Let op: dit is optioneel, omdat jouw spotify_tracks soms int/uuid kan zijn.
-- Als jouw spotify_tracks.id UUID is, kun je deze FK aanzetten:
-- alter table public.quiz_questions
--   add constraint quiz_questions_track_fk
--   foreign key (spotify_track_id) references public.spotify_tracks(id);

-- ================================
-- Realtime (optioneel)
-- ================================
alter publication supabase_realtime add table public.quiz_teams;
alter publication supabase_realtime add table public.quiz_questions;
alter publication supabase_realtime add table public.quiz_state;

-- ================================
-- RLS policies (OPEN zodat GitHub Pages zonder login werkt)
-- ⚠️ Niet veilig voor internet buiten je feestje.
-- ================================
alter table public.quiz_teams enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_state enable row level security;

-- Public read
create policy "public read teams" on public.quiz_teams
  for select using (true);

create policy "public read questions" on public.quiz_questions
  for select using (true);

create policy "public read state" on public.quiz_state
  for select using (true);

-- Public write (admin zonder login)
create policy "public update teams" on public.quiz_teams
  for update using (true) with check (true);

create policy "public insert questions" on public.quiz_questions
  for insert with check (true);

create policy "public delete questions" on public.quiz_questions
  for delete using (true);

create policy "public update state" on public.quiz_state
  for update using (true) with check (true);

create policy "public insert state" on public.quiz_state
  for insert with check (true);
