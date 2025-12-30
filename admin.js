// ================================
// Admin: selecteer categorie + random track -> maak vraag -> activeer
// + score updates + reset game
// ================================
const el = (id) => document.getElementById(id);
const statusEl = el("status");

const categoryEl = el("category");
const pickRandomBtn = el("pickRandom");
const activateBtn = el("activate");
const toggleAnswerBtn = el("toggleAnswer");
const clearQuestionBtn = el("clearQuestion");
const resetBtn = el("resetGame");

const trackTitleEl = el("trackTitle");
const trackMetaEl = el("trackMeta");
const previewQEl = el("previewQ");
const previewAEl = el("previewA");

const t1NameEl = el("t1Name");
const t2NameEl = el("t2Name");
const t1ScoreEl = el("t1Score");
const t2ScoreEl = el("t2Score");

let selectedTrack = null;
let currentState = null;
let currentQuestion = null;

function setStatus(msg){ statusEl.textContent = msg; }
function esc(s){ return (s ?? "").toString(); }

function buildQA(category, track){
  const artist = esc(track.artist);
  const title = esc(track.title);
  const year = track.release_year ?? track.year ?? null;

  switch(category){
    case "year":
      return {
        question_text: "🕰️ In welk jaar kwam dit nummer uit?",
        correct_answer: year ? `${year}` : "(geen jaartal in spotify_tracks)"
      };

    case "artist_title":
      return {
        question_text: "👤 Wat is artiest en titel?",
        correct_answer: artist && title ? `${artist} — ${title}` : "(artist/title ontbreekt)"
      };

    case "intro":
      return {
        question_text: "🎧 Intro (5 sec): welk nummer is dit?",
        correct_answer: artist && title ? `${artist} — ${title}` : "(artist/title ontbreekt)"
      };

    case "photo":
      return {
        question_text: "🖼️ Welke artiest is dit?",
        correct_answer: artist ? `${artist}` : "(artist ontbreekt)"
      };

    default:
      return { question_text: "—", correct_answer: "—" };
  }
}

async function loadTeams(){
  const { data, error } = await sb.from("quiz_teams").select("*").order("id");
  if(error){ console.error(error); setStatus("Teams laden mislukt"); return; }
  const t1 = data.find(x=>x.id===1) || data[0];
  const t2 = data.find(x=>x.id===2) || data[1];

  t1NameEl.value = t1?.name ?? "Team Links";
  t2NameEl.value = t2?.name ?? "Team Rechts";
  t1ScoreEl.value = t1?.score ?? 0;
  t2ScoreEl.value = t2?.score ?? 0;
}

async function loadState(){
  const { data, error } = await sb.from("quiz_state").select("*").eq("id",1).single();
  if(error){ console.error(error); setStatus("quiz_state ontbreekt"); return; }
  currentState = data;

  if(currentState.active_question_id){
    const { data: q, error: e2 } = await sb.from("quiz_questions").select("*, spotify_tracks(*)").eq("id", currentState.active_question_id).single();
    if(!e2) currentQuestion = q;
  }
}

function renderSelected(){
  if(!selectedTrack){
    trackTitleEl.textContent = "—";
    trackMetaEl.textContent = "—";
    previewQEl.textContent = "—";
    previewAEl.textContent = "—";
    return;
  }
  trackTitleEl.textContent = `${selectedTrack.artist ?? "?"} — ${selectedTrack.title ?? "?"}`;
  trackMetaEl.textContent =
    `jaar: ${selectedTrack.release_year ?? "—"} • preview: ${selectedTrack.preview_url ? "ja" : "nee"} • foto: ${selectedTrack.artist_image_url ? "ja" : "nee"}`;

  const qa = buildQA(categoryEl.value, selectedTrack);
  previewQEl.textContent = qa.question_text;
  previewAEl.textContent = qa.correct_answer;
}

categoryEl.addEventListener("change", renderSelected);

pickRandomBtn.addEventListener("click", async ()=>{
  setStatus("Random track laden…");

  // Random row: order by random() (prima voor kleine datasets)
  const { data, error } = await sb
    .from("spotify_tracks")
    .select("id, artist, title, release_year, spotify_url, preview_url, artist_image_url")
    .order("id", { ascending: false }) // stable baseline
    .limit(200);

  if(error){ console.error(error); setStatus("spotify_tracks laden mislukt"); return; }
  if(!data || data.length === 0){ setStatus("Geen spotify_tracks gevonden"); return; }

  selectedTrack = data[Math.floor(Math.random() * data.length)];
  renderSelected();
  setStatus("✅ Track gekozen");
});

activateBtn.addEventListener("click", async ()=>{
  if(!selectedTrack){ alert("Kies eerst een track (Random track)"); return; }

  const category = categoryEl.value;
  const qa = buildQA(category, selectedTrack);

  setStatus("Vraag maken…");

  // Maak nieuwe vraag
  const { data: q, error: e1 } = await sb.from("quiz_questions").insert({
    category,
    spotify_track_id: selectedTrack.id,
    question_text: qa.question_text,
    correct_answer: qa.correct_answer,
    is_active: true
  }).select("*").single();

  if(e1){ console.error(e1); setStatus("Vraag insert mislukt"); return; }

  // Update state
  const { error: e2 } = await sb.from("quiz_state").update({
    active_category: category,
    active_question_id: q.id,
    show_answer: false
  }).eq("id", 1);

  if(e2){ console.error(e2); setStatus("quiz_state update mislukt"); return; }

  currentQuestion = q;
  setStatus("✅ Vraag actief");
});

toggleAnswerBtn.addEventListener("click", async ()=>{
  await loadState();
  if(!currentState){ return; }

  const { error } = await sb.from("quiz_state").update({
    show_answer: !currentState.show_answer
  }).eq("id",1);

  if(error){ console.error(error); setStatus("toggle answer mislukt"); return; }
  setStatus("✅ Antwoord toggled");
});

clearQuestionBtn.addEventListener("click", async ()=>{
  // Maak state leeg, vraag laten staan (of verwijderen) — we verwijderen ook zodat het schoon blijft
  await loadState();

  if(currentState?.active_question_id){
    await sb.from("quiz_questions").delete().eq("id", currentState.active_question_id);
  }

  const { error } = await sb.from("quiz_state").update({
    active_category: null,
    active_question_id: null,
    show_answer: false
  }).eq("id",1);

  if(error){ console.error(error); setStatus("clear mislukt"); return; }
  setStatus("🧹 Leeg");
});

async function saveTeam(teamId){
  const name = teamId === 1 ? t1NameEl.value : t2NameEl.value;
  const score = teamId === 1 ? Number(t1ScoreEl.value||0) : Number(t2ScoreEl.value||0);

  const { error } = await sb.from("quiz_teams").update({ name, score }).eq("id", teamId);
  if(error){ console.error(error); setStatus("team save mislukt"); return; }
  setStatus("💾 Team opgeslagen");
}

document.querySelectorAll("[data-delta]").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const team = Number(btn.dataset.team);
    const delta = Number(btn.dataset.delta);

    const input = team === 1 ? t1ScoreEl : t2ScoreEl;
    input.value = Number(input.value || 0) + delta;
  });
});

document.querySelectorAll("[data-save]").forEach(btn=>{
  btn.addEventListener("click", ()=> saveTeam(Number(btn.dataset.save)));
});

// Reset game (client-side; vereist open policies)
resetBtn.addEventListener("click", async ()=>{
  if(!confirm("Reset game? Scores naar 0 en actieve vraag weg.")) return;
  setStatus("Resetten…");

  // delete vragen
  const { error: e1 } = await sb.from("quiz_questions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if(e1){ console.warn("quiz_questions delete:", e1); }

  // scores 0
  await sb.from("quiz_teams").update({ score: 0 }).in("id", [1,2]);

  // state leeg
  await sb.from("quiz_state").update({
    active_category: null,
    active_question_id: null,
    show_answer: false
  }).eq("id",1);

  await loadTeams();
  setStatus("✅ Reset klaar");
});

// Realtime: houd scores up-to-date als iemand anders admin open heeft
sb.channel("rt-admin-teams")
  .on("postgres_changes", { event: "*", schema: "public", table: "quiz_teams" }, loadTeams)
  .subscribe((s)=> setStatus(s === "SUBSCRIBED" ? "Realtime verbonden ✅" : `Realtime: ${s}`));

// Sneltoetsen
document.addEventListener("keydown", async (e)=>{
  const k = e.key.toLowerCase();
  if(k === "1"){ t1ScoreEl.value = Number(t1ScoreEl.value||0) + 1; await saveTeam(1); }
  if(k === "2"){ t2ScoreEl.value = Number(t2ScoreEl.value||0) + 1; await saveTeam(2); }
  if(k === "a"){ toggleAnswerBtn.click(); }
});

(async function init(){
  setStatus("Laden…");
  await loadTeams();
  await loadState();
  renderSelected();
  setStatus("Klaar ✅");
})();
