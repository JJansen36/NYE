// ===============================
// ADMIN.JS — Spotify Quiz
// Werkt met GLOBAL Supabase (window.sb)
// ===============================

const sb = window.sb;
console.log("🛠️ admin.js gestart", sb);

// -------------------------------
// Helpers
// -------------------------------
const $ = id => document.getElementById(id);

function extractTrackId(code) {
  if (!code) return null;
  const m = code.match(/track\/([a-zA-Z0-9]+)/);
  return m ? m[1] : null;
}

// -------------------------------
// State
// -------------------------------
let lastScanPerTeam = {};
let activeTeamId = null;

// -------------------------------
// Init
// -------------------------------
document.addEventListener("DOMContentLoaded", init);

async function init() {
  await loadTeams();
  await loadLastScans();
  bindUI();
  $("status").textContent = "Verbonden ✅";
}

// -------------------------------
// Teams laden
// -------------------------------
async function loadTeams() {
  const { data } = await sb.from("quiz_teams").select("*").order("id");
  if (!data) return;

  const t1 = data.find(t => t.id === 1);
  const t2 = data.find(t => t.id === 2);

  if (t1) {
    $("t1Name").value = t1.name ?? "";
    $("t1Score").value = t1.score ?? 0;
  }

  if (t2) {
    $("t2Name").value = t2.name ?? "";
    $("t2Score").value = t2.score ?? 0;
  }
}

// -------------------------------
// Laatste scans ophalen
// -------------------------------
async function loadLastScans() {
  const { data } = await sb
    .from("scan_events")
    .select("*")
    .order("created_at", { ascending: false });

  lastScanPerTeam = {};
  data.forEach(scan => {
    if (!lastScanPerTeam[scan.team_id]) {
      lastScanPerTeam[scan.team_id] = scan;
    }
  });

  activeTeamId = Object.keys(lastScanPerTeam)[0] ?? null;
  renderTrackPreview();
}

// -------------------------------
// Track preview
// -------------------------------
async function renderTrackPreview() {
  if (!activeTeamId) return;

  const scan = lastScanPerTeam[activeTeamId];
  const trackId = extractTrackId(scan.code);
  if (!trackId) return;

  const { data: track } = await sb
    .from("spotify_tracks")
    .select("*")
    .eq("track_id", trackId)
    .single();

  if (!track) return;

  $("trackTitle").textContent = track.title;
  $("trackMeta").textContent = track.artist;

  const cat = $("category").value;
  $("previewQ").textContent =
    cat === "year" ? "In welk jaar kwam dit nummer uit?"
    : cat === "artist_title" ? "Wie is de artiest en titel?"
    : cat === "intro" ? "Welk nummer hoor je?"
    : "Welke artiest is dit?";

  $("previewA").textContent =
    cat === "year" ? track.release_year
    : `${track.artist} — ${track.title}`;
}

// -------------------------------
// Vraag activeren
// -------------------------------
async function activateQuestion() {
  const category = categorySelect.value;

  if (!category) {
    alert("Kies eerst een categorie");
    return;
  }

  await sb
    .from("quiz_state")
    .update({
      pending_category: category,
      show_answer: false
    })
    .eq("id", 1);

  alert("Categorie klaar! Laat nu scannen.");
}


// -------------------------------
// UI bindings
// -------------------------------
function bindUI() {
  $("activate").onclick = activateQuestion;

  $("toggleAnswer").onclick = async () => {
    const { data } = await sb.from("quiz_state").select("show_answer").eq("id", 1).single();
    await sb.from("quiz_state").update({ show_answer: !data.show_answer }).eq("id", 1);
  };

  $("clearQuestion").onclick = async () => {
    await sb
      .from("quiz_state")
      .update({
        active_category: null,
        active_scan_event_id: null,
        pending_category: null,
        show_answer: false
      })
      .eq("id", 1);

  };

  document.querySelectorAll("[data-team]").forEach(btn => {
    btn.onclick = () => {
      activeTeamId = btn.dataset.team;
      renderTrackPreview();
    };
  });

  document.querySelectorAll("[data-save]").forEach(btn => {
    btn.onclick = async () => {
      const id = Number(btn.dataset.save);
      const name = $(id === 1 ? "t1Name" : "t2Name").value;
      const score = Number($(id === 1 ? "t1Score" : "t2Score").value);

      await sb.from("quiz_teams").update({ name, score }).eq("id", id);
    };
  });
}
