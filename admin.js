// ===============================
// SUPABASE
// ===============================
import { sb } from "./supabase.js";

// ===============================
// HELPERS
// ===============================
function extractSpotifyTrackId(code) {
  if (!code) return null;
  const match = code.match(/track\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

// ===============================
// STATE
// ===============================
let lastScanPerTeam = {};
let activeTeamId = null;
let activeCategory = "year";

// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", init);

async function init() {
  console.log("🟢 Admin init");

  await loadLastScans();
  bindUI();
}

// ===============================
// LOAD LAST SCANS PER TEAM
// ===============================
async function loadLastScans() {
  console.log("📥 Laden laatste scans per team...");

  const { data, error } = await sb
    .from("scan_events")
    .select("id, team_id, code, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ scan_events fout", error);
    return;
  }

  // laatste scan per team bepalen
  data.forEach(scan => {
    if (!lastScanPerTeam[scan.team_id]) {
      lastScanPerTeam[scan.team_id] = scan;
    }
  });

  console.log("✅ Laatste scans:", lastScanPerTeam);

  // standaard team kiezen
  activeTeamId = Object.keys(lastScanPerTeam)[0] || null;

  renderScanInfo();
}

// ===============================
// RENDER INFO
// ===============================
async function renderScanInfo() {
  if (!activeTeamId) {
    console.warn("⚠️ Geen actieve teamscan");
    return;
  }

  const scan = lastScanPerTeam[activeTeamId];
  const trackId = extractSpotifyTrackId(scan.code);

  console.log("🎵 Actieve scan:", scan);
  console.log("🎯 Track ID:", trackId);

  if (!trackId) {
    console.warn("❌ Geen track ID uit code");
    return;
  }

  const { data: track, error } = await sb
    .from("spotify_tracks")
    .select(`
      id,
      title,
      artist,
      artists,
      release_year,
      preview_url,
      image_url,
      track_id
    `)
    .eq("track_id", trackId)
    .single();

  if (error) {
    console.error("❌ spotify_tracks lookup fout", error);
    return;
  }

  console.log("✅ Gekoppelde track:", track);

  // ---- HIER KUN JE LATER UI VULLEN ----
  // Voor nu alleen console (bewust)
}

// ===============================
// UI BINDINGS
// ===============================
function bindUI() {
  const categorySelect = document.getElementById("categorySelect");
  if (categorySelect) {
    categorySelect.addEventListener("change", e => {
      activeCategory = e.target.value;
      console.log("📂 Categorie:", activeCategory);
    });
  }

  const teamButtons = document.querySelectorAll("[data-team]");
  teamButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      activeTeamId = btn.dataset.team;
      console.log("👥 Actief team:", activeTeamId);
      renderScanInfo();
    });
  });

  const activateBtn = document.getElementById("activateQuestion");
  if (activateBtn) {
    activateBtn.addEventListener("click", activateQuestion);
  }
}

// ===============================
// ACTIVATE QUESTION (STATE)
// ===============================
async function activateQuestion() {
  if (!activeTeamId) {
    alert("Geen team geselecteerd");
    return;
  }

  const scan = lastScanPerTeam[activeTeamId];

  const { error } = await sb
    .from("quiz_state")
    .update({
      active_team_id: activeTeamId,
      active_category: activeCategory,
      active_scan_event_id: scan.id,
      show_answer: false
    })
    .eq("id", 1);

  if (error) {
    console.error("❌ quiz_state update fout", error);
    return;
  }

  console.log("🚀 Vraag geactiveerd", {
    team: activeTeamId,
    category: activeCategory,
    scan: scan.id
  });
}
