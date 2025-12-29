import { sb, requireConfig } from './supabaseClient.js';
import { qs, setStatus, prettyUUID } from './utils.js';

let gameId = null;
let subscriptions = [];

const el = {
  status: document.getElementById('status'),
  gameSelect: document.getElementById('gameSelect'),
  btnUseGame: document.getElementById('btnUseGame'),
  team1Name: document.getElementById('team1Name'),
  team2Name: document.getElementById('team2Name'),
  score1: document.getElementById('team1Score'),
  score2: document.getElementById('team2Score'),
  cat: document.getElementById('catPill'),
  question: document.getElementById('questionText'),
  media: document.getElementById('mediaUrl'),
};


async function loadGamesList() {
  const { data, error } = await sb.from('games').select('id, created_at, status').order('created_at', { ascending: false }).limit(30);
  if (error) throw error;
  el.gameSelect.innerHTML = '';
  data.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = `${prettyUUID(g.id)} — ${new Date(g.created_at).toLocaleString()} (${g.status})`;
    el.gameSelect.appendChild(opt);
  });
}

async function resolveGameId() {
  const q = qs('game');
  if (q) return q;
  // fallback: app_state.active_game_id
  const { data, error } = await sb.from('app_state').select('active_game_id').eq('id', 1).single();
  if (error) throw error;
  return data?.active_game_id || null;
}

async function loadTeams() {
  const { data, error } = await sb.from('teams').select('id,name').order('id');
  if (error) throw error;
  const t1 = data.find(t=>t.id===1);
  const t2 = data.find(t=>t.id===2);
  el.team1Name.textContent = t1?.name || 'Team 1';
  el.team2Name.textContent = t2?.name || 'Team 2';
}

async function loadScores() {
  const { data, error } = await sb.from('game_scores').select('team_id,score').eq('game_id', gameId);
  if (error) throw error;
  const s1 = data.find(r=>r.team_id===1)?.score ?? 0;
  const s2 = data.find(r=>r.team_id===2)?.score ?? 0;
  el.score1.textContent = s1;
  el.score2.textContent = s2;
}

async function loadCurrentQuestion() {
  const { data: g, error: eg } = await sb.from('games').select('current_question_id').eq('id', gameId).single();
  if (eg) throw eg;

  const qid = g?.current_question_id;
  if (!qid) {
    el.cat.textContent = '—';
    el.question.textContent = 'Scan een QR / gebruik een token om een vraag te starten.';
    el.media.innerHTML = '';
    return;
  }

  const { data: q, error: eq } = await sb
    .from('questions')
    .select('id, question_text, media_url, duration_sec, categories(name,icon)')
    .eq('id', qid)
    .single();
  if (eq) throw eq;

  const icon = q.categories?.icon || '';
  const name = q.categories?.name || '';
  el.cat.textContent = `${icon} ${name}`.trim();
  el.question.textContent = q.question_text || '';
  renderMedia(q.media_url);

  // show last used token (optional)
  const { data: lastUse } = await sb
    .from('game_token_uses')
    .select('token, used_by_team_id, used_at')
    .eq('game_id', gameId)
    .order('used_at', { ascending: false })
    .limit(1);
  if (lastUse && lastUse.length) {
    const u = lastUse[0];
    el.tokenInfo.textContent = `Laatste token: ${u.token} (Team ${u.used_by_team_id})`;
  }
}

function renderMedia(url) {
  el.media.innerHTML = '';
  if (!url) return;

  // Spotify embed (optioneel)
  if (url.startsWith('spotify:track:')) {
    const trackId = url.split(':').pop();
    const iframe = document.createElement('iframe');
    iframe.src = `https://open.spotify.com/embed/track/${trackId}`;
    iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    iframe.loading = 'lazy';
    el.media.appendChild(iframe);
    return;
  }

  // image
  if (url.match(/\.(png|jpe?g|webp|gif)(\?.*)?$/i)) {
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'media';
    el.media.appendChild(img);
    return;
  }

  // generic link
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noreferrer';
  a.textContent = 'Open media';
  el.media.appendChild(a);
}

function clearSubscriptions() {
  subscriptions.forEach(ch => sb.removeChannel(ch));
  subscriptions = [];
}

function subscribeRealtime() {
  clearSubscriptions();

  // scores
  const chScores = sb.channel(`scores_${gameId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'game_scores', filter: `game_id=eq.${gameId}` }, () => {
      loadScores().catch(console.error);
    })
    .subscribe();

  // current question
function subscribeRealtime() {
  clearSubscriptions();

  // SCORES
  const chScores = sb.channel(`scores_${gameId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_scores',
        filter: `game_id=eq.${gameId}`
      },
      () => loadScores()
    )
    .subscribe();

  // HUIDIGE VRAAG
  const chGame = sb.channel(`game_${gameId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`
      },
      () => loadCurrentQuestion()
    )
    .subscribe();

  subscriptions.push(chScores, chGame);
}

}

async function useGame(id) {
  gameId = id;
  if (!gameId) {
    setStatus(el.status, 'Geen actief spel gevonden. Open admin.html en maak een game.', 'warn');
    return;
  }

  setStatus(el.status, `Actief spel: ${gameId}`, 'ok');

  await loadTeams();
  await loadScores();
  await loadCurrentQuestion();
  subscribeRealtime();
}

async function init() {
  try {
    requireConfig();
    setStatus(el.status, 'Verbinden…');

    await loadGamesList();
    const resolved = await resolveGameId();

    if (resolved) {
      el.gameSelect.value = resolved;
      await useGame(resolved);
    } else {
      setStatus(el.status, 'Geen actief spel. Selecteer een game of maak er één via admin.html', 'warn');
    }

    el.btnUseGame.addEventListener('click', async () => {
      await useGame(el.gameSelect.value);
    });

  } catch (e) {
    console.error(e);
    setStatus(el.status, e.message || String(e), 'err');
  }
}

init();

// Fallback polling — elke 1.5 sec
setInterval(() => {
  if (!gameId) return;
  loadScores().catch(() => {});
  loadCurrentQuestion().catch(() => {});
}, 1500);