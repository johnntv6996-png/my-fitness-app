// modules/workouts.js

const WorkoutsModule = {
  exerciseTimers: {},

  init() {
    console.log('🏋️ Workouts module initialized');
    if (typeof Logger !== 'undefined') Logger.log('Модуль тренировок инициализирован', 'info');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  },

  setup() {
    this.createTodayPlanScreen();
    
    if (typeof Core !== 'undefined') {
      Core.addNavButton('План', 'plan', '📝');
      Core.addNavButton('База', 'exercises', '📚');
    }
  },

  createTodayPlanScreen() {
    let screen = document.getElementById('screen-todayPlan');
    if (!screen) {
      screen = document.createElement('div');
      screen.id = 'screen-todayPlan';
      screen.className = 'screen';
      document.getElementById('userInterface').appendChild(screen);
    }

    const todayIdx = (new Date().getDay() + 6) % 7;
    const dayName = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'][todayIdx];
    const plan = FTStorage.get('plan') || [];
    const todayPlan = plan[todayIdx];
    const db = FTStorage.get('db') || [];
    const history = FTStorage.get('history') || [];
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayRecord = history.find(h => h.date === todayStr && h.dayName === dayName);

    if (!todayPlan || todayPlan.exercises.length === 0) {
      screen.innerHTML = `
        <div style="text-align:center;padding:40px">
          <div style="font-size:4em;margin-bottom:15px">📝</div>
          <h2>План на сегодня пуст</h2>
          <p class="text-small" style="margin-bottom:20px">Добавьте упражнения в разделе "План"</p>
          <button class="btn btn-primary" onclick="Core.navigate('plan')">Перейти к плану</button>
        </div>
      `;
      return;
    }

    const doneCount = todayRecord ? todayRecord.exercises.length : 0;
    const totalCount = todayPlan.exercises.length;
    const allDone = doneCount === totalCount;

    let html = `
      <div style="background:var(--card);border-radius:10px;padding:15px 20px;margin-bottom:15px;border-left:4px solid var(--acc)">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
          <div>
            <h2 style="color:var(--acc);margin:0">🏋️ ${dayName}</h2>
            <div class="text-small">${FTUtils.escapeHtml(todayPlan.muscleGroup || 'Тренировка')}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:1.5em;color:var(--acc);font-weight:bold">${doneCount}/${totalCount}</div>
            <div class="text-small">выполнено</div>
          </div>
        </div>
        ${allDone ? `<div style="background:rgba(144,238,144,.15);border:1px solid var(--ok);padding:10px;border-radius:6px;margin-top:10px;text-align:center;color:var(--ok);font-weight:bold">🎉 День завершён!</div>` : ''}
      </div>
      <div id="exercisesAccordion"></div>
      <button class="btn btn-secondary" style="width:100%;margin-top:15px" onclick="Core.navigate('welcome')">← На главную</button>
    `;

    screen.innerHTML = html;

    const acc = document.getElementById('exercisesAccordion');
    todayPlan.exercises.forEach((exRef, exIdx) => {
      const ex = db.find(e => e.id === exRef.id);
      if (!ex) return;
      const isDone = todayRecord && todayRecord.exercises.some(e => e.id === exRef.id);
      
      const details = document.createElement('details');
      details.className = 'ex-acc';
      details.style.cssText = 'background:var(--card);border-radius:10px;margin-bottom:12px;overflow:hidden';
      if (isDone) details.classList.add('done');
      
      details.innerHTML = `
        <summary style="padding:15px 20px;cursor:pointer;font-weight:600;display:flex;justify-content:space-between;align-items:center;list-style:none">
          <div style="flex:1;display:flex;align-items:center;gap:10px">
            <input type="checkbox" ${isDone?'checked':''} onclick="event.stopPropagation();WorkoutsModule.toggleExerciseDone('${exRef.id}',this.checked)" style="width:20px;height:20px;accent-color:var(--ok)">
            <div>
              <div>${exIdx+1}. ${FTUtils.escapeHtml(ex.name)}</div>
              <div class="text-small">${FTUtils.escapeHtml(exRef.sets || '')}</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            ${isDone ? '<span style="color:var(--ok);font-weight:bold">✅</span>' : ''}
            <span>▼</span>
          </div>
        </summary>
        <div style="padding:0 20px 20px;border-top:1px solid var(--brd)">
          ${ex.videoUrl ? `<div style="background:var(--bg);padding:12px;border-radius:8px;margin-top:12px"><div style="font-weight:600;color:var(--acc);margin-bottom:8px">📺 Видео</div><div style="aspect-ratio:16/9;background:#000;border-radius:6px;overflow:hidden"><iframe src="${FTUtils.escapeHtml(this.parseVideoUrl(ex.videoUrl)?.embedUrl || '')}" style="width:100%;height:100%;border:none" allowfullscreen></iframe></div></div>` : ''}
          ${ex.description ? `<div style="background:var(--bg);padding:12px;border-radius:8px;margin-top:12px"><div style="font-weight:600;color:var(--acc);margin-bottom:8px">📝 Описание</div><div style="white-space:pre-wrap">${FTUtils.escapeHtml(ex.description)}</div></div>` : ''}
          
          <div style="background:var(--bg);padding:12px;border-radius:8px;margin-top:12px">
            <div style="font-weight:600;color:var(--acc);margin-bottom:8px">⏱ Таймер</div>
            <div id="timer-setup-${exRef.id}">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
                <div><label class="text-small">Режим:</label><select id="t-mode-${exRef.id}" onchange="WorkoutsModule.onTimerModeChange('${exRef.id}')"><option value="regular">Обычное</option><option value="static">Статика</option></select></div>
                <div><label class="text-small">Задержка (с):</label><input type="number" id="t-prep-${exRef.id}" value="5" min="0" max="60"></div>
              </div>
              <div id="t-regular-${exRef.id}">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
                  <div><label class="text-small">Время повтора (с):</label><input type="number" id="t-rep-${exRef.id}" value="3" min="1" max="60"></div>
                  <div><label class="text-small">Повторов:</label><input type="number" id="t-reps-${exRef.id}" value="10" min="1" max="100"></div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
                  <div><label class="text-small">Отдых (с):</label><input type="number" id="t-rest-${exRef.id}" value="60" min="0" max="300"></div>
                  <div><label class="text-small">Подходов:</label><input type="number" id="t-sets-${exRef.id}" value="3" min="1" max="20"></div>
                </div>
              </div>
              <div id="t-static-${exRef.id}" style="display:none">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
                  <div><label class="text-small">Удержание (с):</label><input type="number" id="t-hold-${exRef.id}" value="30" min="5" max="600"></div>
                  <div><label class="text-small">Удержаний:</label><input type="number" id="t-holds-${exRef.id}" value="3" min="1" max="20"></div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
                  <div><label class="text-small">Отдых (с):</label><input type="number" id="t-srest-${exRef.id}" value="30" min="0" max="300"></div>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
                <div><label class="text-small">Вес (кг):</label><input type="number" id="t-weight-${exRef.id}" step="0.5" placeholder="—"></div>
                <div style="display:flex;gap:8px;align-items:flex-end">
                  <label class="text-small"><input type="checkbox" id="t-sound-${exRef.id}" checked> 🔊</label>
                  <label class="text-small"><input type="checkbox" id="t-vibro-${exRef.id}" checked> 📳</label>
                </div>
              </div>
              <button class="btn btn-primary" style="width:100%" onclick="WorkoutsModule.startExerciseTimer('${exRef.id}')">▶ Запустить таймер</button>
            </div>
            <div id="timer-running-${exRef.id}" style="display:none;text-align:center">
              <div style="display:inline-block;background:var(--acc);color:#2c3e50;padding:4px 12px;border-radius:15px;font-size:.85em;font-weight:bold;margin-bottom:10px" id="t-phase-${exRef.id}">ПОДГОТОВКА</div>
              <div style="font-size:4em;font-weight:bold;color:var(--acc);font-family:'Courier New',monospace;margin:15px 0" id="t-display-${exRef.id}">00:00</div>
              <div class="text-small" id="t-info-${exRef.id}">Приготовьтесь...</div>
              <div style="height:8px;background:var(--brd);border-radius:4px;overflow:hidden;margin:10px 0"><div id="t-progress-${exRef.id}" style="height:100%;background:var(--acc);transition:width .3s;width:0%"></div></div>
              <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:15px">
                <button class="btn btn-secondary" onclick="WorkoutsModule.pauseExerciseTimer('${exRef.id}')" id="t-pause-${exRef.id}">⏸ Пауза</button>
                <button class="btn btn-danger" onclick="WorkoutsModule.skipExerciseTimer('${exRef.id}')">⏭ Пропустить</button>
                <button class="btn btn-danger" onclick="WorkoutsModule.abortExerciseTimer('${exRef.id}')">🛑 Прервать</button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      acc.appendChild(details);
    });
  },

  parseVideoUrl(url) {
    if (!url) return null;
    url = url.trim();
    let m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (m) return { type: 'iframe', embedUrl: `https://www.youtube.com/embed/${m[1]}`, sourceName: 'YouTube' };
    m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (m) return { type: 'iframe', embedUrl: `https://player.vimeo.com/video/${m[1]}`, sourceName: 'Vimeo' };
    m = url.match(/rutube\.ru\/(?:video|play\/embed)\/([a-zA-Z0-9]+)/);
    if (m) return { type: 'iframe', embedUrl: `https://rutube.ru/play/embed/${m[1]}`, sourceName: 'Rutube' };
    m = url.match(/(?:vk\.com|vkvideo\.ru)\/video(?:_?)(-?\d+)_(\d+)(?:\?list=([a-zA-Z0-9]+))?/);
    if (m) return { type: 'iframe', embedUrl: `https://vk.com/video_ext.php?oid=${m[1]}&id=${m[2]}${m[3] ? '&list=' + m[3] : ''}&hd=2`, sourceName: 'VK Video' };
    if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) return { type: 'video', directUrl: url, sourceName: 'Видеофайл' };
    return null;
  },

  toggleExerciseDone(exId, checked) {
    const dayName = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'][(new Date().getDay() + 6) % 7];
    const todayStr = new Date().toISOString().slice(0, 10);
    let history = FTStorage.get('history') || [];
    let plan = FTStorage.get('plan') || [];
    let stats = FTStorage.get('stats') || {yes:0,later:0,no:0,xp:0,level:1,streak:0};

    let dayRecord = history.find(h => h.date === todayStr && h.dayName === dayName);
    if (!dayRecord) {
      dayRecord = { date: todayStr, dayName: dayName, muscleGroup: plan[(new Date().getDay()+6)%7]?.muscleGroup || '', exercises: [], details: [], duration: 0, timestamp: Date.now() };
      history.push(dayRecord);
    }
    dayRecord.skipped = false;

    if (checked) {
      if (!dayRecord.exercises.find(e => e.id === exId)) {
        dayRecord.exercises.push({ id: exId });
        // XP за упражнение
        stats.xp += 5;
        const xpNeeded = stats.level * 100;
        if (stats.xp >= xpNeeded) {
          stats.xp -= xpNeeded;
          stats.level++;
          setTimeout(() => alert(`🎉 Новый уровень ${stats.level}!\n\nПричина: Выполнение упражнения`), 100);
        }
      }
    } else {
      dayRecord.exercises = dayRecord.exercises.filter(e => e.id !== exId);
      dayRecord.details = (dayRecord.details || []).filter(d => d.exId !== exId);
    }

    FTStorage.set('history', history);
    FTStorage.set('stats', stats);
    this.createTodayPlanScreen();

    const allDone = dayRecord.exercises.length === plan[(new Date().getDay()+6)%7]?.exercises.length;
    if (allDone && plan[(new Date().getDay()+6)%7]?.exercises.length > 0 && checked) {
      stats.yes++;
      stats.xp += 20;
      FTStorage.set('stats', stats);
      setTimeout(() => {
        alert(`🎉 День "${dayName}" завершён!`);
        // Здесь можно вызвать showPostWorkoutSurvey() если будет модуль survey
      }, 100);
    }
  },

  onTimerModeChange(exId) {
    const mode = document.getElementById(`t-mode-${exId}`).value;
    document.getElementById(`t-regular-${exId}`).style.display = mode === 'regular' ? 'block' : 'none';
    document.getElementById(`t-static-${exId}`).style.display = mode === 'static' ? 'block' : 'none';
  },

  startExerciseTimer(exId) {
    const mode = document.getElementById(`t-mode-${exId}`).value;
    const soundEnabled = document.getElementById(`t-sound-${exId}`).checked;
    const vibroEnabled = document.getElementById(`t-vibro-${exId}`).checked;
    
    let config;
    if (mode === 'regular') {
      config = {
        mode: 'regular',
        prepTime: parseInt(document.getElementById(`t-prep-${exId}`).value) || 5,
        repTime: parseInt(document.getElementById(`t-rep-${exId}`).value) || 3,
        reps: parseInt(document.getElementById(`t-reps-${exId}`).value) || 10,
        restTime: parseInt(document.getElementById(`t-rest-${exId}`).value) || 60,
        sets: parseInt(document.getElementById(`t-sets-${exId}`).value) || 3,
        weight: parseFloat(document.getElementById(`t-weight-${exId}`).value) || 0,
        sound: soundEnabled,
        vibro: vibroEnabled
      };
    } else {
      config = {
        mode: 'static',
        prepTime: parseInt(document.getElementById(`t-prep-${exId}`).value) || 5,
        holdTime: parseInt(document.getElementById(`t-hold-${exId}`).value) || 30,
        holds: parseInt(document.getElementById(`t-holds-${exId}`).value) || 3,
        restTime: parseInt(document.getElementById(`t-srest-${exId}`).value) || 30,
        weight: parseFloat(document.getElementById(`t-weight-${exId}`).value) || 0,
        sound: soundEnabled,
        vibro: vibroEnabled
      };
    }

    this.exerciseTimers[exId] = {
      running: true, paused: false, phase: 'PREP', interval: null,
      remaining: 0, total: 0, currentSet: 1, currentRep: 1,
      startTime: Date.now(), config: config
    };

    document.getElementById(`timer-setup-${exId}`).style.display = 'none';
    document.getElementById(`timer-running-${exId}`).style.display = 'block';
    this.startExercisePhase(exId, 'PREP', config.prepTime);
  },

  startExercisePhase(exId, phase, duration) {
    const t = this.exerciseTimers[exId];
    if (!t) return;
    t.phase = phase;
    t.remaining = duration;
    t.total = duration;
    t.running = true;
    t.paused = false;
    this.updateExercisePhaseUI(exId);
    if (t.interval) clearInterval(t.interval);
    t.interval = setInterval(() => this.tickExerciseTimer(exId), 1000);
    this.tickExerciseTimer(exId);
  },

  tickExerciseTimer(exId) {
    const t = this.exerciseTimers[exId];
    if (!t || t.paused || !t.running) return;
    t.remaining--;
    this.updateExerciseTimerUI(exId);
    if (t.remaining === 0) this.onExercisePhaseEnd(exId);
  },

  onExercisePhaseEnd(exId) {
    const t = this.exerciseTimers[exId];
    if (!t) return;
    const cfg = t.config;

    if (cfg.mode === 'regular') {
      if (t.phase === 'PREP') {
        this.startExercisePhase(exId, 'EXEC', cfg.repTime);
      } else if (t.phase === 'EXEC') {
        t.currentRep++;
        if (t.currentRep > cfg.reps) {
          if (t.currentSet >= cfg.sets) {
            this.finishExerciseTimer(exId);
          } else {
            t.currentSet++;
            t.currentRep = 1;
            this.startExercisePhase(exId, 'REST', cfg.restTime);
          }
        } else {
          this.startExercisePhase(exId, 'EXEC', cfg.repTime);
        }
      } else if (t.phase === 'REST') {
        this.startExercisePhase(exId, 'EXEC', cfg.repTime);
      }
    } else {
      if (t.phase === 'PREP') {
        this.startExercisePhase(exId, 'EXEC', cfg.holdTime);
      } else if (t.phase === 'EXEC') {
        if (t.currentSet >= cfg.holds) {
          this.finishExerciseTimer(exId);
        } else {
          t.currentSet++;
          this.startExercisePhase(exId, 'REST', cfg.restTime);
        }
      } else if (t.phase === 'REST') {
        this.startExercisePhase(exId, 'EXEC', cfg.holdTime);
      }
    }
  },

  finishExerciseTimer(exId) {
    const t = this.exerciseTimers[exId];
    if (!t) return;
    t.running = false;
    clearInterval(t.interval);

    const duration = Math.round((Date.now() - t.startTime) / 1000);
    const cfg = t.config;
    const db = FTStorage.get('db') || [];
    const ex = db.find(e => e.id === exId);
    const dayName = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'][(new Date().getDay() + 6) % 7];
    const todayStr = new Date().toISOString().slice(0, 10);
    let history = FTStorage.get('history') || [];
    let stats = FTStorage.get('stats') || {yes:0,later:0,no:0,xp:0,level:1,streak:0};

    let dayRecord = history.find(h => h.date === todayStr && h.dayName === dayName);
    if (!dayRecord) {
      dayRecord = { date: todayStr, dayName: dayName, muscleGroup: '', exercises: [], details: [], duration: 0, timestamp: Date.now() };
      history.push(dayRecord);
    }
    dayRecord.skipped = false;
    if (!dayRecord.exercises.find(e => e.id === exId)) dayRecord.exercises.push({ id: exId });

    const existingDetailIdx = (dayRecord.details || []).findIndex(d => d.exId === exId);
    const detail = {
      exId: exId, name: ex ? ex.name : '?', mode: cfg.mode,
      sets: cfg.mode === 'regular' ? cfg.sets : cfg.holds,
      reps: cfg.mode === 'regular' ? cfg.reps : null,
      holdTime: cfg.mode === 'static' ? cfg.holdTime : null,
      weight: cfg.weight, duration: duration
    };

    if (!dayRecord.details) dayRecord.details = [];
    if (existingDetailIdx !== -1) dayRecord.details[existingDetailIdx] = detail;
    else dayRecord.details.push(detail);

    dayRecord.duration = Math.round((Date.now() - dayRecord.timestamp) / 1000);
    FTStorage.set('history', history);

    // XP за завершение упражнения
    stats.xp += 15;
    const xpNeeded = stats.level * 100;
    if (stats.xp >= xpNeeded) {
      stats.xp -= xpNeeded;
      stats.level++;
      setTimeout(() => alert(`🎉 Новый уровень ${stats.level}!\n\nПричина: Завершение упражнения`), 100);
    }
    FTStorage.set('stats', stats);

    document.getElementById(`timer-setup-${exId}`).style.display = 'block';
    document.getElementById(`timer-running-${exId}`).style.display = 'none';
    delete this.exerciseTimers[exId];

    this.createTodayPlanScreen();
    setTimeout(() => alert(`✅ Упражнение завершено!\n\nВремя: ${Math.floor(duration/60)} мин ${duration%60} с${cfg.weight ? '\nВес: ' + cfg.weight + ' кг' : ''}`), 100);
  },

  updateExercisePhaseUI(exId) {
    const t = this.exerciseTimers[exId];
    if (!t) return;
    const labels = { PREP: 'ПОДГОТОВКА', EXEC: t.config.mode === 'static' ? 'УДЕРЖАНИЕ' : 'ВЫПОЛНЕНИЕ', REST: 'ОТДЫХ', DONE: 'ГОТОВО' };
    const colors = { PREP: 'var(--warn)', EXEC: 'var(--ok)', REST: 'var(--lnk)', DONE: 'var(--acc)' };
    const phase = document.getElementById(`t-phase-${exId}`);
    if (phase) {
      phase.textContent = labels[t.phase];
      phase.style.background = colors[t.phase];
    }
  },

  updateExerciseTimerUI(exId) {
    const t = this.exerciseTimers[exId];
    if (!t) return;
    const min = Math.floor(Math.max(0, t.remaining) / 60);
    const sec = Math.max(0, t.remaining) % 60;
    const display = document.getElementById(`t-display-${exId}`);
    if (display) display.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

    const progress = t.total > 0 ? ((t.total - t.remaining) / t.total) * 100 : 0;
    const fill = document.getElementById(`t-progress-${exId}`);
    if (fill) fill.style.width = progress + '%';

    const cfg = t.config;
    let info = '';
    if (t.phase === 'PREP') info = 'Приготовьтесь...';
    else if (t.phase === 'EXEC') {
      if (cfg.mode === 'regular') info = `Подход ${t.currentSet}/${cfg.sets} · Повтор ${t.currentRep}/${cfg.reps}`;
      else info = `Удержание ${t.currentSet}/${cfg.holds}`;
      if (cfg.weight) info += ` · ${cfg.weight} кг`;
    } else if (t.phase === 'REST') {
      if (cfg.mode === 'regular') info = `Отдых перед подходом ${t.currentSet}/${cfg.sets}`;
      else info = `Отдых перед удержанием ${t.currentSet}/${cfg.holds}`;
    }
    const infoEl = document.getElementById(`t-info-${exId}`);
    if (infoEl) infoEl.textContent = info;
  },

  pauseExerciseTimer(exId) {
    const t = this.exerciseTimers[exId];
    if (!t) return;
    t.paused = !t.paused;
    const btn = document.getElementById(`t-pause-${exId}`);
    if (btn) btn.textContent = t.paused ? '▶ Продолжить' : '⏸ Пауза';
  },

  skipExerciseTimer(exId) {
    const t = this.exerciseTimers[exId];
    if (!t || !t.running) return;
    t.remaining = 0;
    this.onExercisePhaseEnd(exId);
  },

  abortExerciseTimer(exId) {
    if (!confirm('Прервать выполнение упражнения?')) return;
    const t = this.exerciseTimers[exId];
    if (t) {
      t.running = false;
      clearInterval(t.interval);
      delete this.exerciseTimers[exId];
    }
    document.getElementById(`timer-setup-${exId}`).style.display = 'block';
    document.getElementById(`timer-running-${exId}`).style.display = 'none';
  }
};

module.exports = WorkoutsModule;