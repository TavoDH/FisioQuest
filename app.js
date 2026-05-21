/* FisioQuest — app.js v9
   + Confirmação ao sair no meio da lição
*/

const QUESTIONS_PER_SESSION = 10;

// ── Estado persistido ─────────────────────────────────────────
const STORAGE_KEYS = {
  xp:            'fq_xp',
  streak:        'fq_streak',
  perfectStreak: 'fq_perfect_streak',
  profile:       'fq_profile',
  history:       'fq_history',
};

function loadState() {
  return {
    xp:            parseInt(localStorage.getItem(STORAGE_KEYS.xp) || '0', 10),
    streak:        parseInt(localStorage.getItem(STORAGE_KEYS.streak) || '0', 10),
    perfectStreak: parseInt(localStorage.getItem(STORAGE_KEYS.perfectStreak) || '0', 10),
  };
}
function save() {
  localStorage.setItem(STORAGE_KEYS.xp,            state.xp);
  localStorage.setItem(STORAGE_KEYS.streak,        state.streak);
  localStorage.setItem(STORAGE_KEYS.perfectStreak, state.perfectStreak);
}
function loadProfile() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.profile) || 'null'); }
  catch { return null; }
}
function saveProfile(p) {
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(p));
}
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || '[]'); }
  catch { return []; }
}
function saveHistory(h) {
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(h));
}
function pushSession(entry) {
  const h = loadHistory();
  h.push(entry);
  saveHistory(h.slice(-200));
}

// ── Estado de sessão ──────────────────────────────────────────
const persisted = loadState();
const state = {
  ...persisted,
  screen:        'homeScreen',
  currentArea:   null,
  currentModule: null,
  questions:     [],
  qIndex:        0,
  correct:       0,
  answered:      false,
  wrongAnswers:  [],
};

// ── Níveis ────────────────────────────────────────────────────
const LEVELS = [
  { level:1, name:'Calouro',       min:0    },
  { level:2, name:'Estudante',     min:80   },
  { level:3, name:'Dedicado',      min:200  },
  { level:4, name:'Aplicado',      min:400  },
  { level:5, name:'Destaque',      min:700  },
  { level:6, name:'Especialista',  min:1100 },
  { level:7, name:'Expert',        min:1600 },
  { level:8, name:'Mestre',        min:2200 },
  { level:9, name:'Referência',    min:3000 },
  { level:10,name:'FisioMestre',   min:4000 },
];
function getLevelData(xp) {
  let cur = LEVELS[0];
  for (const l of LEVELS) { if (xp >= l.min) cur = l; }
  const idx  = LEVELS.indexOf(cur);
  const next = LEVELS[idx + 1];
  const pct  = next
    ? Math.min(100, Math.round(((xp - cur.min) / (next.min - cur.min)) * 100))
    : 100;
  const rem  = next ? next.min - xp : 0;
  return { ...cur, next, pct, rem };
}

// ── Normalize question ────────────────────────────────────────
function normalize(q) {
  return {
    question: q.question || q.q || '',
    options:  q.options  || q.o || [],
    answer:   typeof q.answer !== 'undefined' ? q.answer
              : typeof q.correct !== 'undefined' ? q.correct : 0,
    explain:  q.explain  || q.explanation || '',
  };
}

// ── HUD ───────────────────────────────────────────────────────
function updateHUD() {
  const lvl = getLevelData(state.xp);
  const fmt = n => n >= 1000 ? (n/1000).toFixed(1)+'k' : String(n);
  document.getElementById('statXp').textContent     = fmt(state.xp) + ' XP';
  document.getElementById('statStreak').textContent = state.streak;
  document.getElementById('statRank').textContent   = 'Nível ' + lvl.level;

  const bar = document.getElementById('xpProgressBar');
  if (bar) bar.style.width = lvl.pct + '%';
  const pctEl = document.getElementById('xpProgressPct');
  const remEl = document.getElementById('xpProgressNext');
  if (pctEl) pctEl.textContent = lvl.pct + '% para Nível ' + (lvl.next ? lvl.next.level : lvl.level);
  if (remEl) remEl.textContent = lvl.rem > 0 ? lvl.rem + ' XP restantes' : 'Nível máximo!';

  const profile = loadProfile();
  if (profile) {
    const nameEl   = document.getElementById('profileName');
    const subEl    = document.getElementById('profileSub');
    const avatarEl = document.getElementById('profileAvatar');
    if (nameEl)   nameEl.textContent   = profile.nome || 'Estudante';
    if (avatarEl) avatarEl.textContent = profile.avatar || '👦';
    if (subEl) {
      const parts = [profile.curso, profile.periodo].filter(Boolean);
      subEl.textContent = parts.length ? parts.join(' · ') : '—';
    }
  }
}

// ── Screens ───────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  state.screen = id;

  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.target === id);
  });

  if (id === 'statsScreen') renderStats();
  if (id === 'rankingScreen') renderRanking();
  if (id === 'achievementsScreen') renderAchievements();
}

// ── Área / Módulos ─────────────────────────────────────────────
function buildAreaTabs() {
  const tabs      = document.getElementById('areaTabs');
  const list      = document.getElementById('moduleList');
  const areaCount = document.getElementById('areaCount');
  const areaKeys  = Object.keys(AREAS);

  let totalModules = 0;
  areaKeys.forEach(k => { totalModules += (AREAS[k].modules || []).length; });
  if (areaCount) areaCount.textContent = totalModules + ' módulos';

  let activeArea = areaKeys[0];

  function renderTabs() {
    tabs.innerHTML = '';
    areaKeys.forEach(key => {
      const area = AREAS[key];
      const btn  = document.createElement('button');
      btn.className  = 'area-tab' + (key === activeArea ? ' active' : '');
      btn.innerHTML  = `${area.icon || ''} ${area.label}`;
      btn.addEventListener('click', () => { activeArea = key; renderTabs(); renderModules(); });
      tabs.appendChild(btn);
    });
  }

  function renderModules() {
    list.innerHTML = '';
    const mods = AREAS[activeArea]?.modules || [];
    mods.forEach(mod => {
      const card = document.createElement('div');
      card.className = 'module-card';
      card.style.setProperty('--mod-color', mod.color || '#e8f6ef');
      card.innerHTML = `
        <div class="module-icon">${mod.icon || '📚'}</div>
        <div class="module-info">
          <strong>${mod.title}</strong>
          <span>${mod.subtitle || ''}</span>
        </div>
        <div class="module-arrow">›</div>`;
      card.addEventListener('click', () => startLesson(activeArea, mod.id));
      list.appendChild(card);
    });
  }

  renderTabs();
  renderModules();
}

// ── Iniciar lição ─────────────────────────────────────────────
function startLesson(areaKey, moduleId) {
  const area = AREAS[areaKey];
  const mod  = area?.modules?.find(m => m.id === moduleId);
  if (!mod) return;

  const pool = (mod.questions || []).map(normalize);
  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, QUESTIONS_PER_SESSION);

  state.currentArea   = areaKey;
  state.currentModule = moduleId;
  state.questions     = shuffled;
  state.qIndex        = 0;
  state.correct       = 0;
  state.answered      = false;
  state.wrongAnswers  = [];

  document.getElementById('lessonTag').textContent   = area.label;
  document.getElementById('lessonTitle').textContent = mod.title;

  showScreen('lessonScreen');
  renderQuestion();
}

// ── Verificar se lição está em andamento ──────────────────────
function isLessonInProgress() {
  return state.screen === 'lessonScreen' &&
         state.questions.length > 0 &&
         state.qIndex < state.questions.length;
}

// ── Modal de saída ────────────────────────────────────────────
let _exitCallback = null;

function showExitModal(onConfirm) {
  _exitCallback = onConfirm;
  document.getElementById('exitModal')?.classList.add('visible');
}

function hideExitModal() {
  document.getElementById('exitModal')?.classList.remove('visible');
  _exitCallback = null;
}

function initExitModal() {
  document.getElementById('exitCancelBtn')?.addEventListener('click', hideExitModal);
  document.getElementById('exitModal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) hideExitModal();
  });
  document.getElementById('exitConfirmBtn')?.addEventListener('click', () => {
    const cb = _exitCallback;
    hideExitModal();
    if (cb) cb();
  });
}

// ── Render Question ───────────────────────────────────────────
function renderQuestion() {
  const q     = state.questions[state.qIndex];
  const norm  = q; // já normalizado
  const total = state.questions.length;

  state.answered = false;

  document.getElementById('questionCounter').textContent = `${state.qIndex + 1}/${total}`;
  document.getElementById('questionText').textContent    = norm.question;

  const pct = Math.round((state.qIndex / total) * 100);
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent  = pct + '%';

  const answersEl = document.getElementById('answers');
  answersEl.innerHTML = '';

  norm.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'answer';
    btn.textContent = opt;
    btn.addEventListener('click', () => handleAnswer(i));
    answersEl.appendChild(btn);
  });

  const nextBtn = document.getElementById('nextBtn');
  nextBtn.disabled    = true;
  nextBtn.textContent = 'Responda primeiro';

  document.getElementById('feedbackCard').classList.remove('visible', 'correct', 'wrong');
  document.getElementById('feedbackPlaceholder').style.display = 'block';
  document.getElementById('feedbackExplainWrap').style.display = 'none';
}

// ── Handle Answer ─────────────────────────────────────────────
function handleAnswer(chosen) {
  if (state.answered) return;
  state.answered = true;

  const q      = state.questions[state.qIndex];
  const isOk   = chosen === q.answer;

  if (isOk) {
    state.correct++;
    state.streak++;
  } else {
    state.streak = 0;
    state.wrongAnswers.push({
      question: q.question,
      chosen:   q.options[chosen],
      correct:  q.options[q.answer],
      explain:  q.explain || '',
    });
  }
  save();
  updateHUD();

  // Estilizar botões
  document.querySelectorAll('.answer').forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.answer) btn.classList.add('correct');
    else if (i === chosen) btn.classList.add('wrong');
  });

  // Feedback
  document.getElementById('feedbackPlaceholder').style.display = 'none';

  const card  = document.getElementById('feedbackCard');
  card.classList.add('visible', isOk ? 'correct' : 'wrong');

  document.getElementById('feedbackIcon').textContent   = isOk ? '✅' : '❌';
  document.getElementById('feedbackStatus').textContent = isOk ? 'Correto!' : 'Incorreto';
  document.getElementById('feedbackCorrectText').textContent = q.options[q.answer];

  const explainWrap = document.getElementById('feedbackExplainWrap');
  if (q.explain) {
    explainWrap.style.display = 'flex';
    document.getElementById('feedbackExplainText').textContent = q.explain;
  } else {
    explainWrap.style.display = 'none';
  }

  const nextBtn = document.getElementById('nextBtn');
  nextBtn.disabled    = false;
  nextBtn.textContent = state.qIndex + 1 < state.questions.length ? 'Próxima →' : 'Ver resultado';
}

// ── Confetti ──────────────────────────────────────────────────
function launchConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  const ctx    = canvas.getContext('2d');
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  canvas.style.display = 'block';

  const pieces = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: -10 - Math.random() * 100,
    w: 8 + Math.random() * 8,
    h: 5 + Math.random() * 5,
    r: Math.random() * Math.PI * 2,
    dr: (Math.random() - 0.5) * 0.2,
    vy: 2 + Math.random() * 3,
    vx: (Math.random() - 0.5) * 2,
    color: ['#0d8f67','#f5c842','#e84393','#4fa8e8','#ff6b35'][Math.floor(Math.random()*5)],
  }));

  let frame;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
      p.y += p.vy; p.x += p.vx; p.r += p.dr;
    });
    if (pieces.some(p => p.y < canvas.height)) frame = requestAnimationFrame(draw);
    else { canvas.style.display = 'none'; cancelAnimationFrame(frame); }
  }
  draw();
}

// ── Mascote fala ──────────────────────────────────────────────
function getMascoteFala(pct, streak) {
  if (pct === 100) return streak >= 2
    ? `🔥 ${streak}× perfeito! Você é incrível!`
    : '🏆 Perfeito! Você dominou o conteúdo!';
  if (pct >= 70) return '😊 Ótimo trabalho! Continue assim!';
  if (pct >= 50) return '👍 Bom esforço! Revise e melhore!';
  return '💪 Não desista! Revise o conteúdo e tente de novo!';
}

// ── Mascote animação ──────────────────────────────────────────
function animateMascote() {
  const img = document.getElementById('mascoteImg');
  if (!img) return;
  img.classList.remove('mascote-bounce');
  void img.offsetWidth;
  img.classList.add('mascote-bounce');
}

// ── Resultado ───────────────────────────────────────────────
function showResult() {
  const total   = state.questions.length;
  const correct = state.correct;
  const pct     = Math.round((correct / total) * 100);

  const xpEarned = correct * 10 + (pct === 100 ? 50 : 0);

  const prevLvl = getLevelData(state.xp).level;
  if (pct === 100) {
    state.perfectStreak++;
  } else {
    state.perfectStreak = 0;
  }

  state.xp += xpEarned;
  save();

  const newLvl  = getLevelData(state.xp).level;
  const levelUp = newLvl > prevLvl;

  updateHUD();

  document.getElementById('scoreRing').style.setProperty('--percent', pct);
  document.getElementById('finalScore').textContent   = pct + '%';
  document.getElementById('correctCount').textContent = `${correct}/${total}`;
  document.getElementById('earnedXp').textContent     = '+' + xpEarned + ' XP';
  document.getElementById('mascoteFala').textContent  = getMascoteFala(pct, state.perfectStreak);

  const lvl        = getLevelData(state.xp);
  const levelBadge = document.getElementById('resultLevelBadge');
  if (levelBadge) {
    levelBadge.textContent = `Nível ${lvl.level} — ${lvl.name}`;
    levelBadge.className   = 'result-level-badge' + (levelUp ? ' level-up' : '');
  }

  const streakBadge = document.getElementById('resultPerfectStreak');
  if (streakBadge) {
    if (state.perfectStreak >= 2) {
      streakBadge.textContent = `🔥 ${state.perfectStreak}× 100% consecutivos!`;
      streakBadge.style.display = 'block';
    } else {
      streakBadge.style.display = 'none';
    }
  }

  let title, text;
  if      (pct === 100) { title = '🏆 Perfeito!';         text = 'Acertou todas! Excelente desempenho!'; }
  else if (pct >= 70)   { title = '🎉 Muito bem!';         text = 'Ótimo resultado. Continue praticando!'; }
  else if (pct >= 50)   { title = '👍 Bom trabalho!';      text = 'Metade certa. Revise e tente de novo!'; }
  else                  { title = '💪 Continue tentando!'; text = 'Revise o conteúdo e repita a sessão.'; }

  document.getElementById('resultTitle').textContent = title;
  document.getElementById('resultText').textContent  = text;

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

// ── Compartilhar Resultado ───────────────────────────────────────
async function shareResult() {
  const btn = document.getElementById('shareResultBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Gerando...'; }

  const card = document.querySelector('#resultScreen .result-card');
  try {
    const canvas = await html2canvas(card, {
      backgroundColor: getComputedStyle(document.documentElement)
        .getPropertyValue('--color-surface').trim() || '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    const area = AREAS[state.currentArea];
    const mod  = area?.modules?.find(m => m.id === state.currentModule);
    const pct  = Math.round((state.correct / state.questions.length) * 100);
    const shareTitle = 'FisioQuest — ' + (mod?.title || 'Módulo') + ': ' + pct + '% de acerto';

    if (navigator.canShare && navigator.canShare({ files: [new File([blob], 'resultado.png', { type: 'image/png' })] })) {
      await navigator.share({ title: shareTitle, files: [new File([blob], 'resultado.png', { type: 'image/png' })] });
    } else if (navigator.share) {
      await navigator.share({ title: shareTitle, text: shareTitle + '\nJogue no FisioQuest!' });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'fisioquest-resultado-' + pct + 'pct.png';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    }
  } catch (e) {
    console.warn('Share falhou:', e);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '📤 Compartilhar resultado'; }
  }
}

// ── Toast de Level Up ────────────────────────────────────────────
function showLevelUpToast(lvl) {
  let toast = document.getElementById('levelUpToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'levelUpToast';
    document.querySelector('.app').appendChild(toast);
  }
  toast.innerHTML = `⬆️ Subiu para <strong>Nível ${lvl.level}</strong> — ${lvl.name}!`;
  toast.className = 'show';
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ── Painel de revisão ─────────────────────────────────────────
function buildReviewPanel(wrongs) {
  const sec    = document.getElementById('reviewSection');
  const list   = document.getElementById('reviewList');
  const toggle = document.getElementById('reviewToggle');
  const count  = document.getElementById('reviewCount');

  if (!wrongs.length) { if (sec) sec.style.display = 'none'; return; }
  if (sec)   sec.style.display   = 'block';
  if (count) count.textContent   = `(${wrongs.length})`;

  list.innerHTML = '';
  wrongs.forEach(w => {
    const item = document.createElement('div');
    item.className = 'review-item';
    item.innerHTML = `
      <p class="ri-q">${w.question}</p>
      <p class="ri-wrong">❌ Sua resposta: <em>${w.chosen}</em></p>
      <p class="ri-correct">✅ Correta: <em>${w.correct}</em></p>
      ${w.explain ? `<p class="ri-explain">💡 ${w.explain}</p>` : ''}`;
    list.appendChild(item);
  });

  let open = false;
  if (toggle) toggle.onclick = () => {
    open = !open;
    list.classList.toggle('visible', open);
    const arrow = toggle.querySelector('.review-arrow');
    if (arrow) arrow.textContent = open ? '▲' : '▼';
  };
}

// ── Stats ─────────────────────────────────────────────────────
function renderStats() {
  const history = loadHistory();

  document.getElementById('kpiXp').textContent       = state.xp;
  document.getElementById('kpiSessions').textContent = history.length;

  if (history.length) {
    const avg  = Math.round(history.reduce((s, h) => s + h.pct, 0) / history.length);
    const best = Math.max(...history.map(h => h.pct));
    document.getElementById('kpiAvg').textContent  = avg + '%';
    document.getElementById('kpiBest').textContent = best + '%';
  } else {
    document.getElementById('kpiAvg').textContent  = '—';
    document.getElementById('kpiBest').textContent = '—';
  }

  renderBarChart(history);
  renderModuleStats(history);
  renderSessionLog(history);
}

function renderBarChart(history) {
  const el = document.getElementById('barChart');
  if (!el) return;
  const last = history.slice(-10);
  if (!last.length) {
    el.innerHTML = '<p class="empty-chart">Complete sessões para ver sua evolução aqui.</p>';
    return;
  }
  el.innerHTML = last.map(h => {
    const h_pct = h.pct;
    const color = h_pct >= 70 ? 'var(--color-primary)' : h_pct >= 50 ? 'var(--color-warning)' : 'var(--color-error)';
    return `<div class="bar-wrap">
      <div class="bar" style="height:${h_pct}%;background:${color}" title="${h_pct}%"></div>
      <span class="bar-label">${h_pct}%</span>
    </div>`;
  }).join('');
}

function renderModuleStats(history) {
  const el = document.getElementById('moduleStats');
  if (!el) return;
  if (!history.length) { el.innerHTML = '<p class="empty-chart">Nenhuma sessão registrada ainda.</p>'; return; }

  const map = {};
  history.forEach(h => {
    if (!map[h.moduleTitle]) map[h.moduleTitle] = { total: 0, count: 0 };
    map[h.moduleTitle].total += h.pct;
    map[h.moduleTitle].count++;
  });

  el.innerHTML = Object.entries(map).map(([title, d]) => {
    const avg   = Math.round(d.total / d.count);
    const color = avg >= 70 ? 'var(--color-primary)' : avg >= 50 ? 'var(--color-warning)' : 'var(--color-error)';
    return `<div class="module-stat-row">
      <div class="module-stat-top">
        <span class="module-stat-name">${title}</span>
        <span class="module-stat-pct">${avg}%</span>
      </div>
      <div class="module-bar-bg"><div class="module-bar-fill" style="width:${avg}%;background:${color}"></div></div>
      <span class="module-stat-sub">${d.count} sessão(ões)</span>
    </div>`;
  }).join('');
}

function renderSessionLog(history) {
  const el = document.getElementById('sessionLog');
  if (!el) return;
  if (!history.length) { el.innerHTML = '<p class="empty-chart">Nenhuma atividade ainda.</p>'; return; }
  const sorted = [...history].reverse().slice(0, 20);
  el.innerHTML = sorted.map(h => {
    const d    = new Date(h.ts);
    const date = d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
    const time = d.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
    const color = h.pct >= 70 ? 'var(--color-primary)' : h.pct >= 50 ? 'var(--color-warning)' : 'var(--color-error)';
    return `<div class="session-entry">
      <div class="session-info">
        <span class="session-module">${h.moduleTitle}</span>
        <span class="session-date">${date} · ${time}</span>
      </div>
      <span class="session-badge" style="color:${color}">${h.pct}%</span>
    </div>`;
  }).join('');
}

// ── Onboarding ────────────────────────────────────────────────
function initOnboarding() {
  const overlay = document.getElementById('onboardingOverlay');
  const profile = loadProfile();
  if (!profile) overlay.style.display = 'flex';

  // Avatar grid
  document.querySelectorAll('.avatar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.avatar-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  document.getElementById('onboardingSaveBtn').addEventListener('click', () => {
    const nome        = document.getElementById('inputNome').value.trim();
    const instituicao = document.getElementById('selectInstituicao').value;
    const curso       = document.getElementById('selectCurso').value;
    const periodo     = document.getElementById('selectPeriodo').value;
    const avatar      = document.querySelector('.avatar-btn.active')?.dataset.avatar || '👦';
    if (!nome) { alert('Por favor, informe seu nome.'); return; }
    saveProfile({ nome, avatar, instituicao, curso, periodo });
    overlay.style.display = 'none';
    updateHUD();
  });

  // Botão editar perfil
  document.getElementById('profileEditBtn')?.addEventListener('click', () => {
    const p = loadProfile();
    if (p) {
      document.getElementById('inputNome').value = p.nome || '';
      document.getElementById('selectInstituicao').value = p.instituicao || '';
      document.getElementById('selectCurso').value = p.curso || '';
      document.getElementById('selectPeriodo').value = p.periodo || '';
      const activeAvatar = document.querySelector(`.avatar-btn[data-avatar="${p.avatar}"]`);
      if (activeAvatar) {
        document.querySelectorAll('.avatar-btn').forEach(b => b.classList.remove('active'));
        activeAvatar.classList.add('active');
      }
    }
    overlay.style.display = 'flex';
  });
}

// ── Tema ──────────────────────────────────────────────────────
function initTheme() {
  const toggle  = document.getElementById('themeToggle');
  const iconEl  = document.getElementById('themeIcon');
  const html    = document.documentElement;
  const saved   = localStorage.getItem('fq_theme');
  const system  = window.matchMedia('(prefers-color-scheme: dark)').matches;
  let dark = saved ? saved === 'dark' : system;
  html.setAttribute('data-theme', dark ? 'dark' : 'light');
  if (iconEl) iconEl.textContent = dark ? '☀️' : '🌙';
  toggle?.addEventListener('click', () => {
    dark = !dark;
    html.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('fq_theme', dark ? 'dark' : 'light');
    if (iconEl) iconEl.textContent = dark ? '☀️' : '🌙';
  });
}

function renderRanking() {
  const profile = loadProfile();
  const myName = profile?.nome || 'Você';
  const myAvatar = profile?.avatar || '👦';
  const myCourse = profile?.curso || 'Fisioterapia';

  const players = [
    { name: 'Ana Lima', avatar: '🩺', course: 'Fisioterapia', xp: 1450 },
    { name: 'Carlos M.', avatar: '🧠', course: 'Medicina', xp: 1320 },
    { name: 'Fernanda S.', avatar: '🔬', course: 'Biomedicina', xp: 1180 },
    { name: myName, avatar: myAvatar, course: myCourse, xp: state.xp, me: true },
    { name: 'Juliana R.', avatar: '💪', course: 'Ed. Física', xp: 760 },
    { name: 'Pedro A.', avatar: '⚕️', course: 'Enfermagem', xp: 540 },
    { name: 'Marina T.', avatar: '🩻', course: 'Fisioterapia', xp: 320 }
  ];

  const sorted = [...players].sort((a, b) => b.xp - a.xp);

  const podium = sorted.slice(0, 3);
  const podiumVisual = [podium[1], podium[0], podium[2]].filter(Boolean);

  const podiumEl = document.getElementById('rankingPodium');
  const listEl = document.getElementById('rankingList');

  podiumEl.innerHTML = podiumVisual.map(player => {
    const position = sorted.findIndex(p => p.name === player.name && p.xp === player.xp) + 1;
    return `
      <div class="podium-card ${position === 1 ? 'first' : ''} ${player.me ? 'me' : ''}">
        <div class="podium-place">${position}º lugar</div>
        <div class="podium-avatar">${player.avatar}</div>
        <div class="podium-name">
          ${player.name}
          ${player.me ? '<span class="ranking-badge">Você</span>' : ''}
        </div>
        <div class="podium-xp">${player.xp} XP</div>
      </div>
    `;
  }).join('');

  listEl.innerHTML = sorted.map((player, index) => `
    <div class="ranking-item ${player.me ? 'me' : ''}">
      <div class="ranking-position">${index + 1}</div>
      <div class="ranking-avatar">${player.avatar}</div>
      <div class="ranking-info">
        <div class="ranking-name">
          ${player.name}
          ${player.me ? '<span class="ranking-badge">Você</span>' : ''}
        </div>
        <div class="ranking-sub">${player.course}</div>
      </div>
      <div class="ranking-score">${player.xp} XP</div>
    </div>
  `).join('');
}

function renderAchievements() {
  const history = loadHistory();
  const sessions = history.length;
  const avgScore = sessions
    ? Math.round(history.reduce((sum, item) => sum + item.pct, 0) / sessions)
    : 0;

  const achievements = [
    {
      icon: '🌱',
      title: 'Primeiro passo',
      desc: 'Conclua sua primeira sessão no FisioQuest.',
      current: sessions,
      target: 1
    },
    {
      icon: '📚',
      title: 'Estudante ativo',
      desc: 'Complete 5 sessões de estudo.',
      current: sessions,
      target: 5
    },
    {
      icon: '⚡',
      title: 'Acumulador de XP',
      desc: 'Alcance 500 XP total.',
      current: state.xp,
      target: 500
    },
    {
      icon: '🔥',
      title: 'Em sequência',
      desc: 'Atinga uma sequência de 3 respostas corretas.',
      current: state.streak,
      target: 3
    },
    {
      icon: '🏆',
      title: 'Perfeição',
      desc: 'Conclua uma sessão com 100% de acertos.',
      current: state.perfectStreak > 0 ? 1 : 0,
      target: 1
    },
    {
      icon: '🎯',
      title: 'Bom desempenho',
      desc: 'Tenha média geral igual ou maior que 70%.',
      current: avgScore,
      target: 70
    },
    {
      icon: '👑',
      title: 'Veterano',
      desc: 'Alcance o nível 5 no FisioQuest.',
      current: getLevelData(state.xp).level,
      target: 5
    }
  ];

  const unlockedCount = achievements.filter(a => a.current >= a.target).length;

  const summaryEl = document.getElementById('achievementsSummary');
  const listEl = document.getElementById('achievementsList');

  summaryEl.innerHTML = `
    <div class="achievement-kpi">
      <strong>${unlockedCount}</strong>
      <span>Conquistas desbloqueadas</span>
    </div>
    <div class="achievement-kpi">
      <strong>${achievements.length - unlockedCount}</strong>
      <span>Conquistas restantes</span>
    </div>
  `;

  listEl.innerHTML = achievements.map(item => {
    const unlocked = item.current >= item.target;
    const pct = Math.min(100, Math.round((item.current / item.target) * 100));

    return `
      <div class="achievement-card ${unlocked ? 'unlocked' : 'locked'}">
        <div class="achievement-icon">${item.icon}</div>
        <div class="achievement-content">
          <div class="achievement-top">
            <div class="achievement-title">${item.title}</div>
            <div class="achievement-status ${unlocked ? 'unlocked' : 'locked'}">
              ${unlocked ? 'Desbloqueada' : 'Em progresso'}
            </div>
          </div>
          <div class="achievement-desc">${item.desc}</div>
          <div class="achievement-progress">
            <div class="achievement-progress-label">
              <span>${Math.min(item.current, item.target)} / ${item.target}</span>
              <span>${pct}%</span>
            </div>
            <div class="achievement-progress-bar">
              <div class="achievement-progress-fill" style="width:${pct}%"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateHUD();
  initOnboarding();
  initTheme();
  initExitModal();
  buildAreaTabs();

  document.getElementById('nextBtn').addEventListener('click', () => {
    if (!state.answered) return;
    state.qIndex++;
    if (state.qIndex >= state.questions.length) showResult();
    else renderQuestion();
  });

  // Botão "← Voltar" — pede confirmação se lição em andamento
  document.getElementById('backHomeBtn').addEventListener('click', () => {
    if (isLessonInProgress()) {
      showExitModal(() => showScreen('homeScreen'));
    } else {
      showScreen('homeScreen');
    }
  });

  document.getElementById('restartModuleBtn').addEventListener('click', () =>
    startLesson(state.currentArea, state.currentModule)
  );

  document.getElementById('goHomeFromResultBtn').addEventListener('click', () =>
    showScreen('homeScreen')
  );

  document.getElementById('shareResultBtn')?.addEventListener('click', shareResult);

  document.getElementById('clearStatsBtn').addEventListener('click', () => {
    if (confirm('Limpar todo o histórico de sessões?')) {
      saveHistory([]);
      renderStats();
    }
  });

  // Ranking
  document.getElementById('openRankingBtn')?.addEventListener('click', () => {
    showScreen('rankingScreen');
  });

  document.getElementById('backHomeFromRankingBtn')?.addEventListener('click', () => {
    showScreen('homeScreen');
  });

  // Conquistas
  document.getElementById('openAchievementsBtn')?.addEventListener('click', () => {
    showScreen('achievementsScreen');
  });

  document.getElementById('backHomeFromAchievementsBtn')?.addEventListener('click', () => {
    showScreen('homeScreen');
  });

   // Sobre
document.getElementById('openAboutBtn')?.addEventListener('click', () => {
  showScreen('aboutScreen');
});

document.getElementById('backHomeFromAboutBtn')?.addEventListener('click', () => {
  showScreen('homeScreen');
});
   
  // Nav inferior — pede confirmação se tentar sair durante lição
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.target;
      if (!t) return;
      if (t !== 'lessonScreen' && isLessonInProgress()) {
        showExitModal(() => showScreen(t));
      } else {
        showScreen(t);
      }
    });
  });
});
