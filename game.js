const params = new URLSearchParams(window.location.search);
const trackId = params.get("track");

const iframe = document.getElementById("spotifyPlayer");
const revealBtn = document.getElementById("revealBtn");
const answerBox = document.getElementById("answer");
const kidsToggle = document.getElementById("kidsToggle");

// Demo data (later automatisch)
const demoMeta = {
  artist: "Onbekende artiest",
  title: "Onbekend nummer",
  year: "????"
};

let kidsMode = false;

// Spotify embed laden
if (iframe && trackId) {
  iframe.src = `https://open.spotify.com/embed/track/${trackId}`;
}

// Reveal knop
if (revealBtn) {
  revealBtn.addEventListener("click", () => {
    document.getElementById("artist").innerText = demoMeta.artist;
    document.getElementById("title").innerText  = demoMeta.title;
    document.getElementById("year").innerText   =
      kidsMode ? "± " + demoMeta.year : demoMeta.year;

    answerBox.classList.remove("hidden");
  });
}

// Kids-modus knop
if (kidsToggle) {
  kidsToggle.addEventListener("click", () => {
    kidsMode = !kidsMode;
    alert(kidsMode ? "Kids-modus AAN (±2 jaar)" : "Kids-modus UIT");
  });
}
