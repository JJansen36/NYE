const params = new URLSearchParams(window.location.search);
const trackId = params.get("track");

const iframe = document.getElementById("spotifyPlayer");
const overlay = document.getElementById("blindOverlay");
const answerBox = document.getElementById("answer");

let kidsMode = false;

// Spotify embed laden
if (trackId) {
  iframe.src = `https://open.spotify.com/embed/track/${trackId}`;
}

// DEMO DATA (wordt later automatisch gevuld)
const demoMeta = {
  artist: "Onbekende artiest",
  title: "Onbekend nummer",
  year: "????"
};


// Toon antwoord
revealBtn.addEventListener("click", () => {
  overlay.style.display = "none";

  document.getElementById("artist").innerText = demoMeta.artist;
  document.getElementById("title").innerText  = demoMeta.title;
  document.getElementById("year").innerText   =
    kidsMode ? "± " + demoMeta.year : demoMeta.year;

  answerBox.classList.remove("hidden");
});

// Kids-modus
document.getElementById("kidsToggle").addEventListener("click", () => {
  kidsMode = !kidsMode;
  alert(kidsMode ? "Kids-modus AAN (±2 jaar)" : "Kids-modus UIT");
});
