import { sb, requireConfig } from './supabaseClient.js';
import { qs, setStatus, prettyUUID, asToken } from './utils.js';
import { AUTO_START_QR } from './config.js';

let gameId = null;
let teamId = null;
let qr = null;

const el = {
  status: document.getElementById('status'),
  teamLabel: document.getElementById('teamLabel'),
  gameLabel: document.getElementById('gameLabel'),
  tokenInput: document.getElementById('tokenInput'),
  answerInput: document.getElementById('answerInput'),
  btnUse: document.getElementById('btnUse'),
  btnStartQR: document.getElementById('btnStartQR'),
  btnStopQR: document.getElementById('btnStopQR'),
  qrBox: document.getElementById('qrBox'),
  qrStatus: document.getElementById('qrStatus'),
  qCategory: document.getElementById('qCategory'),
  qText: document.getElementById('qText'),
  qMedia: document.getElementById('qMedia'),
  usedNote: document.getElementById('usedNote'),
};

function must(val, name) {
  if (!val) throw new Error(`Missing ${name} in URL (tip: ?team=1&game=... )`);
  return val;
}

async function init() {
  try {
    requireConfig();

    teamId = parseInt(must(qs('team'), 'team'), 10);
    gameId = must(qs('game'), 'game');

    el.teamLabel.textContent = `Team ${teamId}`;
    el.gameLabel.textContent = prettyUUID(gameId);

    // if token already in URL: auto use
    const t = qs('token');
    if (t) {
      el.tokenInput.value = asToken(t);
      await useToken();
    }

    el.btnUse.addEventListener('click', useToken);
    el.btnStartQR.addEventListener('click', startQR);
    el.btnStopQR.addEventListener('click', stopQR);

    if (AUTO_START_QR) startQR();

    setStatus(el.status, 'Klaar — scan een QR of plak een token.', '');
  } catch (e) {
    console.error(e);
    setStatus(el.status, e.message || String(e), 'bad');
  }
}

function renderMedia(url) {
  el.qMedia.innerHTML = '';
  if (!url) return;

  // Spotify embed if it looks like spotify:track or open.spotify.com
  if (url.startsWith('spotify:track:')) {
    const id = url.split(':').pop();
    const iframe = document.createElement('iframe');
    iframe.src = `https://open.spotify.com/embed/track/${id}`;
    iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    iframe.loading = 'lazy';
    iframe.style.width = '100%';
    iframe.style.height = '152px';
    iframe.style.border = '0';
    el.qMedia.appendChild(iframe);
    return;
  }

  if (url.includes('open.spotify.com/track/')) {
    const trackId = url.split('/track/')[1]?.split('?')[0];
    if (trackId) {
      const iframe = document.createElement('iframe');
      iframe.src = `https://open.spotify.com/embed/track/${trackId}`;
      iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      iframe.loading = 'lazy';
      iframe.style.width = '100%';
      iframe.style.height = '152px';
      iframe.style.border = '0';
      el.qMedia.appendChild(iframe);
      return;
    }
  }

  // otherwise treat as image/url
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  a.textContent = url;
  a.className = 'link';

  // if image-ish, show preview
  if (url.match(/\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i)) {
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'media';
    img.className = 'media-img';
    el.qMedia.appendChild(img);
  } else {
    el.qMedia.appendChild(a);
  }
}

async function useToken() {
  try {
    const token = asToken(el.tokenInput.value);
    if (!token) {
      setStatus(el.status, 'Plak een token of scan een QR.', 'bad');
      return;
    }

    setStatus(el.status, 'Token verwerken…', '');
    el.usedNote.textContent = '';

    const answerText = (el.answerInput.value || '').trim() || null;

    const { data, error } = await sb.rpc('rpc_team_use_token', {
      p_game_id: gameId,
      p_team_id: teamId,
      p_token: token,
      p_answer_text: answerText,
    });

    if (error) throw error;

    if (!data?.ok) {
      setStatus(el.status, 'Deze QR is in dit spel al gebruikt. (Admin kan resetten)', 'bad');
      el.usedNote.textContent = `Token gebruikt: ${token}`;
    } else {
      setStatus(el.status, 'Vraag geopend op hoofdscherm ✅', 'good');
    }

    // fetch question and render
    const qid = data?.question_id;
    if (qid) {
      const { data: q, error: qErr } = await sb
        .from('questions')
        .select('id, question_text, media_url, duration_sec, categories(name, icon)')
        .eq('id', qid)
        .single();

      if (qErr) throw qErr;

      const icon = q.categories?.icon || '';
      const name = q.categories?.name || '';
      el.qCategory.textContent = `${icon} ${name}`.trim();
      el.qText.textContent = q.question_text;
      renderMedia(q.media_url);
    }

    // stop scanner after successful scan
    if (qr) stopQR();
  } catch (e) {
    console.error(e);
    setStatus(el.status, e.message || String(e), 'bad');
  }
}

async function startQR() {
  if (!window.Html5Qrcode) {
    setStatus(el.status, 'QR scanner niet beschikbaar', 'bad');
    return;
  }

  if (html5QrCode) {
    await html5QrCode.stop().catch(() => {});
  }

  html5QrCode = new Html5Qrcode("qrReader");

  const config = {
    fps: 10,
    qrbox: { width: 250, height: 250 }
  };

  try {
    const cameras = await Html5Qrcode.getCameras();

    // probeer achtercamera te vinden
    const backCam =
      cameras.find(c => /back|rear|environment/i.test(c.label)) ||
      cameras[cameras.length - 1]; // fallback: laatste camera

    console.log('Gekozen camera:', backCam);

    await html5QrCode.start(
      { deviceId: { exact: backCam.id } }, // ⬅️ DEVICE-ID
      config,
      onScanSuccess,
      onScanFailure
    );

    el.qrBox.classList.remove('hidden');
    el.btnStartQR.disabled = true;
    el.btnStopQR.disabled = false;

  } catch (err) {
    console.error('Camera start mislukt', err);
    setStatus(el.status, 'Camera niet beschikbaar', 'bad');
  }
}



async function stopQR() {
  try {
    if (qr) {
      const state = qr.getState?.();
      if (state === 2 || state === 'SCANNING') {
        await qr.stop();
      }
      await qr.clear();
    }
  } catch (_) {}

  el.qrBox.classList.add('hidden');
  el.qrStatus.textContent = '';
}

init();

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
