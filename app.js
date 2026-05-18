/* FisioQuest — app.js v7
   + Sistema de níveis numéricos 1-20
   + Streak de 100% (perfect streak)
   + Badge de nível no resultado
*/

const QUESTIONS_PER_SESSION = 10;

// ── Tabela de níveis 1–20 ─────────────────────────
const LEVEL_TABLE = [
  { level:  1, name: 'Calouro',         min:    0 },
  { level:  2, name: 'Curioso',         min:   80 },
  { level:  3, name: 'Estudante',       min:  200 },
  { level:  4, name: 'Dedicado',        min:  380 },
  { level:  5, name: 'Aplicado',        min:  620 },
  { level:  6, name: 'Persistente',     min:  940 },
  { level:  7, name: 'Competente',      min: 1360 },
  { level:  8, name: 'Habilidoso',      min: 1900 },
  { level:  9, name: 'Especialista Jr', min: 2580 },
  { level: 10, name: 'Especialista',    min: 3420 },
  { level: 11, name: 'Profissional',    min: 4440 },
  { level: 12, name: 'Avançado',        min: 5660 },
  { level: 13, name: 'Perito',          min: 7100 },
  { level: 14, name: 'Expert',          min: 8780 },
  { level: 15, name: 'Mestre Jr',       min:10720 },
  { level: 16, name: 'Mestre',          min:12940 },
  { level: 17, name: 'Mestre Sênior',   min:15460 },
  { level: 18, name: 'Grão-Mestre',     min:18300 },
  { level: 19, name: 'Lenda',           min:21480 },
  { level: 20, name: 'FisioLenda 🏆',   min:25020 },
];

function getLevelData(xp) {
  let data = LEVEL_TABLE[0];
  for (const l of LEVEL_TABLE) { if (xp >= l.min) data = l; }
  return data;
}
function getLevelName(xp) { return getLevelData(xp).name; }
function getLevelNumber(xp) { return getLevelData(xp).level; }

// XP para o próximo nível (null se já for nível 20)
function getNextLevelXp(xp) {
  const cur = getLevelData(xp);
  if (cur.level === 20) return null;
  return LEVEL_TABLE[cur.level].min; // índice = level (nível 2 está em índice 1, etc.)
}

let state = {
  xp:            parseInt(localStorage.getItem('fq_xp')            || '0'),
  streak:        parseInt(localStorage.getItem('fq_streak')        || '0'),
  perfectStreak: parseInt(localStorage.getItem('fq_perfectStreak') || '0'),
  currentArea:   null,
  currentModule: null,
  questions:     [],
  qIndex:        0,
  correct:       0,
  answered:      false,
  wrongAnswers:  [],
};

// ──────────────────────────────────────────────────
// PERFIL
// ──────────────────────────────────────────────────
function loadProfile() {
  try { return JSON.parse(localStorage.getItem('fq_profile') || 'null'); }
  catch { return null; }
}
function saveProfile(profile) {
  localStorage.setItem('fq_profile', JSON.stringify(profile));
}

function renderProfileCard() {
  const profile  = loadProfile();
  const nameEl   = document.getElementById('profileName');
  const subEl    = document.getElementById('profileSub');
  const avatarEl = document.getElementById('profileAvatar');
  if (!nameEl) return;

  if (profile && profile.nome) {
    nameEl.textContent   = profile.nome;
    avatarEl.textContent = profile.avatar || '🧑‍⚕️';
    const parts = [profile.curso, profile.periodo].filter(Boolean);
    subEl.textContent    = parts.length ? parts.join(' • ') : (profile.instituicao || '—');
  } else {
    nameEl.textContent   = 'Estudante';
    avatarEl.textContent = '🧑‍⚕️';
    subEl.textContent    = '—';
  }
}

function openOnboarding(prefill) {
  const overlay = document.getElementById('onboardingOverlay');
  overlay.style.display = 'flex';

  const p = prefill || loadProfile() || {};
  document.getElementById('inputNome').value         = p.nome        || '';
  document.getElementById('selectInstituicao').value = p.instituicao || '';
  document.getElementById('selectCurso').value       = p.curso       || '';
  document.getElementById('selectPeriodo').value     = p.periodo     || '';

  document.querySelectorAll('.avatar-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.avatar === (p.avatar || '🧑‍⚕️'));
  });
}

function closeOnboarding() {
  document.getElementById('onboardingOverlay').style.display = 'none';
}

function initOnboarding() {
  const overlay    = document.getElementById('onboardingOverlay');
  const saveBtn    = document.getElementById('onboardingSaveBtn');
  const editBtn    = document.getElementById('profileEditBtn');
  const avatarGrid = document.getElementById('avatarGrid');

  avatarGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.avatar-btn');
    if (!btn) return;
    document.querySelectorAll('.avatar-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });

  saveBtn.addEventListener('click', () => {
    const nome = document.getElementById('inputNome').value.trim();
    if (!nome) {
      document.getElementById('inputNome').focus();
      document.getElementById('inputNome').style.borderColor = 'var(--color-error)';
      setTimeout(() => document.getElementById('inputNome').style.borderColor = '', 1500);
      return;
    }
    const avatarAtivo = document.querySelector('.avatar-btn.active');
    const profile = {
      nome,
      avatar:      avatarAtivo ? avatarAtivo.dataset.avatar : '🧑‍⚕️',
      instituicao: document.getElementById('selectInstituicao').value,
      curso:       document.getElementById('selectCurso').value,
      periodo:     document.getElementById('selectPeriodo').value,
    };
    saveProfile(profile);
    renderProfileCard();
    closeOnboarding();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay && loadProfile()) closeOnboarding();
  });

  editBtn.addEventListener('click', () => openOnboarding());

  if (!loadProfile()) openOnboarding();
  renderProfileCard();
}

// ──────────────────────────────────────────────────
// HISTÓRICO
// ──────────────────────────────────────────────────
function loadHistory() {
  try { return JSON.parse(localStorage.getItem('fq_history') || '[]'); }
  catch { return []; }
}
function saveHistory(history) {
  localStorage.setItem('fq_history', JSON.stringify(history));
}
function pushSession(entry) {
  const h = loadHistory();
  h.push(entry);
  if (h.length > 50) h.splice(0, h.length - 50);
  saveHistory(h);
}

function save() {
  localStorage.setItem('fq_xp',            state.xp);
  localStorage.setItem('fq_streak',        state.streak);
  localStorage.setItem('fq_perfectStreak', state.perfectStreak);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.target === id)
  );
  window.scrollTo(0, 0);
  if (id === 'statsScreen') renderStats();
}

// ── HUD: mostra Nível X — Nome ─────────────────────
function updateHUD() {
  const lvl = getLevelData(state.xp);
  document.getElementById('statXp').textContent     = state.xp + ' XP';
  document.getElementById('statStreak').textContent = state.streak;
  document.getElementById('statRank').textContent   = 'Nível ' + lvl.level;

  // Barra de progresso de XP na home
  const nextXp = getNextLevelXp(state.xp);
  const bar    = document.getElementById('xpProgressBar');
  const barPct = document.getElementById('xpProgressPct');
  const barNext= document.getElementById('xpProgressNext');
  if (!bar) return;
  if (nextXp === null) {
    bar.style.width  = '100%';
    if (barPct)  barPct.textContent  = '🏆 Nível máximo!';
    if (barNext) barNext.textContent = '';
  } else {
    const prev = getLevelData(state.xp).min;
    const span = nextXp - prev;
    const done = state.xp - prev;
    const pct  = Math.min(100, Math.round((done / span) * 100));
    bar.style.width  = pct + '%';
    if (barPct)  barPct.textContent  = pct + '% para Nível ' + (lvl.level + 1);
    if (barNext) barNext.textContent = (nextXp - state.xp) + ' XP restantes';
  }
}

function buildModuleList(areaKey) {
  const list = document.getElementById('moduleList');
  list.innerHTML = '';
  const area = (typeof AREAS !== 'undefined') && AREAS[areaKey];
  if (!area || !area.modules || area.modules.length === 0) {
    list.innerHTML = '<p style="color:var(--color-text-muted);padding:var(--space-4)">Módulos não encontrados.</p>';
    return;
  }
  area.modules.forEach(mod => {
    const card = document.createElement('button');
    card.className = 'module-card';
    card.innerHTML = `<span class="module-label">${mod.icon || ''} ${mod.title}</span>`;
    card.addEventListener('click', () => startLesson(areaKey, mod.id));
    list.appendChild(card);
  });
}

function startLesson(areaKey, moduleId) {
  const area = AREAS[areaKey];
  if (!area) return;
  const mod = area.modules.find(m => m.id === moduleId);
  if (!mod || !mod.questions || mod.questions.length === 0) return;

  const normalize = (q) => ({
    question:    q.question || q.q,
    options:     q.options,
    correct:     q.correct  !== undefined ? q.correct : q.answer,
    explanation: q.explanation || q.explain || '',
  });

  state.currentArea   = areaKey;
  state.currentModule = moduleId;
  state.questions     = shuffle(mod.questions.map(normalize)).slice(0, QUESTIONS_PER_SESSION);
  state.qIndex        = 0;
  state.correct       = 0;
  state.answered      = false;
  state.wrongAnswers  = [];

  document.getElementById('lessonTag').textContent   = area.icon + ' ' + area.label;
  document.getElementById('lessonTitle').textContent = mod.title;

  showScreen('lessonScreen');
  renderQuestion();
}

function renderQuestion() {
  const q     = state.questions[state.qIndex];
  const total = state.questions.length;
  const pct   = Math.round((state.qIndex / total) * 100);

  document.getElementById('questionCounter').textContent = `${state.qIndex + 1}/${total}`;
  document.getElementById('progressText').textContent    = pct + '%';
  document.getElementById('progressFill').style.width   = pct + '%';
  document.getElementById('questionText').textContent   = q.question;

  const answersEl = document.getElementById('answers');
  answersEl.innerHTML = '';

  shuffle(q.options.map((text, i) => ({ text, index: i }))).forEach(({ text, index }) => {
    const btn = document.createElement('button');
    btn.className     = 'answer';
    btn.textContent   = text;
    btn.dataset.index = index;
    btn.addEventListener('click', () => selectAnswer(btn, index, q.correct));
    answersEl.appendChild(btn);
  });

  document.getElementById('feedbackPlaceholder').style.display = 'block';
  const card = document.getElementById('feedbackCard');
  card.classList.remove('visible', 'is-correct', 'is-wrong');

  const nextBtn = document.getElementById('nextBtn');
  nextBtn.disabled    = true;
  nextBtn.textContent = 'Responda primeiro';
  state.answered = false;
}

function showFeedbackCard(isCorrect, correctText, explanation) {
  document.getElementById('feedbackPlaceholder').style.display = 'none';

  const card        = document.getElementById('feedbackCard');
  const icon        = document.getElementById('feedbackIcon');
  const status      = document.getElementById('feedbackStatus');
  const correctTxt  = document.getElementById('feedbackCorrectText');
  const explainWrap = document.getElementById('feedbackExplainWrap');
  const explainTxt  = document.getElementById('feedbackExplainText');

  card.classList.remove('is-correct', 'is-wrong', 'visible');
  void card.offsetWidth;

  if (isCorrect) {
    icon.textContent   = '✅';
    status.textContent = 'Resposta correta!';
    card.classList.add('is-correct');
  } else {
    icon.textContent   = '❌';
    status.textContent = 'Resposta incorreta';
    card.classList.add('is-wrong');
  }
  correctTxt.textContent = correctText;

  if (explanation) {
    explainTxt.textContent    = explanation;
    explainWrap.style.display = 'flex';
  } else {
    explainWrap.style.display = 'none';
  }

  card.classList.add('visible');
}

function selectAnswer(btn, chosen, correct) {
  if (state.answered) return;
  state.answered = true;

  const allBtns   = document.querySelectorAll('.answer');
  const isCorrect = chosen === correct;
  const nextBtn   = document.getElementById('nextBtn');
  const q         = state.questions[state.qIndex];

  allBtns.forEach(b => {
    b.disabled = true;
    if (parseInt(b.dataset.index) === correct) b.classList.add('correct');
  });

  if (isCorrect) {
    btn.classList.add('correct');
    state.correct++;
    state.streak++;
  } else {
    btn.classList.add('wrong');
    state.streak = 0;
    state.wrongAnswers.push({
      question: q.question, options: q.options,
      chosen, correct, explanation: q.explanation || '',
    });
  }

  showFeedbackCard(isCorrect, q.options[correct], q.explanation || '');
  save();
  updateHUD();

  const isLast = state.qIndex === state.questions.length - 1;
  nextBtn.disabled    = false;
  nextBtn.textContent = isLast ? 'Ver resultado →' : 'Próxima →';
}

// ── Mascote ────────────────────────────────────────
function getMascoteFala(pct, perfectStreak) {
  if (pct === 100 && perfectStreak >= 3)
    return `🔥 ${perfectStreak}× PERFEITO consecutivo! Você é imparável!`;
  if (pct === 100)
    return '🏆 PERFEITO! Você mandou muito bem, futuro especialista!';
  if (pct >= 70)
    return '🎉 Ótimo trabalho! Você está no caminho certo. Continue assim!';
  if (pct >= 50)
    return '💪 Quase lá! Revise o conteúdo e tente de novo — você consegue!';
  return '😄 Na próxima você consegue! Não desista, cada erro é um aprendizado!';
}

function animateMascote() {
  const img = document.getElementById('mascoteImg');
  if (!img) return;
  img.classList.remove('bounce');
  void img.offsetWidth;
  img.classList.add('bounce');
}

// ── Confete ─────────────────────────────────────────
function launchConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const colors = ['#0d8f67','#f2c94c','#4edba8','#ff6b6b','#74b9ff','#a29bfe'];
  const pieces = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width, y: Math.random() * -canvas.height,
    w: 8 + Math.random() * 8, h: 4 + Math.random() * 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    speed: 3 + Math.random() * 4, angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - .5) * .2, drift: (Math.random() - .5) * 2,
  }));
  let frame = 0; const maxFrames = 180;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.y += p.speed; p.x += p.drift; p.angle += p.spin;
      ctx.save();
      ctx.translate(p.x + p.w/2, p.y + p.h/2); ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - frame/maxFrames);
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
    });
    frame++;
    if (frame < maxFrames) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  draw();
}

// ── Revisão de erros ─────────────────────────────────
function buildReviewPanel(wrongAnswers) {
  const section = document.getElementById('reviewSection');
  const list    = document.getElementById('reviewList');
  const toggle  = document.getElementById('reviewToggle');
  const count   = document.getElementById('reviewCount');
  if (!wrongAnswers || wrongAnswers.length === 0) { section.style.display = 'none'; return; }
  count.textContent = `(${wrongAnswers.length})`;
  list.innerHTML = '';
  wrongAnswers.forEach(w => {
    const item = document.createElement('div');
    item.className = 'review-item';
    item.innerHTML = `
      <p class="ri-q">❓ ${w.question}</p>
      <p class="ri-wrong">✗ Sua resposta: ${w.options[w.chosen]}</p>
      <p class="ri-correct">✓ Correta: ${w.options[w.correct]}</p>
      ${w.explanation ? `<p class="ri-explain">💡 ${w.explanation}</p>` : ''}
    `;
    list.appendChild(item);
  });
  section.style.display = 'block';
  const newToggle = toggle.cloneNode(true);
  toggle.parentNode.replaceChild(newToggle, toggle);
  newToggle.addEventListener('click', () => {
    const open = list.classList.toggle('open');
    newToggle.classList.toggle('open', open);
  });
}

// ── Resultado ─────────────────────────────────────────
function showResult() {
  const total   = state.questions.length;
  const correct = state.correct;
  const pct     = Math.round((correct / total) * 100);

  // XP base + bônus de 100%
  const xpEarned = correct * 10 + (pct === 100 ? 50 : 0);

  // Perfect streak
  const prevLvl = getLevelData(state.xp).level;
  if (pct === 100) {
    state.perfectStreak++;
  } else {
    state.perfectStreak = 0;
  }

  state.xp += xpEarned;
  save();

  const newLvl = getLevelData(state.xp).level;
  const levelUp = newLvl > prevLvl;

  updateHUD();

  // Anel de score
  document.getElementById('scoreRing').style.setProperty('--percent', pct);
  document.getElementById('finalScore').textContent   = pct + '%';
  document.getElementById('correctCount').textContent = `${correct}/${total}`;
  document.getElementById('earnedXp').textContent     = '+' + xpEarned + ' XP';
  document.getElementById('mascoteFala').textContent  = getMascoteFala(pct, state.perfectStreak);

  // Badge de nível no resultado
  const lvl        = getLevelData(state.xp);
  const levelBadge = document.getElementById('resultLevelBadge');
  if (levelBadge) {
    levelBadge.textContent = `Nível ${lvl.level} — ${lvl.name}`;
    levelBadge.className   = 'result-level-badge' + (levelUp ? ' level-up' : '');
  }

  // Badge de perfect streak
  const streakBadge = document.getElementById('resultPerfectStreak');
  if (streakBadge) {
    if (state.perfectStreak >= 2) {
      streakBadge.textContent = `🔥 ${state.perfectStreak}× 100% consecutivos!`;
      streakBadge.style.display = 'block';
    } else {
      streakBadge.style.display = 'none';
    }
  }

  // Texto de result
  let title, text;
  if      (pct === 100) { title = '🏆 Perfeito!';         text = 'Acertou todas! Excelente desempenho!'; }
  else if (pct >= 70)   { title = '🎉 Muito bem!';         text = 'Ótimo resultado. Continue praticando!'; }
  else if (pct >= 50)   { title = '👍 Bom trabalho!';      text = 'Metade certa. Revise e tente de novo!'; }
  else                  { title = '💪 Continue tentando!'; text = 'Revise o conteúdo e repita a sessão.'; }

  document.getElementById('resultTitle').textContent = title;
  document.getElementById('resultText').textContent  = text;

  // Level-up toast
  if (levelUp) showLevelUpToast(lvl);

  const area = AREAS[state.currentArea];
  const mod  = area?.modules?.find(m => m.id === state.currentModule);
  pushSession({
    ts:          Date.now(),
    area:        state.currentArea,
    areaLabel:   area?.label || state.currentArea,
    moduleId:    state.currentModule,
    moduleTitle: mod?.title || state.currentModule,
    total, correct, pct, xpEarned,
  });

  buildReviewPanel(state.wrongAnswers);
  showScreen('resultScreen');
  animateMascote();
  if (pct === 100) launchConfetti();
}

// ── Toast de Level Up ──────────────────────────────────
function showLevelUpToast(lvl) {
  let toast = document.getElementById('levelUpToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'levelUpToast';
    document.querySelector('.app').appendChild(toast);
  }
  toast.innerHTML = `⬆️ Subiu para <strong>Nível ${lvl.level}</strong> — ${lvl.name}!`;
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4000);
}

// ──────────────────────────────────────────────────
// TELA DE ESTATÍSTICAS
// ──────────────────────────────────────────────────
function renderStats() {
  const history       = loadHistory();
  const totalSessions = history.length;
  const totalPct      = history.reduce((s, h) => s + h.pct, 0);
  const avgPct        = totalSessions ? Math.round(totalPct / totalSessions) : null;
  const bestPct       = totalSessions ? Math.max(...history.map(h => h.pct)) : null;

  document.getElementById('kpiXp').textContent       = state.xp;
  document.getElementById('kpiSessions').textContent = totalSessions;
  document.getElementById('kpiAvg').textContent      = avgPct !== null ? avgPct + '%' : '-';
  document.getElementById('kpiBest').textContent     = bestPct !== null ? bestPct + '%' : '-';

  renderBarChart(history.slice(-10));
  renderModuleStats(history);
  renderSessionLog(history.slice().reverse().slice(0, 20));
}

function renderBarChart(sessions) {
  const el = document.getElementById('barChart');
  if (!sessions.length) {
    el.innerHTML = '<p class="empty-chart">Complete sessões para ver sua evolução aqui.</p>';
    return;
  }
  const maxH = 80;
  const bars = sessions.map(s => {
    const h = Math.max(4, Math.round((s.pct / 100) * maxH));
    const d = new Date(s.ts);
    const label = d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
    return `
      <div class="bar-wrap">
        <span class="bar-label">${s.pct}%</span>
        <div class="bar${s.pct === 100 ? ' perfect' : ''}" style="height:${h}px" title="${s.moduleTitle} — ${s.pct}%"></div>
        <span class="bar-date">${label}</span>
      </div>`;
  }).join('');
  el.innerHTML = `<div class="bar-chart-inner">${bars}</div>`;
}

function renderModuleStats(history) {
  const el = document.getElementById('moduleStats');
  if (!history.length) { el.innerHTML = '<p class="empty-chart">Nenhuma sessão registrada ainda.</p>'; return; }
  const map = {};
  history.forEach(s => {
    if (!map[s.moduleId]) map[s.moduleId] = { title: s.moduleTitle, pcts: [] };
    map[s.moduleId].pcts.push(s.pct);
  });
  el.innerHTML = Object.values(map).map(m => {
    const avg   = Math.round(m.pcts.reduce((a,b) => a+b, 0) / m.pcts.length);
    const count = m.pcts.length;
    return `
      <div class="module-stat-row">
        <div class="module-stat-top">
          <span class="module-stat-name">${m.title}</span>
          <span class="module-stat-pct">${avg}%</span>
        </div>
        <div class="module-bar-bg">
          <div class="module-bar-fill" style="width:${avg}%"></div>
        </div>
        <span class="module-stat-sub">${count} sessão${count > 1 ? 'ões' : ''} • média ${avg}%</span>
      </div>`;
  }).join('');
}

function renderSessionLog(sessions) {
  const el = document.getElementById('sessionLog');
  if (!sessions.length) { el.innerHTML = '<p class="empty-chart">Nenhuma atividade ainda.</p>'; return; }
  const fmt = ts => new Date(ts).toLocaleString('pt-BR', {
    day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'
  });
  el.innerHTML = sessions.map(s => `
    <div class="session-entry">
      <div class="session-info">
        <span class="session-module">${s.areaLabel} • ${s.moduleTitle}</span>
        <span class="session-date">${fmt(s.ts)}</span>
      </div>
      <span class="session-badge${s.pct === 100 ? ' perfect' : ''}">${s.correct}/${s.total} • ${s.pct}%</span>
    </div>`).join('');
}

// ── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateHUD();
  initOnboarding();

  document.querySelectorAll('.area-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.area-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      buildModuleList(tab.dataset.area);
    });
  });
  buildModuleList('anatomia');

  document.getElementById('nextBtn').addEventListener('click', () => {
    if (!state.answered) return;
    state.qIndex++;
    if (state.qIndex >= state.questions.length) showResult();
    else renderQuestion();
  });

  document.getElementById('backHomeBtn').addEventListener('click',         () => showScreen('homeScreen'));
  document.getElementById('restartModuleBtn').addEventListener('click',    () => startLesson(state.currentArea, state.currentModule));
  document.getElementById('goHomeFromResultBtn').addEventListener('click', () => showScreen('homeScreen'));

  document.getElementById('clearStatsBtn').addEventListener('click', () => {
    if (confirm('Limpar todo o histórico de sessões?')) {
      saveHistory([]);
      renderStats();
    }
  });

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.target;
      if ((t === 'lessonScreen' || t === 'resultScreen') && state.questions.length === 0) return;
      showScreen(t);
    });
  });

  const themeToggle = document.getElementById('themeToggle');
  const themeIcon   = document.getElementById('themeIcon');
  const html        = document.documentElement;
  const saved       = localStorage.getItem('fq_theme') || 'light';
  html.setAttribute('data-theme', saved);
  themeIcon.textContent = saved === 'dark' ? '☀️' : '🌙';

  themeToggle.addEventListener('click', () => {
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    themeIcon.textContent = next === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('fq_theme', next);
  });
});
