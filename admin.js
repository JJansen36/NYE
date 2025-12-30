// ===============================
// ADMIN.JS — Spotify Quiz (Optie B)
// ===============================

const sb = window.sb;
console.log("🛠️ admin.js gestart", sb);

// -------------------------------
// Helpers
// -------------------------------
const $ = id => document.getElementById(id);
const categorySelect = $("category");

// -------------------------------
// Init
// -------------------------------
document.addEventListener("DOMContentLoaded", init);

async function init() {
  await loadTeams();
  bindUI();
  listenForScans();
  $("status").textContent = "Verbonden ✅";
}


// -------------------------------
// Teams laden (alleen naam + score)
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
// Vraag activeren (Optie B)
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
    const { data } = await sb
      .from("quiz_state")
      .select("show_answer")
      .eq("id", 1)
      .single();

    await sb
      .from("quiz_state")
      .update({ show_answer: !data.show_answer })
      .eq("id", 1);
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

  document.querySelectorAll("[data-save]").forEach(btn => {
    btn.onclick = async () => {
      const id = Number(btn.dataset.save);
      const name = $(id === 1 ? "t1Name" : "t2Name").value;
      const score = Number($(id === 1 ? "t1Score" : "t2Score").value);

      await sb.from("quiz_teams").update({ name, score }).eq("id", id);
    };
  });
}
async function ensureSpotifyTrackForScan(scan) {
  if (!scan?.code) return;

  // 1. Bestaat deze track al?
  const { data: existing } = await sb
    .from("spotify_tracks")
    .select("id")
    .eq("code", scan.code)
    .maybeSingle();

  if (existing) {
    console.log("🎵 Spotify track bestaat al");
    return;
  }

  console.log("🎧 Spotify track ophalen...");

  // 2. Spotify metadata ophalen
  // ⚠️ Dit gebruikt dezelfde setup die je EERDER al had
  const res = await fetch(
    `/spotify/track?url=${encodeURIComponent(scan.code)}`
  );

  if (!res.ok) {
    console.error("Spotify fetch faalde");
    return;
  }

  const track = await res.json();

  // 3. Opslaan in spotify_tracks
  await sb.from("spotify_tracks").insert({
    code: scan.code,
    title: track.title,
    artists: track.artists?.join(", "),
    release_year: track.year,
    image_url: track.image
  });

  console.log("✅ Spotify track opgeslagen");
}
function listenForScans() {
  console.log("👂 Luisteren naar nieuwe scans...");

  sb.channel("scan-events-admin")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "scan_events"
      },
      async payload => {
        const scan = payload.new;
        console.log("📸 Nieuwe scan ontvangen:", scan);

        await ensureSpotifyTrackForScan(scan);
      }
    )
    .subscribe();
}
