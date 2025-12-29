import { sb } from './supabaseClient.js';
import { qs, setStatus, asToken } from './utils.js';

let teamId = null;
let gameId = null;
let html5QrCode = null;

// ==========================
// ELEMENTEN
// ==========================
const el = {
  status: document.getElementById('status'),
  teamLabel: document.getElementById('teamLabel'),
  gameLabel: document.getElementById('gameLabel'),

  btnStartQR: document.getElementById('btnStartQR'),
  btnStopQR: document.getElementById('btnStopQR'),
  qrBox: document.getElementById('qrBox'),
  qrReader: document.getElementById('qrReader'),

  tokenInput: document.getElementById('tokenInput'),
  btnUse: document.getElementById('btnUse'),
  usedNote: document.getElementById('usedNote'),

  answerInput: document.getElementById('answerInput'),

  qCategory: document.getElementById('qCategory'),
  qText: document.getElementById('qText'),
  qMedia: document.getElementById('qMedia'),
};

// ==========================
// INIT
// ==========================
document.addEventListener('DOMContentLoaded', init);

function init() {
  console.log('team.js loaded');

  teamId = qs('team');
  gameId = qs('game');

  if (!teamId || !gameId) {
    setStatus(el.status, 'Missing team of game in URL', 'bad');
    return;
  }

  el.teamLabel.textContent = `Team ${teamId}`;
  el.gameLabel.textContent = gameId;

  bindEvents();
  subscribeToCurrentQuestion();

  // auto token uit URL
  const urlToken = qs('token');
  if (urlToken) {
    useToken(urlToken);
  }

  setStatus(el.status, 'Klaar om te scannen of token te plakken');
}

// ==========================
// EVENTS
// ==========================
function bindEvents() {
  if (el.btnStartQR) {
    el.btnStartQR.type = 'button';
    el.btnStartQR.disabled = false;
    el.btnStartQR.onclick = () => {
      console.log('Start camera clicked');
      startQR();
    };
  }

  if (el.btnStopQR) {
    el.btnStopQR.type = 'button';
    el.btnStopQR.onclick = stopQR;
  }

  if (el.btnUse) {
    el.btnUse.type = 'button';
    el.btnUse.onclick = () => {
      const t = asToken(el.tokenInput.value);
      if (t) useToken(t);
    };
  }
}

// ==========================
// QR SCANNER
// ==========================
async function startQR() {
  if (!window.Html5Qrcode) {
    setStatus(el.status, 'QR library niet geladen', 'bad');
    return;
  }

  try {
    if (html5QrCode) {
      await html5QrCode.stop().catch(() => {});
    }

    html5QrCode = new Html5Qrcode('qrReader');

    const cameras = await Html5Qrcode.getCameras();
    console.log('Cameras:', cameras);

    let cam = cameras.find(c =>
      /back|rear|environment/i.test(c.label)
    );

    if (!cam) cam = cameras[cameras.length - 1];

    console.log('Gekozen camera:', cam);

    await html5QrCode.start(
      { deviceId: { exact: cam.id } },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      },
      onScanSuccess,
      () => {}
    );

    el.qrBox.classList.remove('hidden');
    el.btnStartQR.disabled = true;
    el.btnStopQR.disabled = false;

    setStatus(el.status, 'Camera actief – scan een QR');

  } catch (err) {
    console.error(err);
    setStatus(el.status, 'Camera kon niet starten', 'bad');
  }
}

async function stopQR() {
  if (!html5QrCode) return;
  await html5QrCode.stop().catch(() => {});
  html5QrCode = null;

  el.btnStartQR.disabled = false;
  el.btnStopQR.disabled = true;

  setStatus(el.status, 'Camera gestopt');
}

function onScanSuccess(decodedText) {
  console.log('QR scanned:', decodedText);
  stopQR();
  useToken(decodedText);
}

// ==========================
// TOKEN GEBRUIKEN
// ==========================
async function useToken(raw) {
  const token = asToken(raw);
  if (!token) return;

  setStatus(el.status, 'Token verwerken…');

  const { error } = await sb.rpc('rpc_team_use_token', {
    p_game_id: gameId,
    p_team_id: Number(teamId),
    p_token: token,
    p_answer: el.answerInput?.value || null
  });

  if (error) {
    console.error(error);
    setStatus(el.status, error.message, 'bad');
    return;
  }

  el.usedNote.textContent = `Laatste token: ${token}`;
  el.tokenInput.value = '';

  setStatus(el.status, 'Token geaccepteerd ✔');
}

// ==========================
// REALTIME VRAAG
// ==========================
function subscribeToCurrentQuestion() {
  sb.channel(`team_game_${gameId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`
      },
      async payload => {
        const qid = payload.new.current_question_id;
        if (!qid) return;

        const { data: q } = await sb
          .from('questions')
          .select('question_text, media_url, categories(name, icon)')
          .eq('id', qid)
          .single();

        if (!q) return;

        el.qCategory.textContent =
          `${q.categories?.icon || ''} ${q.categories?.name || ''}`.trim();

        el.qText.textContent = q.question_text;
        renderMedia(q.media_url);
      }
    )
    .subscribe();
}

function renderMedia(url) {
  el.qMedia.innerHTML = '';
  if (!url) return;

  if (url.includes('spotify')) {
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.allow = 'autoplay; encrypted-media';
    el.qMedia.appendChild(iframe);
  } else if (url.match(/\.(jpg|png|jpeg|webp)$/i)) {
    const img = document.createElement('img');
    img.src = url;
    el.qMedia.appendChild(img);
  }
}
