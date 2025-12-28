const scanner = new Html5Qrcode("scanner");

const config = {
  fps: 10,
  qrbox: { width: 250, height: 250 }
};

scanner.start(
  { facingMode: "environment" },
  config,
  (decodedText) => {
    scanner.stop();

    // Kleine NYE-delay voor effect
    setTimeout(() => {
      window.location.href = decodedText;
    }, 600);
  },
  (error) => {
    // bewust leeg (scans geven veel ruis)
  }
);
