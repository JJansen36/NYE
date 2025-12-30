// ================================
// Hoofdscherm: luistert realtime en toont:
// - Teamnamen & scores
// - Actieve categorie + vraag
// - Foto blur animatie (20s)
// - Audio preview (intro)
// - Antwoord (als show_answer = true)
// ================================
const el = (id) => document.getElementById(id);

const statusEl = el("status");
const catBadge = el("catBadge");
const questionText = el("questionText");
const answerBox = el("answerBox");
const metaText = el("metaText");

const team1Name = el("team1Name");
const team2Name = el("team2Name");
const team1Score = el("team1Score");
const team2Score = el("team2Score");

const mediaWrap = el("mediaWrap");
const artistPhoto = el("artistPhoto");
const audioEl = el("audio");

const audioOverlay = el("audioOverlay");
const enableAudioBtn = el("enableAudioBtn");

let audioEnabled = false;
let lastQuestionId = null;

function setStatus(msg){ statusEl.textContent = msg; }

function prettyCategory(cat){
  switch(cat){
    case "year": return "Jaartal";
    case "artist_title": return "Artiest - Titel";
    case "intro": return "Intro (5 sec)";
    case "photo": return "Foto (vaag → helder)";
    default: return "Geen vraag actief";
  }
}

function resetMedia(){
  mediaWrap.style.display = "none";
  artistPhoto.src = "";
  artistPhoto.classList.remove("reveal");
  audioEl.pause();
  audioEl.src = "";
}

async function loadTeams(){
  const { data, error } = await sb.from("quiz_teams").select("*").order("id");
  if(error){ console.error(error); setStatus("Teams laden mislukt"); return; }
  const t1 = data.find(x=>x.id===1) || data[0];
  const t2 = data.find(x=>x.id===2) || data[1];

  if(t1){ team1Name.textContent = t1.name || "Team 1"; team1Score.textContent = t1.score ?? 0; }
  if(t2){ team2Name.textContent = t2.name || "Team 2"; team2Score.textContent = t2.score ?? 0; }
}

async function loadStateAndQuestion(){
  const { data: state, error: e1 } = await sb.from("quiz_state").select("*").eq("id", 1).single();
  if(e1){ console.error(e1); setStatus("quiz_state ontbreekt"); return; }

  catBadge.textContent = prettyCategory(state.active_category);
  answerBox.classList.toggle("show", !!state.show_answer);

  if(!state.active_question_id){
    questionText.textContent = "Wacht op admin…";
    answerBox.textContent = "";
    metaText.textContent = "";
    resetMedia();
    return;
  }

  const { data: q, error: e2 } = await sb.from("quiz_questions").select("*, spotify_tracks(*)").eq("id", state.active_question_id).single();
  if(e2){ console.error(e2); setStatus("Vraag laden mislukt"); return; }

  // Only re-trigger media when question changes
  const questionChanged = (lastQuestionId !== q.id);
  lastQuestionId = q.id;

  questionText.textContent = q.question_text || "—";
  answerBox.textContent = q.correct_answer || "";

  const t = q.spotify_tracks || {};
  metaText.textContent = t.artist && t.title ? `${t.artist} — ${t.title}` : "";

  // Media
  resetMedia();

  if(state.active_category === "photo"){
    if(t.artist_image_url){
      mediaWrap.style.display = "block";
      artistPhoto.src = t.artist_image_url;
      // restart animation
      artistPhoto.classList.remove("reveal");
      // force reflow
      void artistPhoto.offsetWidth;
      artistPhoto.classList.add("reveal");
    }
  }

  if(state.active_category === "intro"){
    if(t.preview_url){
      mediaWrap.style.display = "block"; // shows audio element only (img empty)
      // Try play; if blocked show overlay once
      audioEl.src = t.preview_url;
      audioEl.currentTime = 0;

      if(questionChanged){
        await tryPlayIntro();
      }
    }
  }
}

async function tryPlayIntro(){
  if(!audioEnabled){
    audioOverlay.classList.add("show");
    return;
  }
  try{
    await audioEl.play();
  }catch(err){
    console.warn("Autoplay blocked:", err);
    audioOverlay.classList.add("show");
  }
}

enableAudioBtn.addEventListener("click", async ()=>{
  audioEnabled = true;
  audioOverlay.classList.remove("show");
  // small silent unlock
  try{
    audioEl.src = "";
    await audioEl.play();
  }catch(_){}
  // reload state to attempt playing if intro active
  loadStateAndQuestion();
});

function subscribeRealtime(){
  // Teams
  sb.channel("rt-quiz-teams")
    .on("postgres_changes", { event: "*", schema: "public", table: "quiz_teams" }, () => loadTeams())
    .subscribe((s)=> setStatus(s === "SUBSCRIBED" ? "Realtime verbonden ✅" : `Realtime: ${s}`));

  // State
  sb.channel("rt-quiz-state")
    .on("postgres_changes", { event: "*", schema: "public", table: "quiz_state" }, () => loadStateAndQuestion())
    .subscribe();

  // Questions
  sb.channel("rt-quiz-questions")
    .on("postgres_changes", { event: "*", schema: "public", table: "quiz_questions" }, () => loadStateAndQuestion())
    .subscribe();
}

(async function init(){
  setStatus("Laden…");
  await loadTeams();
  await loadStateAndQuestion();
  subscribeRealtime();
})();
