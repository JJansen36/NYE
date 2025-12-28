const params = new URLSearchParams(window.location.search);
const trackId = params.get("track");

const iframe = document.getElementById("spotifyPlayer");
const revealBtn = document.getElementById("revealBtn");
const answerBox = document.getElementById("answer");
const kidsToggle = document.getElementById("kidsToggle");

// Dummy metadata (later vervangbaar)
const demoMeta = {
  artist: "Onbekende artiest",
  title: "Onbekend nummer",
  year: "????"
};

let kidsMode = false;

// Spotify embed laden
if (trackId && iframe) {
  iframe.src = `https://open.spotify.com/embed/track/${trackId}`;
}

// Reveal antwoord
revealBtn?.addEventListener("click", () => {
  document.getElementById("artist").innerText = demoMeta.artist;
  document.getElementById("title").innerText = demoMeta.title;
  document.getElementById("year").innerText =
    kidsMode ? "± " + demoMeta.year : demoMeta.year;

  answerBox.classList.remove("hidden");
});

// Kids-modus
kidsToggle?.addEventListener("click", () => {
  kidsMode = !kidsMode;
  alert(kidsMode ? "Kids-modus AAN (±2 jaar)" : "Kids-modus UIT");
});
