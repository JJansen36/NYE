// main.js
const sb = window.sb;
console.log("📺 main.js gestart", sb);

// DOM helpers
const el = id => document.getElementById(id);

const statusEl = el("status");
const catBadge = el("catBadge");
const questionText = el("questionText");
const answerBox = el("answerBox");
const metaText = el("metaText");

const team1Score = el("team1Score");
const team2Score = el("team2Score");

const mediaWrap = el("mediaWrap");
const artistPhoto = el("artistPhoto");
const audioEl = el("audio");

function setStatus(t){ statusEl.textContent = t; }

function extractTrackId(url){
  const m = url?.match(/track\/([a-zA-Z0-9]+)/);
  return m ? m[1] : null;
}

function prettyCategory(cat){
  switch(cat){
    case "year": return "Jaartal";
    case "artist_title": return "Artiest - Titel";
    case "intro": return "Intro";
    case "photo": return "Foto (vaag → helder)";
    default: return "Geen vraag actief";
  }
}

function resetMedia(){
  mediaWrap.style.display = "none";
  artistPhoto.src = "";
  audioEl.pause();
  audioEl.src = "";
}

async function loadTeams(){
  const { data } = await sb.from("quiz_teams").select("*").order("id");
  if(!data) return;

  const t1 = data.find(t=>t.id===1);
  const t2 = data.find(t=>t.id===2);

  if(t1) team1Score.textContent = t1.score ?? 0;
  if(t2) team2Score.textContent = t2.score ?? 0;
}

async function loadState(){
  const { data: state } = await sb
    .from("quiz_state")
    .select("*")
    .eq("id", 1)
    .single();

  if(!state){
    setStatus("Geen quiz_state");
    return;
  }

  catBadge.textContent = prettyCategory(state.active_category);

  if(!state.active_scan_event_id){
    questionText.textContent = "Wacht op admin…";
    answerBox.textContent = "";
    metaText.textContent = "";
    resetMedia();
    return;
  }

  // Scan ophalen
  const { data: scan } = await sb
    .from("scan_events")
    .select("*")
    .eq("id", state.active_scan_event_id)
    .single();

  if(!scan) return;

  const trackId = extractTrackId(scan.code);
  if(!trackId) return;

  // Spotify track ophalen
  const { data: track } = await sb
    .from("spotify_tracks")
    .select("*")
    .eq("track_id", trackId)
    .single();

  if(!track) return;

  // Vraagtekst
  switch(state.active_category){
    case "year":
      questionText.textContent = "In welk jaar kwam dit nummer uit?";
      answerBox.textContent = track.release_year ?? "";
      break;

    case "artist_title":
      questionText.textContent = "Wie is de artiest en titel?";
      answerBox.textContent = `${track.artist} — ${track.title}`;
      break;

    case "intro":
      questionText.textContent = "Welk nummer hoor je?";
      answerBox.textContent = `${track.artist} — ${track.title}`;
      resetMedia();
      if(track.preview_url){
        mediaWrap.style.display = "block";
        audioEl.src = track.preview_url;
        audioEl.play().catch(()=>{});
      }
      break;

    case "photo":
      questionText.textContent = "Welke artiest is dit?";
      answerBox.textContent = track.artist;
      resetMedia();
      if(track.image_url){
        mediaWrap.style.display = "block";
        artistPhoto.src = track.image_url;
      }
      break;
  }

  metaText.textContent = `${track.artist} — ${track.title}`;
  answerBox.style.visibility = state.show_answer ? "visible" : "hidden";
}

function subscribeRealtime(){
  sb.channel("rt-state")
    .on("postgres_changes", { event:"*", schema:"public", table:"quiz_state" }, loadState)
    .subscribe();

  sb.channel("rt-teams")
    .on("postgres_changes", { event:"*", schema:"public", table:"quiz_teams" }, loadTeams)
    .subscribe();

  setStatus("Realtime verbonden ✅");
}

// INIT
(async function init(){
  setStatus("Laden…");
  await loadTeams();
  await loadState();
  subscribeRealtime();
})();
