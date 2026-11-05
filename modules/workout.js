// modules/workout.js

const WorkoutModule = {
  currentExerciseId: null,
  expandedExerciseId: null,
  modalElement: null,

  init: function() {
    console.log('Workout module initialized');
    if (typeof Logger !== 'undefined') Logger.log('Модуль тренировки инициализирован', 'info');
  },

  getStats: function() {
    if (typeof FTStorage !== 'undefined') return FTStorage.get('stats') || {yes:0, later:0, no:0, xp:0, level:1, streak:0};
    return {yes:0, later:0, no:0, xp:0, level:1, streak:0};
  },
  getPlan: function() {
    if (typeof FTStorage !== 'undefined') return FTStorage.get('plan') || [];
    return [];
  },
  getDB: function() {
    if (typeof ExercisesModule !== 'undefined') return ExercisesModule.getDB();
    if (typeof FTStorage !== 'undefined') return FTStorage.get('db') || [];
    return [];
  },
  getHistory: function() {
    if (typeof FTStorage !== 'undefined') return FTStorage.get('history') || [];
    return [];
  },
  saveHistory: function(h) { if (typeof FTStorage !== 'undefined') FTStorage.set('history', h); },
  saveStats: function(s) { if (typeof FTStorage !== 'undefined') FTStorage.set('stats', s); },
  getTodayIndex: function() { return (new Date().getDay() + 6) % 7; },
  renderStars: function(c) {
    var s = '';
    for (var i = 1; i <= 5; i++) s += i <= c ? '<i class="ph-fill ph-star" style="color:var(--accent-gold)"></i>' : '<i class="ph ph-star" style="color:var(--text-muted)"></i>';
    return s;
  },

  openWorkoutModal: function() {
    var self = this;
    var plan = this.getPlan();
    var db = this.getDB();
    var todayIdx = this.getTodayIndex();
    var todayPlan = plan[todayIdx] || { dayName: 'Сегодня', muscleGroup: '', exercises: [] };
    var stats = this.getStats();
    var xpNeeded = stats.level * 100;
    var xpPercent = Math.min(100, Math.round((stats.xp / xpNeeded) * 100));

    this.closeWorkoutModal();

    var modal = document.createElement('div');
    modal.className = 'workout-modal';
    modal.id = 'workoutModal';

    var content = document.createElement('div');
    content.className = 'workout-modal-content';

    var statusBar = document.createElement('div');
    statusBar.style.cssText = 'background:linear-gradient(135deg, #1a1a2e 0%, #151520 100%); border-radius:16px 16px 0 0; padding:16px 20px; border-bottom:1px solid var(--border-gold);';
    statusBar.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
      '<div style="display:flex;align-items:center;gap:10px"><i class="ph ph-star" style="font-size:1.4em;color:var(--accent-gold)"></i><span style="font-size:1.4em;font-weight:bold;color:var(--accent-gold)">' + stats.level + '</span><span style="font-size:0.75em;opacity:0.7">уровень</span></div>' +
      '<div style="text-align:right"><div style="font-size:0.75em;opacity:0.7">XP</div><div style="font-size:1em;font-weight:bold">' + stats.xp + '/' + xpNeeded + '</div></div></div>' +
      '<div style="height:6px;background:var(--bg-primary);border-radius:3px;overflow:hidden;border:1px solid var(--border-subtle)"><div style="height:100%;width:' + xpPercent + '%;background:linear-gradient(90deg, var(--accent-gold), var(--accent-gold-light));border-radius:3px"></div></div>' +
      '<div style="text-align:center;font-size:0.7em;opacity:0.6;margin-top:6px">До следующего уровня: ' + (xpNeeded - stats.xp) + ' XP</div>';
    content.appendChild(statusBar);

    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<i class="ph ph-x"></i>';
    closeBtn.style.cssText = 'position:sticky; top:10px; float:right; background:var(--bg-card); border:1px solid var(--border-subtle); color:var(--text-secondary); width:36px; height:36px; border-radius:50%; font-size:1.2em; cursor:pointer; z-index:10; margin:12px; display:flex; align-items:center; justify-content:center;';
    closeBtn.onclick = function() { self.closeWorkoutModal(); };
    content.appendChild(closeBtn);

    var header = document.createElement('div');
    header.style.cssText = 'text-align:center; padding:10px 20px;';
    header.innerHTML = '<h2 style="font-family:var(--font-display);color:var(--accent-gold);margin:0 0 6px 0;display:flex;align-items:center;justify-content:center;gap:10px"><i class="ph ph-barbell"></i> ' + todayPlan.dayName + '</h2>' +
      '<div style="font-size:0.9em;opacity:0.7;display:flex;align-items:center;justify-content:center;gap:6px"><i class="ph ph-tag"></i> ' + (todayPlan.muscleGroup || 'Тренировка') + ' · <i class="ph ph-list-dashes"></i> ' + todayPlan.exercises.length + ' упражнений</div>';
    content.appendChild(header);

    if (todayPlan.exercises.length === 0) {
      var empty = document.createElement('div');
      empty.style.cssText = 'text-align:center; padding:40px; opacity:0.6;';
      empty.innerHTML = '<i class="ph ph-calendar-x" style="font-size:3em;color:var(--accent-gold);margin-bottom:12px;display:block"></i><p>План на сегодня пуст</p>';
      content.appendChild(empty);
    } else {
      for (var i = 0; i < todayPlan.exercises.length; i++) {
        (function(idx) {
          var exRef = todayPlan.exercises[idx];
          var ex = null;
          for (var j = 0; j < db.length; j++) if (db[j].id === exRef.id) { ex = db[j]; break; }
          if (!ex) return;

          var card = document.createElement('div');
          card.style.cssText = 'background:var(--bg-card); border-radius:12px; margin:12px 20px; border:1px solid var(--border-subtle); overflow:hidden;';

          var setsStr = exRef.sets || '3×10';
          var setsMatch = setsStr.match(/(\d+)\s*[×xх*]\s*(\d+)/i);
          var numSets = setsMatch ? parseInt(setsMatch[1]) : 3;
          var numReps = setsMatch ? parseInt(setsMatch[2]) : 10;

          var headerDiv = document.createElement('div');
          headerDiv.style.cssText = 'padding:14px 16px; cursor:pointer; display:flex; justify-content:space-between; align-items:center;';
          headerDiv.innerHTML = '<div style="flex:1"><div style="font-weight:700;font-size:1.05em;color:var(--accent-gold);display:flex;align-items:center;gap:8px"><span style="color:var(--accent-gold);font-weight:700">' + (idx + 1) + '.</span> ' + ex.name + '</div><div style="font-size:0.8em;opacity:0.7;margin-top:4px;display:flex;align-items:center;gap:6px"><i class="ph ph-tag"></i> ' + (ex.muscleGroup || 'Без категории') + ' · <i class="ph ph-list-numbers"></i> ' + setsStr + '</div></div><i class="ph ph-caret-down" style="font-size:1.2em;opacity:0.7" class="ex-arrow"></i>';

          var bodyDiv = document.createElement('div');
          bodyDiv.style.cssText = 'display:none; padding:0 16px 16px; border-top:1px solid var(--border-subtle);';

          if (ex.imageUrl) bodyDiv.innerHTML += '<div style="margin:12px 0;border-radius:10px;overflow:hidden;max-height:200px"><img src="' + ex.imageUrl + '" style="width:100%;object-fit:cover" onerror="this.parentElement.style.display=\'none\'"></div>';
          if (ex.videoUrl) bodyDiv.innerHTML += '<div style="margin:12px 0"><a href="' + ex.videoUrl + '" target="_blank" style="display:inline-flex;align-items:center;gap:8px;padding:8px 14px;background:var(--bg-primary);border-radius:8px;color:var(--accent-neon);text-decoration:none;font-size:0.9em;border:1px solid var(--border-subtle)"><i class="ph ph-video-camera"></i> Смотреть видео</a></div>';
          if (ex.description) bodyDiv.innerHTML += '<div style="background:var(--bg-primary);padding:12px;border-radius:10px;margin:12px 0;font-size:0.9em"><strong style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><i class="ph ph-text-t" style="color:var(--accent-gold)"></i> Техника:</strong><div style="white-space:pre-wrap;line-height:1.6">' + ex.description + '</div></div>';
          if (ex.inventory) bodyDiv.innerHTML += '<div style="background:var(--bg-primary);padding:10px 12px;border-radius:10px;margin:12px 0;font-size:0.9em;display:flex;align-items:start;gap:8px"><i class="ph ph-backpack" style="color:var(--accent-gold);margin-top:2px"></i><div><strong>Инвентарь:</strong> ' + ex.inventory + '</div></div>';
          bodyDiv.innerHTML += '<div style="display:flex;gap:20px;margin:12px 0;font-size:0.85em;flex-wrap:wrap"><div style="display:flex;align-items:center;gap:6px"><i class="ph ph-fire" style="color:var(--accent-warning)"></i> Сложность: ' + self.renderStars(ex.difficulty || 3) + '</div><div style="display:flex;align-items:center;gap:6px"><i class="ph ph-target" style="color:var(--accent-success)"></i> Эффективность: ' + self.renderStars(ex.effectiveness || 3) + '</div></div>';
          if (ex.notes) bodyDiv.innerHTML += '<div style="background:rgba(212,175,55,0.1);padding:10px 12px;border-radius:10px;margin:12px 0;font-size:0.9em;border-left:3px solid var(--accent-gold);display:flex;align-items:start;gap:8px"><i class="ph ph-push-pin" style="color:var(--accent-gold);margin-top:2px"></i><div><strong>Заметки:</strong> ' + ex.notes + '</div></div>';

          bodyDiv.innerHTML += '<div style="margin-top:14px"><div style="font-weight:600;margin-bottom:10px;font-size:0.95em;display:flex;align-items:center;gap:6px"><i class="ph ph-barbell" style="color:var(--accent-gold)"></i> Подходы (' + numSets + ' × ' + numReps + ')</div></div>';
          var setsContainer = document.createElement('div');
          setsContainer.id = 'sets-container-' + ex.id;
          for (var s = 0; s < numSets; s++) {
            var setDiv = document.createElement('div');
            setDiv.className = 'workout-set';
            setDiv.style.cssText = 'display:flex; align-items:center; gap:10px; padding:12px; background:var(--bg-primary); border-radius:10px; margin-bottom:8px; border:1px solid var(--border-subtle);';
            setDiv.innerHTML = '<div style="flex:1;display:flex;align-items:center;gap:8px"><i class="ph ph-number-circle-one" style="color:var(--accent-gold)"></i><div style="font-weight:600">Подход ' + (s + 1) + ' <span style="font-size:0.85em;opacity:0.7">· ' + numReps + ' повт.</span></div></div><i class="ph ph-circle" style="font-size:1.2em;opacity:0.4"></i>';
            setsContainer.appendChild(setDiv);
          }
          bodyDiv.appendChild(setsContainer);

          var goBtn = document.createElement('button');
          goBtn.className = 'go-btn';
          goBtn.innerHTML = '<i class="ph ph-play-circle" style="font-size:1.5em"></i><br>Начать';
          goBtn.style.cssText = 'display:block; margin:18px auto; width:120px; height:120px; border-radius:50%; background:linear-gradient(135deg, var(--accent-gold) 0%, var(--accent-gold-light) 100%); color:#000; border:none; font-size:0.85em; font-weight:700; cursor:pointer; box-shadow:0 4px 20px rgba(212,175,55,0.4); transition:all 0.2s; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px;';
          goBtn.onmouseover = function() { this.style.transform = 'scale(1.05)'; this.style.boxShadow = '0 8px 30px rgba(212,175,55,0.6)'; };
          goBtn.onmouseout = function() { this.style.transform = 'scale(1)'; this.style.boxShadow = '0 4px 20px rgba(212,175,55,0.4)'; };
          goBtn.onclick = function() { self.startExercise(ex.id); };
          bodyDiv.appendChild(goBtn);

          var arrowIcon = headerDiv.querySelector('i.ph-caret-down');
          headerDiv.onclick = function() {
            var isOpen = bodyDiv.style.display !== 'none';
            bodyDiv.style.display = isOpen ? 'none' : 'block';
            if (arrowIcon) arrowIcon.className = isOpen ? 'ph ph-caret-down' : 'ph ph-caret-up';
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
    this.currentExerciseId = null;
    this.expandedExerciseId = null;
  },

  startExercise: function(exId) {
    this.currentExerciseId = exId;
    var plan = this.getPlan();
    var todayIdx = this.getTodayIndex();
    var todayPlan = plan[todayIdx];
    var exRef = null;
    for (var i = 0; i < todayPlan.exercises.length; i++) if (todayPlan.exercises[i].id === exId) { exRef = todayPlan.exercises[i]; break; }
    if (!exRef) return;

    var setsStr = exRef.sets || '3×10';
    var setsMatch = setsStr.match(/(\d+)\s*[×xх*]\s*(\d+)/i);
    var numSets = setsMatch ? parseInt(setsMatch[1]) : 3;
    var numReps = setsMatch ? parseInt(setsMatch[2]) : 10;

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
    closeBtn.style.cssText = 'float:right;background:transparent;border:none;color:var(--text-secondary);font-size:1.5em;cursor:pointer';
    closeBtn.onclick = function() { subModal.remove(); };
    subContent.appendChild(closeBtn);

    var title = document.createElement('h2');
    title.style.cssText = 'font-family:var(--font-display);color:var(--accent-gold);margin-top:0;text-align:center;display:flex;align-items:center;justify-content:center;gap:10px';
    title.innerHTML = '<i class="ph ph-barbell"></i> Упражнение';
    subContent.appendChild(title);

    var setsContainer = document.createElement('div');
    setsContainer.id = 'modalSetsContainer';

    for (var s = 0; s < numSets; s++) {
      (function(setIdx) {
        var setDiv = document.createElement('div');
        setDiv.className = 'workout-set';
        setDiv.id = 'modal-set-' + setIdx;
        setDiv.style.cssText = 'display:flex; align-items:center; gap:10px; padding:12px; background:var(--bg-primary); border-radius:10px; margin-bottom:8px; border:1px solid var(--border-subtle);';

        var info = document.createElement('div');
        info.style.flex = '1';
        info.innerHTML = '<div style="font-weight:600;display:flex;align-items:center;gap:8px"><i class="ph ph-number-circle-' + (setIdx + 1) + '" style="color:var(--accent-gold)"></i> Подход ' + (setIdx + 1) + '</div><div style="font-size:0.85em;opacity:0.7;margin-top:2px;display:flex;align-items:center;gap:4px"><i class="ph ph-arrows-clockwise"></i> ' + numReps + ' повторений</div>';
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
    var todayStr = new Date().toISOString().slice(0, 10);
    var dayRecord = null;
    for (var i = 0; i < history.length; i++) if (history[i].date === todayStr) { dayRecord = history[i]; break; }
    if (!dayRecord) {
      dayRecord = { date: todayStr, dayName: ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'][this.getTodayIndex()], muscleGroup: '', exercises: [{id: exId}], details: [], duration: 0, timestamp: Date.now() };
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

    this.showMiniSurvey(exId, setIdx, numReps, dayRecord, exDetail, history);
  },

  showMiniSurvey: function(exId, setIdx, numReps, dayRecord, exDetail, history) {
    if (typeof FTStorage !== 'undefined') {
      var settings = FTStorage.get('settings') || {};
      if (settings.disableMiniSurvey) {
        this.markSetDone(exId, setIdx, 'done', null, dayRecord, exDetail, history);
        return;
      }
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
    title.style.cssText = 'font-family:var(--font-display);color:var(--accent-gold);margin-top:0;text-align:center;display:flex;align-items:center;justify-content:center;gap:10px';
    title.innerHTML = '<i class="ph ph-clipboard-text"></i> Подход ' + (setIdx + 1);
    content.appendChild(title);

    var question = document.createElement('p');
    question.style.cssText = 'text-align:center;margin-bottom:18px;font-size:1.05em';
    question.textContent = 'Удалось выполнить все ' + numReps + ' повторений?';
    content.appendChild(question);

    var buttonsDiv = document.createElement('div');
    buttonsDiv.style.cssText = 'display:flex;flex-direction:column;gap:10px';

    var btnYes = document.createElement('button');
    btnYes.className = 'btn';
    btnYes.innerHTML = '<i class="ph ph-check-circle"></i> Да, все повторения';
    btnYes.style.cssText = 'padding:14px;background:linear-gradient(135deg, #00ff88, #00cc6a);color:#000;border:none;border-radius:10px;cursor:pointer;font-weight:600;font-size:1em';
    btnYes.onclick = function() { self.answerMiniSurvey('yes', setIdx, numReps); };
    buttonsDiv.appendChild(btnYes);

    var btnPartial = document.createElement('button');
    btnPartial.className = 'btn';
    btnPartial.innerHTML = '<i class="ph ph-warning-circle"></i> Частично';
    btnPartial.style.cssText = 'padding:14px;background:linear-gradient(135deg, #FFB347, #FFC870);color:#000;border:none;border-radius:10px;cursor:pointer;font-weight:600;font-size:1em';
    btnPartial.onclick = function() { self.answerMiniSurvey('partial', setIdx, numReps); };
    buttonsDiv.appendChild(btnPartial);

    var btnNo = document.createElement('button');
    btnNo.className = 'btn';
    btnNo.innerHTML = '<i class="ph ph-x-circle"></i> Нет';
    btnNo.style.cssText = 'padding:14px;background:linear-gradient(135deg, #ff3366, #ff5577);color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:600;font-size:1em';
    btnNo.onclick = function() { self.answerMiniSurvey('no', setIdx, numReps); };
    buttonsDiv.appendChild(btnNo);

    var btnSkip = document.createElement('button');
    btnSkip.className = 'btn';
    btnSkip.innerHTML = '<i class="ph ph-skip-forward"></i> Пропустить';
    btnSkip.style.cssText = 'padding:12px;background:var(--bg-card);color:var(--text-secondary);border:1px solid var(--border-subtle);border-radius:10px;cursor:pointer;font-size:0.95em';
    btnSkip.onclick = function() { self.answerMiniSurvey('skip', setIdx, numReps); };
    buttonsDiv.appendChild(btnSkip);

    content.appendChild(buttonsDiv);

    var checkboxDiv = document.createElement('div');
    checkboxDiv.style.cssText = 'margin-top:14px;text-align:center';
    var label = document.createElement('label');
    label.style.cssText = 'font-size:0.85em;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;opacity:0.8';
    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'dontAskAgain';
    checkbox.style.cssText = 'width:16px;height:16px;accent-color:var(--accent-gold)';
    var span = document.createElement('span');
    span.textContent = 'Больше не спрашивать';
    label.appendChild(checkbox);
    label.appendChild(span);
    checkboxDiv.appendChild(label);
    content.appendChild(checkboxDiv);

    modal.appendChild(content);
    document.body.appendChild(modal);
  },

  answerMiniSurvey: function(answer, setIdx, numReps) {
    var exId = this.currentExerciseId;
    var history = this.getHistory();
    var todayStr = new Date().toISOString().slice(0, 10);
    var dayRecord = null;
    for (var i = 0; i < history.length; i++) if (history[i].date === todayStr) { dayRecord = history[i]; break; }
    if (!dayRecord) return;
    var exDetail = null;
    for (var i = 0; i < dayRecord.details.length; i++) if (dayRecord.details[i].exId === exId) { exDetail = dayRecord.details[i]; break; }
    if (!exDetail) return;

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

    var setStatus = 'done';
    var partialReps = null;

    if (answer === 'yes') setStatus = 'done';
    else if (answer === 'partial') {
      var repsInput = prompt('Сколько повторений удалось выполнить? (из ' + numReps + ')', Math.floor(numReps * 0.7));
      partialReps = parseInt(repsInput) || 0;
      setStatus = partialReps > 0 ? 'partial' : 'missed';
    } else if (answer === 'no') setStatus = 'missed';
    else if (answer === 'skip') setStatus = 'done';

    this.markSetDone(exId, setIdx, setStatus, partialReps, dayRecord, exDetail, history);
  },

  markSetDone: function(exId, setIdx, setStatus, partialReps, dayRecord, exDetail, history) {
    while (exDetail.sets.length <= setIdx) exDetail.sets.push(null);
    while (exDetail.partialReps.length <= setIdx) exDetail.partialReps.push(null);
    exDetail.sets[setIdx] = setStatus;
    if (partialReps !== null) exDetail.partialReps[setIdx] = partialReps;

    var stats = this.getStats();
    var xpChange = 0;
    if (setStatus === 'done') xpChange = 5;
    else if (setStatus === 'partial') xpChange = 3;
    else if (setStatus === 'missed') xpChange = -2;
    stats.xp = Math.max(0, stats.xp + xpChange);
    var xpNeeded = stats.level * 100;
    if (stats.xp >= xpNeeded) {
      stats.xp -= xpNeeded;
      stats.level++;
      setTimeout(function() { alert('Новый уровень ' + stats.level + '!'); }, 100);
    }
    this.saveStats(stats);
    this.saveHistory(history);

    var setEl = document.getElementById('modal-set-' + setIdx);
    if (setEl) {
      var iconMap = { 'done': 'ph-check-circle', 'partial': 'ph-warning-circle', 'missed': 'ph-x-circle' };
      var colorMap = { 'done': '#00ff88', 'partial': '#FFB347', 'missed': '#ff3366' };
      var bgMap = { 'done': 'rgba(0,255,136,0.1)', 'partial': 'rgba(255,179,71,0.1)', 'missed': 'rgba(255,51,102,0.1)' };
      setEl.style.background = bgMap[setStatus];
      setEl.style.borderLeft = '3px solid ' + colorMap[setStatus];
      var btn = setEl.querySelector('button');
      if (btn) {
        var labelMap = { 'done': 'Выполнено', 'partial': partialReps + ' повт.', 'missed': 'Пропущено' };
        btn.innerHTML = '<i class="ph ' + iconMap[setStatus] + '"></i> ' + labelMap[setStatus];
        btn.disabled = true;
        btn.style.opacity = '0.6';
      }
    }

    var plan = this.getPlan();
    var todayIdx = this.getTodayIndex();
    var todayPlan = plan[todayIdx];
    var exRef = null;
    for (var i = 0; i < todayPlan.exercises.length; i++) if (todayPlan.exercises[i].id === exId) { exRef = todayPlan.exercises[i]; break; }
    if (exRef) {
      var setsStr = exRef.sets || '3×10';
      var setsMatch = setsStr.match(/(\d+)\s*[×xх*]\s*(\d+)/i);
      var numSets = setsMatch ? parseInt(setsMatch[1]) : 3;
      var allDone = true;
      for (var s = 0; s < numSets; s++) if (!exDetail.sets[s]) { allDone = false; break; }
      if (allDone) {
        var self = this;
        setTimeout(function() {
          alert('Упражнение завершено! +' + (5 * numSets) + ' XP');
          var exModal = document.getElementById('exerciseModal');
          if (exModal) exModal.remove();
          self.closeWorkoutModal();
          self.openWorkoutModal();
        }, 300);
      }
    }
  }
};

window.WorkoutModule = WorkoutModule;
module.exports = WorkoutModule;