// modules/workout.js
const WorkoutModule = {
  currentExerciseId: null,
  modalElement: null,
  _miniSurveyContext: null,
  XP: { PER_SET: 5, PER_PARTIAL: 3, PER_MISS: 0, PER_EXERCISE: 15, PER_DAY: 20, PER_SURVEY: 10, LEVEL_BASE: 100 },
  init: function() {
    if (typeof Logger !== 'undefined') Logger.log('Модуль тренировки инициализирован', 'info');
  },
  getPlan: function() { return (typeof FTStorage !== 'undefined' ? FTStorage.get('plan') : null) || []; },
  getDB: function() { return (typeof ExercisesModule !== 'undefined' ? ExercisesModule.getDB() : null) || (typeof FTStorage !== 'undefined' ? FTStorage.get('db') : null) || []; },
  getHistory: function() { return (typeof FTStorage !== 'undefined' ? FTStorage.get('history') : null) || []; },
  saveHistory: function(h) {
    if (typeof FTStorage !== 'undefined') FTStorage.set('history', h);
    if (typeof Core !== 'undefined') Core._historyMapCache = null;
    if (typeof StatsModule !== 'undefined') {
      StatsModule._chartDataCache = null;
      StatsModule._chartDataCacheKey = null;
    }
  },
  saveStats: function(s) { if (typeof FTStorage !== 'undefined') FTStorage.set('stats', s); },
  getStats: function() {
    var defaults = {yes:0, later:0, no:0, xp:0, level:1, streak:0, lastWorkoutDate:null};
    if (typeof FTStorage !== 'undefined') {
      var s = FTStorage.get('stats') || {};
      for (var k in defaults) if (s[k] === undefined) s[k] = defaults[k];
      return s;
    }
    return defaults;
  },
  _xpForLevel: function(level) {
    if (typeof Core !== 'undefined' && Core.utils && Core.utils.xpForLevel) return Core.utils.xpForLevel(level);
    return Math.floor(100 * Math.pow(1.2, Math.max(0, (level || 1) - 1)));
  },
  _parseSetsReps: function(setsStr) {
    var m = (setsStr || '3×10').match(/(\d+)\s*[×xх*]\s*(\d+)/i);
    return { sets: m ? parseInt(m[1]) : 3, reps: m ? parseInt(m[2]) : 10 };
  },
  openWorkoutModal: function() {
    if (typeof Core === 'undefined' || !Core.utils) {
      if (typeof Notify !== 'undefined') Notify.error('Ядро не загружено');
      return;
    }
    var self = this;
    var plan = this.getPlan();
    var db = this.getDB();
    var todayIdx = Core.utils.getTodayIndex();
    var todayPlan = plan[todayIdx] || { dayName: 'Сегодня', muscleGroup: '', exercises: [] };

    this.closeWorkoutModal();

    var modal = document.createElement('div');
    modal.className = 'workout-modal';
    modal.id = 'workoutModal';

    var content = document.createElement('div');
    content.className = 'workout-modal-content';

    var header = document.createElement('div');
    header.style.cssText = 'text-align:center; padding:10px 20px;';
    header.innerHTML =
      '<h2 style="font-family:var(--font-display);color:var(--accent-gold);margin:0 0 6px 0">' +
        '<i class="ph ph-barbell"></i> ' + Core.utils.escapeHtml(todayPlan.dayName || 'Сегодня') +
      '</h2>' +
      '<div style="font-size:0.9em;opacity:0.7">' +
        '<i class="ph ph-tag"></i> ' + Core.utils.escapeHtml(todayPlan.muscleGroup || 'Тренировка') +
        ' · <i class="ph ph-list-dashes"></i> ' + (todayPlan.exercises ? todayPlan.exercises.length : 0) + ' упр.' +
      '</div>';
    content.appendChild(header);

    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<i class="ph ph-x"></i>';
    closeBtn.setAttribute('aria-label', 'Закрыть');
    closeBtn.style.cssText =
      'position:sticky; top:10px; float:right; background:var(--bg-card); ' +
      'border:1px solid var(--border-subtle); color:var(--text-secondary); ' +
      'width:36px; height:36px; border-radius:50%; font-size:1.2em; ' +
      'cursor:pointer; z-index:10; margin:12px; ' +
      'display:flex; align-items:center; justify-content:center;';
    closeBtn.onclick = function() { self.closeWorkoutModal(); };
    content.appendChild(closeBtn);

    if (!todayPlan.exercises || todayPlan.exercises.length === 0) {
      var empty = document.createElement('div');
      empty.style.cssText = 'text-align:center; padding:40px; opacity:0.6;';
      empty.innerHTML =
        '<i class="ph ph-calendar-x" style="font-size:3em;color:var(--accent-gold);margin-bottom:12px;display:block"></i>' +
        '<p>План на сегодня пуст</p>';
      content.appendChild(empty);
    } else {
      for (var i = 0; i < todayPlan.exercises.length; i++) {
        (function(idx) {
          var exRef = todayPlan.exercises[idx];
          var ex = null;
          for (var j = 0; j < db.length; j++) {
            if (db[j].id === exRef.id) { ex = db[j]; break; }
          }
          if (!ex) return;

          var card = document.createElement('div');
          card.style.cssText =
            'background:var(--bg-card); border-radius:12px; ' +
            'margin:12px 20px; border:1px solid var(--border-subtle); overflow:hidden;';

          var parsed = self._parseSetsReps(exRef.sets);

          var headerDiv = document.createElement('div');
          headerDiv.style.cssText =
            'padding:14px 16px; cursor:pointer; ' +
            'display:flex; justify-content:space-between; align-items:center;';
          headerDiv.innerHTML =
            '<div style="flex:1">' +
              '<div style="font-weight:700;font-size:1.05em;color:var(--accent-gold)">' +
                (idx + 1) + '. ' + Core.utils.escapeHtml(ex.name) +
              '</div>' +
              '<div style="font-size:0.8em;opacity:0.7;margin-top:4px">' +
                '<i class="ph ph-tag"></i> ' + Core.utils.escapeHtml(ex.muscleGroup || 'Без категории') +
                ' · <i class="ph ph-list-numbers"></i> ' + parsed.sets + '×' + parsed.reps +
              '</div>' +
            '</div>' +
            '<i class="ph ph-caret-down" style="font-size:1.2em;opacity:0.7"></i>';

          var bodyDiv = document.createElement('div');
          bodyDiv.style.cssText =
            'display:none; padding:0 16px 16px; border-top:1px solid var(--border-subtle);';

          if (ex.imageUrl) {
            var imgWrap = document.createElement('div');
            imgWrap.style.cssText =
              'margin:12px 0; border-radius:10px; overflow:hidden; max-height:200px;';
            var img = document.createElement('img');
            img.src = ex.imageUrl;
            img.alt = ex.name;
            img.style.cssText = 'width:100%; object-fit:cover; display:block;';
            img.onerror = function() {
              this.parentElement.style.display = 'none';
            };
            imgWrap.appendChild(img);
            bodyDiv.appendChild(imgWrap);
          }

          if (ex.videoUrl) {
            var videoLink = document.createElement('a');
            videoLink.href = ex.videoUrl;
            videoLink.target = '_blank';
            videoLink.rel = 'noopener';
            videoLink.style.cssText =
              'display:inline-flex; align-items:center; gap:8px; ' +
              'padding:8px 14px; background:var(--bg-primary); ' +
              'border-radius:8px; color:var(--accent-neon); ' +
              'text-decoration:none; font-size:0.9em; ' +
              'border:1px solid var(--border-subtle); margin:12px 0;';
            videoLink.innerHTML =
              '<i class="ph ph-video-camera"></i> Смотреть видео';
            bodyDiv.appendChild(videoLink);
          }

          if (ex.description) {
            var descDiv = document.createElement('div');
            descDiv.style.cssText =
              'background:var(--bg-primary); padding:12px; ' +
              'border-radius:10px; margin:12px 0; font-size:0.9em;';
            descDiv.innerHTML =
              '<strong style="display:flex;align-items:center;gap:6px;margin-bottom:6px">' +
                '<i class="ph ph-text-t" style="color:var(--accent-gold)"></i> Техника:' +
              '</strong>' +
              '<div style="white-space:pre-wrap;line-height:1.6">' +
                Core.utils.escapeHtml(ex.description) +
              '</div>';
            bodyDiv.appendChild(descDiv);
          }

          if (ex.inventory) {
            var invDiv = document.createElement('div');
            invDiv.style.cssText =
              'background:var(--bg-primary); padding:10px 12px; ' +
              'border-radius:10px; margin:12px 0; font-size:0.9em; ' +
              'display:flex; align-items:start; gap:8px;';
            invDiv.innerHTML =
              '<i class="ph ph-backpack" style="color:var(--accent-gold);font-size:1.1em;margin-top:2px"></i>' +
              '<div><strong>Инвентарь:</strong> ' + Core.utils.escapeHtml(ex.inventory) + '</div>';
            bodyDiv.appendChild(invDiv);
          }

          if (ex.notes) {
            var notesDiv = document.createElement('div');
            notesDiv.style.cssText =
              'background:var(--accent-gold-dim); padding:10px 12px; ' +
              'border-radius:10px; margin:12px 0; font-size:0.9em; ' +
              'border-left:3px solid var(--accent-gold); ' +
              'display:flex; align-items:start; gap:8px;';
            notesDiv.innerHTML =
              '<i class="ph ph-push-pin" style="color:var(--accent-gold);font-size:1.1em;margin-top:2px"></i>' +
              '<div><strong>Заметки:</strong> ' + Core.utils.escapeHtml(ex.notes) + '</div>';
            bodyDiv.appendChild(notesDiv);
          }

          var starsDiv = document.createElement('div');
          starsDiv.style.cssText =
            'display:flex; gap:20px; margin:12px 0; font-size:0.85em; flex-wrap:wrap;';
          starsDiv.innerHTML =
            '<div style="display:flex;align-items:center;gap:6px">' +
              '<i class="ph ph-fire" style="color:var(--accent-warning)"></i> ' +
              'Сложность: ' + Core.utils.renderStars(ex.difficulty || 3) +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:6px">' +
              '<i class="ph ph-target" style="color:var(--accent-success)"></i> ' +
              'Эффективность: ' + Core.utils.renderStars(ex.effectiveness || 3) +
            '</div>';
          bodyDiv.appendChild(starsDiv);

          var setsLabel = document.createElement('div');
          setsLabel.style.cssText =
            'margin-top:14px; font-weight:600; margin-bottom:10px; font-size:0.95em;';
          setsLabel.innerHTML =
            '<i class="ph ph-barbell" style="color:var(--accent-gold)"></i> ' +
            'Подходы (' + parsed.sets + ' × ' + parsed.reps + ')';
          bodyDiv.appendChild(setsLabel);

          var goBtn = document.createElement('button');
          goBtn.innerHTML =
            '<i class="ph ph-play-circle" style="font-size:1.5em"></i><br>Начать';
          goBtn.setAttribute('aria-label', 'Начать упражнение ' + ex.name);
          goBtn.style.cssText =
            'display:flex; flex-direction:column; align-items:center; ' +
            'justify-content:center; gap:4px; margin:18px auto; ' +
            'width:100px; height:100px; border-radius:50%; ' +
            'background:linear-gradient(135deg, var(--accent-gold) 0%, var(--accent-gold-light) 100%); ' +
            'color:#000; border:none; font-size:0.8em; font-weight:700; ' +
            'cursor:pointer; box-shadow:0 4px 20px rgba(212,175,55,0.4); ' +
            'transition:all 0.2s;';
          goBtn.onmouseover = function() { this.style.transform = 'scale(1.05)'; };
          goBtn.onmouseout = function() { this.style.transform = 'scale(1)'; };
          goBtn.onclick = function() { self.startExercise(ex.id); };
          bodyDiv.appendChild(goBtn);

          headerDiv.onclick = function() {
            var isOpen = bodyDiv.style.display !== 'none';
            bodyDiv.style.display = isOpen ? 'none' : 'block';
            var icon = headerDiv.querySelector('i.ph');
            if (icon) {
              icon.className = isOpen ? 'ph ph-caret-down' : 'ph ph-caret-up';
            }
          };

          card.appendChild(headerDiv);
          card.appendChild(bodyDiv);
          content.appendChild(card);
        })(i);
      }
    }

    modal.appendChild(content);
    document.body.appendChild(modal);
    this.modalElement = modal;
  },
  closeWorkoutModal: function() {
    if (this.modalElement) { this.modalElement.remove(); this.modalElement = null; }
    var old = document.getElementById('workoutModal');
    if (old) old.remove();
    var exModal = document.getElementById('exerciseModal');
    if (exModal) exModal.remove();
    var mini = document.getElementById('miniSurveyModal');
    if (mini) mini.remove();
    this.currentExerciseId = null;
    this._miniSurveyContext = null;
  },
  startExercise: function(exId) {
    this.currentExerciseId = exId;
    var plan = this.getPlan();
    var todayIdx = Core.utils.getTodayIndex();
    var todayPlan = plan[todayIdx];
    if (!todayPlan || !todayPlan.exercises) return;
    var exRef = null;
    for (var i = 0; i < todayPlan.exercises.length; i++) {
      if (todayPlan.exercises[i].id === exId) { exRef = todayPlan.exercises[i]; break; }
    }
    if (!exRef) return;
    var db = this.getDB();
    var ex = null;
    for (var i = 0; i < db.length; i++) if (db[i].id === exId) { ex = db[i]; break; }
    var exName = ex ? ex.name : 'Упражнение';
    var parsed = this._parseSetsReps(exRef.sets);
    var numSets = parsed.sets;
    var numReps = parsed.reps;
    var self = this;
    var subModal = document.createElement('div');
    subModal.className = 'workout-modal';
    subModal.id = 'exerciseModal';
    subModal.style.zIndex = '2100';
    var subContent = document.createElement('div');
    subContent.className = 'workout-modal-content';
    subContent.style.maxWidth = '400px';
    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<i class="ph ph-x"></i>';
    closeBtn.setAttribute('aria-label', 'Закрыть');
    closeBtn.style.cssText = 'float:right;background:transparent;border:none;color:var(--text-secondary);font-size:1.5em;cursor:pointer';
    closeBtn.onclick = function() { subModal.remove(); };
    subContent.appendChild(closeBtn);
    var title = document.createElement('h2');
    title.style.cssText = 'font-family:var(--font-display);color:var(--accent-gold);margin-top:0;text-align:center';
    title.textContent = Core.utils.escapeHtml(exName);
    subContent.appendChild(title);
    var setsContainer = document.createElement('div');
    for (var s = 0; s < numSets; s++) {
      (function(setIdx) {
        var setDiv = document.createElement('div');
        setDiv.id = 'modal-set-' + setIdx;
        setDiv.style.cssText = 'display:flex; align-items:center; gap:10px; padding:12px; background:var(--bg-primary); border-radius:10px; margin-bottom:8px; border:1px solid var(--border-subtle);';
        var info = document.createElement('div');
        info.style.flex = '1';
        info.innerHTML = '<div style="font-weight:600">Подход ' + (setIdx + 1) + '</div><div style="font-size:0.85em;opacity:0.7">' + numReps + ' повторений</div>';
        setDiv.appendChild(info);
        var btn = document.createElement('button');
        btn.className = 'btn btn-primary';
        btn.innerHTML = '<i class="ph ph-check"></i> Выполнено';
        btn.style.cssText = 'padding:8px 16px;font-size:0.9em';
        btn.onclick = function() { self.completeSet(setIdx, numReps); };
        setDiv.appendChild(btn);
        setsContainer.appendChild(setDiv);
      })(s);
    }
    subContent.appendChild(setsContainer);
    var closeAllBtn = document.createElement('button');
    closeAllBtn.className = 'btn btn-secondary';
    closeAllBtn.innerHTML = '<i class="ph ph-x"></i> Закрыть';
    closeAllBtn.style.cssText = 'width:100%; padding:12px; margin-top:16px';
    closeAllBtn.onclick = function() { subModal.remove(); };
    subContent.appendChild(closeAllBtn);
    subModal.appendChild(subContent);
    document.body.appendChild(subModal);
  },
  completeSet: function(setIdx, numReps) {
    var exId = this.currentExerciseId;
    if (!exId) return;
    var history = this.getHistory();
    var todayStr = Core.utils.formatLocalDate(new Date());
    var dayRecord = null;
    for (var i = 0; i < history.length; i++) if (history[i].date === todayStr) { dayRecord = history[i]; break; }
    if (!dayRecord) {
      dayRecord = {
        date: todayStr,
        dayName: Core.utils.getDayName(Core.utils.getTodayIndex()),
        muscleGroup: '', exercises: [{id: exId}], details: [], duration: 0, timestamp: Date.now()
      };
      history.push(dayRecord);
    } else {
      var hasEx = false;
      for (var i = 0; i < dayRecord.exercises.length; i++) if (dayRecord.exercises[i].id === exId) { hasEx = true; break; }
      if (!hasEx) dayRecord.exercises.push({ id: exId });
    }
    if (!dayRecord.details) dayRecord.details = [];
    var exDetail = null;
    for (var i = 0; i < dayRecord.details.length; i++) if (dayRecord.details[i].exId === exId) { exDetail = dayRecord.details[i]; break; }
    if (!exDetail) { exDetail = { exId: exId, sets: [], partialReps: [] }; dayRecord.details.push(exDetail); }
    if (!exDetail.sets) exDetail.sets = [];
    if (!exDetail.partialReps) exDetail.partialReps = [];
    if (exDetail.sets[setIdx]) return;
    this.showMiniSurvey(exId, setIdx, numReps, dayRecord, exDetail, history);
  },
  showMiniSurvey: function(exId, setIdx, numReps, dayRecord, exDetail, history) {
    var settings = (typeof FTStorage !== 'undefined' ? FTStorage.get('settings') : null) || {};
    if (settings.disableMiniSurvey) {
      this.markSetDone(exId, setIdx, 'done', null, dayRecord, exDetail, history);
      return;
    }
    var self = this;
    var exModal = document.getElementById('exerciseModal');
    if (exModal) exModal.remove();
    var modal = document.createElement('div');
    modal.className = 'workout-modal';
    modal.id = 'miniSurveyModal';
    modal.style.zIndex = '2200';
    var content = document.createElement('div');
    content.className = 'workout-modal-content';
    content.style.maxWidth = '400px';
    var title = document.createElement('h2');
    title.style.cssText = 'font-family:var(--font-display);color:var(--accent-gold);margin-top:0;text-align:center';
    title.innerHTML = '<i class="ph ph-clipboard-text"></i> Подход ' + (setIdx + 1);
    content.appendChild(title);
    var q = document.createElement('p');
    q.style.cssText = 'text-align:center;margin-bottom:18px;font-size:1.05em';
    q.textContent = 'Удалось выполнить все ' + numReps + ' повторений?';
    content.appendChild(q);
    var buttonsDiv = document.createElement('div');
    buttonsDiv.style.cssText = 'display:flex;flex-direction:column;gap:10px';
    var variants = [
      { key: 'yes', icon: 'ph-check-circle', text: 'Да, все повторения', bg: 'linear-gradient(135deg, #00ff88, #00cc6a)', color: '#000' },
      { key: 'partial', icon: 'ph-warning-circle', text: 'Частично', bg: 'linear-gradient(135deg, #FFB347, #FFC870)', color: '#000' },
      { key: 'no', icon: 'ph-x-circle', text: 'Нет', bg: 'linear-gradient(135deg, #ff3366, #ff5577)', color: '#fff' },
      { key: 'skip', icon: 'ph-skip-forward', text: 'Пропустить', bg: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }
    ];
    variants.forEach(function(v) {
      var btn = document.createElement('button');
      btn.className = 'btn';
      btn.innerHTML = '<i class="ph ' + v.icon + '"></i> ' + v.text;
      btn.style.cssText = 'padding:14px;background:' + v.bg + ';color:' + v.color + ';border:' + (v.border || 'none') + ';border-radius:10px;cursor:pointer;font-weight:600;font-size:1em';
      btn.onclick = function() { self._answerMiniSurvey(v.key, setIdx, numReps); };
      buttonsDiv.appendChild(btn);
    });
    content.appendChild(buttonsDiv);
    var checkboxDiv = document.createElement('div');
    checkboxDiv.style.cssText = 'margin-top:14px;text-align:center';
    checkboxDiv.innerHTML = '<label style="font-size:0.85em;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;opacity:0.8"><input type="checkbox" id="dontAskAgain" style="width:16px;height:16px;accent-color:var(--accent-gold)"><span>Больше не спрашивать</span></label>';
    content.appendChild(checkboxDiv);
    modal.appendChild(content);
    document.body.appendChild(modal);
    this._miniSurveyContext = {
      exId: exId, setIdx: setIdx, numReps: numReps,
      dayRecord: dayRecord, exDetail: exDetail, history: history
    };
  },
  _answerMiniSurvey: function(answer, setIdx, numReps) {
    var ctx = this._miniSurveyContext;
    if (!ctx) return;
    this._miniSurveyContext = null;
    try {
      var dontAskCheckbox = document.getElementById('dontAskAgain');
      if (dontAskCheckbox && dontAskCheckbox.checked) {
        if (typeof FTStorage !== 'undefined') {
          var settings = FTStorage.get('settings') || {};
          settings.disableMiniSurvey = true;
          FTStorage.set('settings', settings);
        }
      }
      var miniModal = document.getElementById('miniSurveyModal');
      if (miniModal) miniModal.remove();
      if (answer === 'partial') {
        this._promptPartialReps(numReps, function(partialReps) {
          var status = partialReps > 0 ? 'partial' : 'missed';
          WorkoutModule.markSetDone(ctx.exId, setIdx, status, partialReps, ctx.dayRecord, ctx.exDetail, ctx.history);
        });
        return;
      }
      var setStatus = answer === 'no' ? 'missed' : (answer === 'skip' ? 'skipped' : 'done');
      this.markSetDone(ctx.exId, setIdx, setStatus, null, ctx.dayRecord, ctx.exDetail, ctx.history);
    } catch (e) {
      if (typeof Logger !== 'undefined') Logger.log('MiniSurvey error: ' + e.message, 'error');
    }
  },
  _promptPartialReps: function(numReps, callback) {
    var modal = document.createElement('div');
    modal.className = 'workout-modal';
    modal.style.zIndex = '2300';
    var content = document.createElement('div');
    content.className = 'workout-modal-content';
    content.style.maxWidth = '360px';
    content.innerHTML =
      '<h2 style="font-family:var(--font-display);color:var(--accent-gold);margin-top:0;text-align:center">Сколько повторений?</h2>' +
      '<div style="text-align:center;font-size:2em;font-weight:bold;color:var(--accent-gold);margin:12px 0" id="partialRepsValue">' + Math.floor(numReps * 0.7) + '</div>' +
      '<input type="range" min="0" max="' + numReps + '" value="' + Math.floor(numReps * 0.7) + '" id="partialRepsSlider" style="width:100%;accent-color:var(--accent-gold)">' +
      '<div style="display:flex;gap:10px;margin-top:16px">' +
        '<button class="btn btn-secondary" style="flex:1;padding:12px" id="partialCancel">Отмена</button>' +
        '<button class="btn btn-primary" style="flex:1;padding:12px" id="partialOk"><i class="ph ph-check"></i> Готово</button>' +
      '</div>';
    modal.appendChild(content);
    document.body.appendChild(modal);
    var slider = content.querySelector('#partialRepsSlider');
    var display = content.querySelector('#partialRepsValue');
    slider.oninput = function() { display.textContent = this.value; };
    content.querySelector('#partialCancel').onclick = function() { modal.remove(); };
    content.querySelector('#partialOk').onclick = function() {
      var val = parseInt(slider.value) || 0;
      modal.remove();
      callback(val);
    };
  },
  markSetDone: function(exId, setIdx, setStatus, partialReps, dayRecord, exDetail, history) {
    while (exDetail.sets.length <= setIdx) exDetail.sets.push(null);
    while (exDetail.partialReps.length <= setIdx) exDetail.partialReps.push(null);
    exDetail.sets[setIdx] = setStatus;
    if (partialReps !== null) exDetail.partialReps[setIdx] = partialReps;

    var stats = this.getStats();
    var xpChange = 0;
    if (setStatus === 'done') xpChange = this.XP.PER_SET;
    else if (setStatus === 'partial') xpChange = this.XP.PER_PARTIAL;
    else if (setStatus === 'missed') xpChange = 0;
    else if (setStatus === 'skipped') xpChange = 0;
    stats.xp = Math.max(0, (stats.xp || 0) + xpChange);

    var todayStr = Core.utils.formatLocalDate(new Date());
    if (setStatus !== 'missed' && setStatus !== 'skipped' && stats.lastWorkoutDate !== todayStr) {
      stats.yes = (stats.yes || 0) + 1;
      stats.streak = (stats.streak || 0) + 1;
      stats.lastWorkoutDate = todayStr;
    }

    var leveledUp = false;
    var xpNeeded = this._xpForLevel(stats.level);
    while (stats.xp >= xpNeeded) {
      stats.xp -= xpNeeded;
      stats.level++;
      leveledUp = true;
      xpNeeded = this._xpForLevel(stats.level);
    }

    this.saveStats(stats);
    this.saveHistory(history);
    if (typeof refreshHeaderAfterXP === 'function') refreshHeaderAfterXP();

    if (leveledUp) {
      var lvl = stats.level;
      setTimeout(function() {
        if (typeof showAchievementToast === 'function') showAchievementToast('Новый уровень ' + lvl + '!', 'Ты достиг уровня ' + lvl, 'ph-star');
      }, 100);
    }

    if (typeof AchievementsModule !== 'undefined' && AchievementsModule.checkAchievements) {
      AchievementsModule.checkAchievements();
    }

    var setEl = document.getElementById('modal-set-' + setIdx);
    if (setEl) {
      var iconMap = { 'done': 'ph-check-circle', 'partial': 'ph-warning-circle', 'missed': 'ph-x-circle', 'skipped': 'ph-skip-forward' };
      var colorMap = { 'done': '#00ff88', 'partial': '#FFB347', 'missed': '#ff3366', 'skipped': '#a0a0b0' };
      var bgMap = { 'done': 'rgba(0,255,136,0.1)', 'partial': 'rgba(255,179,71,0.1)', 'missed': 'rgba(255,51,102,0.1)', 'skipped': 'rgba(160,160,176,0.1)' };
      setEl.style.background = bgMap[setStatus];
      setEl.style.borderLeft = '3px solid ' + colorMap[setStatus];
      var btn = setEl.querySelector('button');
      if (btn) {
        var labelMap = { 'done': 'Выполнено', 'partial': partialReps + ' повт.', 'missed': 'Пропущено', 'skipped': 'Пропущено' };
        btn.innerHTML = '<i class="ph ' + iconMap[setStatus] + '"></i> ' + labelMap[setStatus];
        btn.disabled = true;
        btn.style.opacity = '0.6';
      }
    }

    var plan = this.getPlan();
    var todayIdx = Core.utils.getTodayIndex();
    var todayPlan = plan[todayIdx];
    if (!todayPlan || !todayPlan.exercises) return;
    var exRef = null;
    for (var i = 0; i < todayPlan.exercises.length; i++) if (todayPlan.exercises[i].id === exId) { exRef = todayPlan.exercises[i]; break; }
    if (!exRef) return;

    var parsed = this._parseSetsReps(exRef.sets);
    var allDone = true;
    for (var s = 0; s < parsed.sets; s++) if (!exDetail.sets[s]) { allDone = false; break; }

    if (allDone) {
      stats.xp += this.XP.PER_EXERCISE;
      var allDayDone = true;
      for (var i = 0; i < todayPlan.exercises.length; i++) {
        var dayExRef = todayPlan.exercises[i];
        var dayExDetail = null;
        for (var j = 0; j < dayRecord.details.length; j++) if (dayRecord.details[j].exId === dayExRef.id) { dayExDetail = dayRecord.details[j]; break; }
        if (!dayExDetail) { allDayDone = false; break; }
        var dayParsed = this._parseSetsReps(dayExRef.sets);
        for (var s = 0; s < dayParsed.sets; s++) if (!dayExDetail.sets[s] || dayExDetail.sets[s] === 'missed') { allDayDone = false; break; }
        if (!allDayDone) break;
      }
      if (allDayDone) {
        stats.xp += this.XP.PER_DAY;
      }
      xpNeeded = this._xpForLevel(stats.level);
      while (stats.xp >= xpNeeded) {
        stats.xp -= xpNeeded;
        stats.level++;
        leveledUp = true;
        xpNeeded = this._xpForLevel(stats.level);
      }
      this.saveStats(stats);
      if (typeof refreshHeaderAfterXP === 'function') refreshHeaderAfterXP();
      var self = this;
      setTimeout(function() {
        if (allDayDone) {
          if (typeof showAchievementToast === 'function') showAchievementToast('🏆 День пройден!', 'Все упражнения выполнены. +' + self.XP.PER_DAY + ' XP', 'ph-trophy');
        } else {
          if (typeof showAchievementToast === 'function') showAchievementToast('Упражнение завершено!', '+' + (self.XP.PER_SET * parsed.sets + self.XP.PER_EXERCISE) + ' XP', 'ph-barbell');
        }
        var exModal = document.getElementById('exerciseModal');
        if (exModal) exModal.remove();
        var miniModal = document.getElementById('miniSurveyModal');
        if (miniModal) miniModal.remove();
        self.closeWorkoutModal();
        self.openWorkoutModal();
      }, 300);
    }
  },
};

window.WorkoutModule = WorkoutModule;
module.exports = WorkoutModule;