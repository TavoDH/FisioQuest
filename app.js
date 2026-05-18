/* FisioQuest — app.js v4
   + Tela de Estatísticas com KPIs, gráfico de barras e histórico
*/

const QUESTIONS_PER_SESSION = 10;

const LEVELS = [
  { name: 'Iniciante',    min: 0    },
  { name: 'Estudante',    min: 100  },
  { name: 'Residente',    min: 300  },
  { name: 'Especialista', min: 700  },
  { name: 'Mestre',       min: 1500 },
];

// ─ Estado principal
let state = {
  xp:     parseInt(localStorage.getItem('fq_xp')     || '0'),
  streak: parseInt(localStorage.getItem('fq_streak') || '0'),
  currentArea:   null,
  currentModule: null,
  questions:     [],
  qIndex:        0,
  correct:       0,
  answered:      false,
  wrongAnswers:  [],
};

// ─ Histórico de sessões (persistência em localStorage)
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
  if (h.length > 50) h.splice(0, h.length - 50); // máx 50 sessões
  saveHistory(h);
}

function save() {
  localStorage.setItem('fq_xp',     state.xp);
  localStorage.setItem('fq_streak', state.streak);
}

function getLevelName(xp) {
  let level = LEVELS[0];
  for (const l of LEVELS) { if (xp >= l.min) level = l; }
  return level.name;
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

function updateHUD() {
  document.getElementById('statXp').textContent     = state.xp + ' XP';
  document.getElementById('statStreak').textContent = state.streak;
  document.getElementById('statRank').textContent   = getLevelName(state.xp);
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

  const feedback = document.getElementById('feedback');
  feedback.textContent = 'Escolha uma resposta para continuar.';
  feedback.className   = 'feedback';

  const nextBtn = document.getElementById('nextBtn');
  nextBtn.disabled    = true;
  nextBtn.textContent = 'Responda primeiro';
  state.answered = false;
}

function selectAnswer(btn, chosen, correct) {
  if (state.answered) return;
  state.answered = true;

  const allBtns   = document.querySelectorAll('.answer');
  const isCorrect = chosen === correct;
  const feedback  = document.getElementById('feedback');
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
    feedback.textContent = '✅ Correto! ' + (q.explanation || '');
    feedback.className   = 'feedback feedback-correct';
  } else {
    btn.classList.add('wrong');
    state.streak = 0;
    feedback.textContent = '❌ Incorreto. ' + (q.explanation || '');
    feedback.className   = 'feedback feedback-wrong';
    state.wrongAnswers.push({
      question: q.question, options: q.options,
      chosen, correct, explanation: q.explanation || '',
    });
  }

  save();
  updateHUD();

  const isLast = state.qIndex === state.questions.length - 1;
  nextBtn.disabled    = false;
  nextBtn.textContent = isLast ? 'Ver resultado →' : 'Próxima →';
}

// ─ Mascote
function getMascoteFala(pct) {
  if (pct === 100) return '🏆 PERFEITO! Você mandou muito bem, futuro especialista!';
  if (pct >= 70)  return '🎉 Ótimo trabalho! Você está no caminho certo. Continue assim!';
  if (pct >= 50)  return '💪 Quase lá! Revise o conteúdo e tente de novo — você consegue!';
  return '😄 Na próxima você consegue! Não desista, cada erro é um aprendizado!';
}
function animateMascote() {
  const img = document.getElementById('mascoteImg');
  if (!img) return;
  img.classList.remove('bounce');
  void img.offsetWidth;
  img.classList.add('bounce');
}

// ─ Confete
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

// ─ Revisão de erros
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
  // remove listener antigo e adiciona novo
  const newToggle = toggle.cloneNode(true);
  toggle.parentNode.replaceChild(newToggle, toggle);
  newToggle.addEventListener('click', () => {
    const open = list.classList.toggle('open');
    newToggle.classList.toggle('open', open);
  });
}

// ─ Resultado
function showResult() {
  const total    = state.questions.length;
  const correct  = state.correct;
  const pct      = Math.round((correct / total) * 100);
  const xpEarned = correct * 10 + (pct === 100 ? 50 : 0);

  state.xp += xpEarned;
  save();
  updateHUD();

  document.getElementById('scoreRing').style.setProperty('--percent', pct);
  document.getElementById('finalScore').textContent  = pct + '%';
  document.getElementById('correctCount').textContent = `${correct}/${total}`;
  document.getElementById('earnedXp').textContent    = '+' + xpEarned + ' XP';
  document.getElementById('mascoteFala').textContent = getMascoteFala(pct);

  let title, text;
  if      (pct === 100) { title = '🏆 Perfeito!';         text = 'Acertou todas! Excelente desempenho!'; }
  else if (pct >= 70)   { title = '🎉 Muito bem!';         text = 'Ótimo resultado. Continue praticando!'; }
  else if (pct >= 50)   { title = '👍 Bom trabalho!';      text = 'Metade certa. Revise e tente de novo!'; }
  else                  { title = '💪 Continue tentando!'; text = 'Revise o conteúdo e repita a sessão.'; }

  document.getElementById('resultTitle').textContent = title;
  document.getElementById('resultText').textContent  = text;

  // Salva sessão no histórico
  const area = AREAS[state.currentArea];
  const mod  = area?.modules?.find(m => m.id === state.currentModule);
  pushSession({
    ts:         Date.now(),
    area:       state.currentArea,
    areaLabel:  area?.label || state.currentArea,
    moduleId:   state.currentModule,
    moduleTitle: mod?.title || state.currentModule,
    total,
    correct,
    pct,
    xpEarned,
  });

  buildReviewPanel(state.wrongAnswers);
  showScreen('resultScreen');
  animateMascote();
  if (pct === 100) launchConfetti();
}

// ──────────────────────────────────────────────────
// TELA DE ESTATÍSTICAS
// ──────────────────────────────────────────────────
function renderStats() {
  const history = loadHistory();

  // KPIs
  const totalSessions = history.length;
  const totalPct      = history.reduce((s, h) => s + h.pct, 0);
  const avgPct        = totalSessions ? Math.round(totalPct / totalSessions) : null;
  const bestPct       = totalSessions ? Math.max(...history.map(h => h.pct)) : null;

  document.getElementById('kpiXp').textContent       = state.xp;
  document.getElementById('kpiSessions').textContent = totalSessions;
  document.getElementById('kpiAvg').textContent      = avgPct !== null ? avgPct + '%' : '-';
  document.getElementById('kpiBest').textContent     = bestPct !== null ? bestPct + '%' : '-';

  // Gráfico de barras (últimas 10 sessões)
  renderBarChart(history.slice(-10));

  // Desempenho por módulo
  renderModuleStats(history);

  // Histórico (recentes primeiro)
  renderSessionLog(history.slice().reverse().slice(0, 20));
}

function renderBarChart(sessions) {
  const el = document.getElementById('barChart');
  if (!sessions.length) {
    el.innerHTML = '<p class="empty-chart">Complete sessões para ver sua evolução aqui.</p>';
    return;
  }
  const maxH = 80; // px
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

  // Agrupa por módulo
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

// ─ Init
document.addEventListener('DOMContentLoaded', () => {
  updateHUD();

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
