/* FisioQuest — app.js v3
   + Animação bounce do mascote
   + Confete no 100%
   + Revisão detalhada de erros
*/

const QUESTIONS_PER_SESSION = 10;

const LEVELS = [
  { name: 'Iniciante',    min: 0    },
  { name: 'Estudante',    min: 100  },
  { name: 'Residente',    min: 300  },
  { name: 'Especialista', min: 700  },
  { name: 'Mestre',       min: 1500 },
];

let state = {
  xp:     parseInt(localStorage.getItem('fq_xp')     || '0'),
  streak: parseInt(localStorage.getItem('fq_streak') || '0'),
  currentArea:   null,
  currentModule: null,
  questions:     [],
  qIndex:        0,
  correct:       0,
  answered:      false,
  wrongAnswers:  [],   // { question, chosen, correct, explanation, options }
};

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
    // Salva para revisão
    state.wrongAnswers.push({
      question:    q.question,
      options:     q.options,
      chosen,
      correct,
      explanation: q.explanation || '',
    });
  }

  save();
  updateHUD();

  const isLast = state.qIndex === state.questions.length - 1;
  nextBtn.disabled    = false;
  nextBtn.textContent = isLast ? 'Ver resultado →' : 'Próxima →';
}

// ── Fala do mascote ───────────────────────────────────────
function getMascoteFala(pct) {
  if (pct === 100) return '🏆 PERFEITO! Você mandou muito bem, futuro especialista!';
  if (pct >= 70)  return '🎉 Ótimo trabalho! Você está no caminho certo. Continue assim!';
  if (pct >= 50)  return '💪 Quase lá! Revise o conteúdo e tente de novo — você consegue!';
  return '😄 Na próxima você consegue! Não desista, cada erro é um aprendizado!';
}

// ── Animação bounce do mascote ────────────────────────────
function animateMascote() {
  const img = document.getElementById('mascoteImg');
  if (!img) return;
  img.classList.remove('bounce');
  void img.offsetWidth; // reflow para reiniciar animação
  img.classList.add('bounce');
}

// ── Confete (canvas puro, sem lib) ────────────────────────
function launchConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#0d8f67','#f2c94c','#4edba8','#ff6b6b','#74b9ff','#a29bfe'];
  const pieces = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height,
    w: 8 + Math.random() * 8,
    h: 4 + Math.random() * 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    speed: 3 + Math.random() * 4,
    angle: Math.random() * Math.PI * 2,
    spin:  (Math.random() - .5) * .2,
    drift: (Math.random() - .5) * 2,
  }));

  let frame = 0;
  const maxFrames = 180;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.y     += p.speed;
      p.x     += p.drift;
      p.angle += p.spin;
      ctx.save();
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - frame / maxFrames);
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    frame++;
    if (frame < maxFrames) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  draw();
}

// ── Painel de revisão de erros ────────────────────────────
function buildReviewPanel(wrongAnswers) {
  const section = document.getElementById('reviewSection');
  const list    = document.getElementById('reviewList');
  const toggle  = document.getElementById('reviewToggle');
  const count   = document.getElementById('reviewCount');

  if (!wrongAnswers || wrongAnswers.length === 0) {
    section.style.display = 'none';
    return;
  }

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

  toggle.addEventListener('click', () => {
    const open = list.classList.toggle('open');
    toggle.classList.toggle('open', open);
  });
}

// ── Resultado ─────────────────────────────────────────────
function showResult() {
  const total    = state.questions.length;
  const correct  = state.correct;
  const pct      = Math.round((correct / total) * 100);
  const xpEarned = correct * 10 + (pct === 100 ? 50 : 0);

  state.xp += xpEarned;
  save();
  updateHUD();

  document.getElementById('scoreRing').style.setProperty('--percent', pct);
  document.getElementById('finalScore').textContent   = pct + '%';
  document.getElementById('correctCount').textContent = `${correct}/${total}`;
  document.getElementById('earnedXp').textContent     = '+' + xpEarned + ' XP';
  document.getElementById('mascoteFala').textContent  = getMascoteFala(pct);

  let title, text;
  if      (pct === 100) { title = '🏆 Perfeito!';         text = 'Acertou todas! Excelente desempenho!'; }
  else if (pct >= 70)   { title = '🎉 Muito bem!';         text = 'Ótimo resultado. Continue praticando!'; }
  else if (pct >= 50)   { title = '👍 Bom trabalho!';      text = 'Metade certa. Revise e tente de novo!'; }
  else                  { title = '💪 Continue tentando!'; text = 'Revise o conteúdo e repita a sessão.'; }

  document.getElementById('resultTitle').textContent = title;
  document.getElementById('resultText').textContent  = text;

  buildReviewPanel(state.wrongAnswers);
  showScreen('resultScreen');

  // Animação do mascote
  animateMascote();

  // Confete apenas no 100%
  if (pct === 100) launchConfetti();
}

// ── Init ──────────────────────────────────────────────────
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

  document.getElementById('quickStartBtn').addEventListener('click', () => {
    const mods = AREAS?.anatomia?.modules;
    if (mods && mods.length > 0) startLesson('anatomia', mods[0].id);
  });

  document.getElementById('nextBtn').addEventListener('click', () => {
    if (!state.answered) return;
    state.qIndex++;
    if (state.qIndex >= state.questions.length) showResult();
    else renderQuestion();
  });

  document.getElementById('backHomeBtn').addEventListener('click',         () => showScreen('homeScreen'));
  document.getElementById('restartModuleBtn').addEventListener('click',    () => startLesson(state.currentArea, state.currentModule));
  document.getElementById('goHomeFromResultBtn').addEventListener('click', () => showScreen('homeScreen'));

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
