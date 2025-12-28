const params = new URLSearchParams(window.location.search);
const trackUrl = params.get("track");

const playBtn   = document.getElementById("playBtn");
const revealBtn = document.getElementById("revealBtn");
const answerBox = document.getElementById("answer");

let kidsMode = false;

// DEMO DATA (wordt later automatisch gevuld)
const demoMeta = {
  artist: "Onbekende artiest",
  title: "Onbekend nummer",
  year: "????"
};

// Start nummer
playBtn.addEventListener("click", () => {
  if (!trackUrl) {
    alert("Geen track gevonden");
    return;
  }
  window.open(trackUrl, "_blank");
});

// Toon antwoord
revealBtn.addEventListener("click", () => {
  document.getElementById("artist").innerText = demoMeta.artist;
  document.getElementById("title").innerText  = demoMeta.title;
  document.getElementById("year").innerText   = kidsMode ? "± " + demoMeta.year : demoMeta.year;
  answerBox.classList.remove("hidden");
});

// Kids-modus
document.getElementById("kidsToggle").addEventListener("click", () => {
  kidsMode = !kidsMode;
  alert(kidsMode ? "Kids-modus AAN (±2 jaar)" : "Kids-modus UIT");
});
