import { sb, requireConfig } from './supabaseClient.js';
import { qs, setStatus, prettyUUID } from './utils.js';

let activeGameId = null;

function $(id) {
  return document.getElementById(id);
}

const el = {
  status: $('status'),
  email: $('email'),
  password: $('password'),
  btnLogin: $('btnLogin'),
  btnLogout: $('btnLogout'),
  authPanel: $('authPanel'),
  adminPanel: $('adminPanel'),
  activeGame: $('activeGame'),
  gamesList: $('gamesList'),
  btnCreateGame: $('btnCreateGame'),
  questionsSelect: $('questionsSelect'),
  btnSetQuestion: $('btnSetQuestion'),
  tokenReset: $('tokenReset'),
  btnResetToken: $('btnResetToken'),
  team1Score: $('team1Score'),
  team2Score: $('team2Score'),
  btnT1Plus: $('btnT1Plus'),
  btnT1Min: $('btnT1Min'),
  btnT2Plus: $('btnT2Plus'),
  btnT2Min: $('btnT2Min'),
  answersList: $('answersList')
};
if (el.gamesList) {
  el.gamesList.innerHTML = '';
}

function must(paramName) {
  const v = qs(paramName);
  if (!v) return null;
  return v;
}

async function init() {
  requireConfig();

  // buttons
  el.btnLogin.addEventListener('click', login);
  el.btnLogout.addEventListener('click', logout);
  el.btnCreateGame.addEventListener('click', createGame);
  el.btnSetQuestion.addEventListener('click', setCurrentQuestion);
  el.btnResetToken.addEventListener('click', resetToken);

  el.btnT1Plus.addEventListener('click', () => adjustScore(1, +1));
  el.btnT1Min.addEventListener('click', () => adjustScore(1, -1));
  el.btnT2Plus.addEventListener('click', () => adjustScore(2, +1));
  el.btnT2Min.addEventListener('click', () => adjustScore(2, -1));

  // auth state
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    showAdmin(true);
    await loadAll();
  } else {
    showAdmin(false);
  }

  sb.auth.onAuthStateChange(async (_event, session) => {
    if (session) {
      showAdmin(true);
      await loadAll();
    } else {
      showAdmin(false);
    }
  });
}

function showAdmin(isAuthed) {
  el.authPanel.style.display = isAuthed ? 'none' : 'block';
  el.adminPanel.style.display = isAuthed ? 'block' : 'none';
}

async function login() {
  try {
    setStatus(el.status, 'Inloggen...', 'muted');
    const email = el.email.value.trim();
    const password = el.password.value;
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setStatus(el.status, 'Ingelogd ✅', 'good');
  } catch (e) {
    console.error(e);
    setStatus(el.status, 'Login mislukt: ' + (e.message || e), 'bad');
  }
}

async function logout() {
  await sb.auth.signOut();
}

async function loadAll() {
  await loadActiveGame();
  await loadGames();
  await loadQuestions();
  if (activeGameId) {
    await loadScores();
    await loadAnswers();
  }
}

async function loadActiveGame() {
  // app_state singleton
  const { data, error } = await sb
    .from('app_state')
    .select('active_game_id')
    .eq('id', 1)
    .single();
  if (error) {
    console.warn(error);
    activeGameId = null;
    el.activeGame.textContent = '—';
    return;
  }
  activeGameId = data?.active_game_id || null;
  el.activeGame.textContent = activeGameId ? `${prettyUUID(activeGameId)} (${activeGameId})` : '—';
}

async function loadGames() {
  const { data, error } = await sb
    .from('games')
    .select('id, created_at, status, current_question_id')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;

  el.gamesList.innerHTML = '';
  (data || []).forEach(g => {
    const row = document.createElement('div');
    row.className = 'row';
    const left = document.createElement('div');
    left.innerHTML = `<div><b>${prettyUUID(g.id)}</b> <span class="muted">${new Date(g.created_at).toLocaleString()}</span></div>
                      <div class="muted">status: ${g.status} · current_question: ${g.current_question_id ? prettyUUID(g.current_question_id) : '—'}</div>`;

    const right = document.createElement('div');
    right.className = 'row-actions';

    const btnSet = document.createElement('button');
    btnSet.className = 'btn';
    btnSet.textContent = 'Set active';
    btnSet.addEventListener('click', () => setActiveGame(g.id));

    const linkMain = document.createElement('a');
    linkMain.className = 'btn ghost';
    linkMain.textContent = 'Open hoofdscherm';
    linkMain.href = `index.html?game=${g.id}`;

    const linkTeam1 = document.createElement('a');
    linkTeam1.className = 'btn ghost';
    linkTeam1.textContent = 'Team 1';
    linkTeam1.href = `team.html?team=1&game=${g.id}`;

    const linkTeam2 = document.createElement('a');
    linkTeam2.className = 'btn ghost';
    linkTeam2.textContent = 'Team 2';
    linkTeam2.href = `team.html?team=2&game=${g.id}`;

    right.append(btnSet, linkMain, linkTeam1, linkTeam2);
    row.append(left, right);
    el.gamesList.append(row);
  });
}

async function loadQuestions() {
  const { data, error } = await sb
    .from('questions')
    .select('id, question_text, category_id, duration_sec')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;

  el.questionsSelect.innerHTML = '';
  (data || []).forEach(q => {
    const opt = document.createElement('option');
    opt.value = q.id;
    opt.textContent = `[cat ${q.category_id}] ${q.question_text}`.slice(0, 120);
    el.questionsSelect.append(opt);
  });
}

async function loadScores() {
  const { data, error } = await sb
    .from('game_scores')
    .select('team_id, score')
    .eq('game_id', activeGameId);
  if (error) throw error;

  const s1 = data?.find(x => x.team_id === 1)?.score ?? 0;
  const s2 = data?.find(x => x.team_id === 2)?.score ?? 0;
  el.team1Score.textContent = s1;
  el.team2Score.textContent = s2;
}

async function loadAnswers() {
  const { data, error } = await sb
    .from('answers')
    .select('id, created_at, team_id, question_id, answer_text, is_correct, points_awarded')
    .eq('game_id', activeGameId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;

  el.answersList.innerHTML = '';
  (data || []).forEach(a => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="row">
        <div>
          <div><b>Team ${a.team_id}</b> · <span class="muted">${new Date(a.created_at).toLocaleString()}</span></div>
          <div class="muted">Q: ${prettyUUID(a.question_id)} · correct: ${a.is_correct ?? '—'} · punten: ${a.points_awarded}</div>
        </div>
      </div>
      <div class="answerBox">${(a.answer_text || '').replaceAll('<','&lt;')}</div>
    `;
    el.answersList.append(card);
  });
}

async function createGame() {
  try {
    setStatus(el.status, 'Game aanmaken...', 'muted');
    const { data, error } = await sb.rpc('rpc_create_game');
    if (error) throw error;
    setStatus(el.status, `Game gemaakt: ${prettyUUID(data)}`, 'good');
    await loadAll();
  } catch (e) {
    console.error(e);
    setStatus(el.status, 'Fout: ' + (e.message || e), 'bad');
  }
}

async function setActiveGame(gid) {
  try {
    setStatus(el.status, 'Active game instellen...', 'muted');
    const { error } = await sb.rpc('rpc_set_active_game', { p_game_id: gid });
    if (error) throw error;
    setStatus(el.status, `Active game: ${prettyUUID(gid)}`, 'good');
    await loadAll();
  } catch (e) {
    console.error(e);
    setStatus(el.status, 'Fout: ' + (e.message || e), 'bad');
  }
}

async function setCurrentQuestion() {
  try {
    if (!activeGameId) throw new Error('Geen active game');
    const qid = el.questionsSelect.value;
    if (!qid) throw new Error('Kies een vraag');
    setStatus(el.status, 'Vraag forceren...', 'muted');
    const { error } = await sb.rpc('rpc_admin_set_current_question', { p_game_id: activeGameId, p_question_id: qid });
    if (error) throw error;
    setStatus(el.status, `Huidige vraag gezet: ${prettyUUID(qid)}`, 'good');
    await loadGames();
  } catch (e) {
    console.error(e);
    setStatus(el.status, 'Fout: ' + (e.message || e), 'bad');
  }
}

async function adjustScore(teamId, delta) {
  try {
    if (!activeGameId) throw new Error('Geen active game');
    setStatus(el.status, 'Score aanpassen...', 'muted');
    const { data, error } = await sb.rpc('rpc_admin_adjust_score', { p_game_id: activeGameId, p_team_id: teamId, p_delta: delta });
    if (error) throw error;
    setStatus(el.status, `Score Team ${teamId}: ${data}`, 'good');
    await loadScores();
  } catch (e) {
    console.error(e);
    setStatus(el.status, 'Fout: ' + (e.message || e), 'bad');
  }
}

async function resetToken() {
  try {
    if (!activeGameId) throw new Error('Geen active game');
    const t = (el.tokenReset.value || '').trim();
    if (!t) throw new Error('Vul token in');
    setStatus(el.status, 'Token reset...', 'muted');
    const { error } = await sb.rpc('rpc_admin_reset_token', { p_game_id: activeGameId, p_token: t });
    if (error) throw error;
    setStatus(el.status, `Token gereset: ${t}`, 'good');
  } catch (e) {
    console.error(e);
    setStatus(el.status, 'Fout: ' + (e.message || e), 'bad');
  }
}

// Polling-light: refresh every 3s (simpel en betrouwbaar)
setInterval(async () => {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return;
    if (activeGameId) {
      await loadScores();
      await loadAnswers();
    }
  } catch (_) {}
}, 3000);

document.addEventListener('DOMContentLoaded', init);
