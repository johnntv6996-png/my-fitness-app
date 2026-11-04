// modules/workout.js

const WorkoutModule = {
  currentExerciseId: null,
  expandedExerciseId: null,
  modalElement: null,

  init: function() {
    console.log('🏋️ Workout module initialized');
    if (typeof Logger !== 'undefined') Logger.log('Модуль тренировки инициализирован', 'info');
    // НЕ добавляем кнопку в навигацию — тренировка запускается из welcome
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
  renderStars: function(c) { var s = ''; for (var i = 1; i <= 5; i++) s += i <= c ? '★' : '☆'; return s; },

  // Главная функция — открыть модалку тренировки
  openWorkoutModal: function() {
    var self = this;
    var plan = this.getPlan();
    var db = this.getDB();
    var todayIdx = this.getTodayIndex();
    var todayPlan = plan[todayIdx] || { dayName: 'Сегодня', muscleGroup: '', exercises: [] };
    var stats = this.getStats();
    var xpNeeded = stats.level * 100;
    var xpPercent = Math.min(100, Math.round((stats.xp / xpNeeded) * 100));

    // Удалить старую модалку если есть
    this.closeWorkoutModal();

    var modal = document.createElement('div');
    modal.className = 'workout-modal';
    modal.id = 'workoutModal';

    var content = document.createElement('div');
    content.className = 'workout-modal-content';

    // Статус-бар
    var statusBar = document.createElement('div');
    statusBar.style.cssText = 'background:linear-gradient(135deg, #3D3D3D 0%, #2a2a2a 100%); border-radius:10px 10px 0 0; padding:10px 14px; border-bottom:1px solid var(--acc);';
    statusBar.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
      '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:1.3em">⭐</span><span style="font-size:1.3em;font-weight:bold;color:var(--acc)">' + stats.level + '</span><span style="font-size:0.75em;opacity:0.7">уровень</span></div>' +
      '<div style="text-align:right"><div style="font-size:0.75em;opacity:0.7">XP</div><div style="font-size:0.95em;font-weight:bold">' + stats.xp + '/' + xpNeeded + '</div></div></div>' +
      '<div style="height:6px;background:var(--bg);border-radius:3px;overflow:hidden;border:1px solid var(--brd)"><div style="height:100%;width:' + xpPercent + '%;background:linear-gradient(90deg, var(--acc), var(--warn));border-radius:3px"></div></div>' +
      '<div style="text-align:center;font-size:0.7em;opacity:0.6;margin-top:4px">До следующего уровня: ' + (xpNeeded - stats.xp) + ' XP</div>';
    content.appendChild(statusBar);

    // Кнопка закрытия
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'position:sticky; top:10px; float:right; background:var(--card); border:1px solid var(--brd); color:var(--text); width:36px; height:36px; border-radius:50%; font-size:1.2em; cursor:pointer; z-index:10; margin:10px';
    closeBtn.onclick = function() { self.closeWorkoutModal(); };
    content.appendChild(closeBtn);

    // Заголовок дня
    var header = document.createElement('div');
    header.style.cssText = 'text-align:center; padding:10px 15px;';
    header.innerHTML = '<h2 style="color:var(--acc);margin:0 0 5px 0">🏋️ ' + todayPlan.dayName + '</h2>' +
      '<div style="font-size:0.9em;opacity:0.7">' + (todayPlan.muscleGroup || 'Тренировка') + ' · ' + todayPlan.exercises.length + ' упражнений</div>';
    content.appendChild(header);

    // Список упражнений
    if (todayPlan.exercises.length === 0) {
      var empty = document.createElement('div');
      empty.style.cssText = 'text-align:center; padding:30px; opacity:0.6;';
      empty.innerHTML = '<div style="font-size:3em;margin-bottom:10px">📝</div><p>План на сегодня пуст</p>';
      content.appendChild(empty);
    } else {
      for (var i = 0; i < todayPlan.exercises.length; i++) {
        (function(idx) {
          var exRef = todayPlan.exercises[idx];
          var ex = null;
          for (var j = 0; j < db.length; j++) if (db[j].id === exRef.id) { ex = db[j]; break; }
          if (!ex) return;

          var card = document.createElement('div');
          card.style.cssText = 'background:var(--card); border-radius:10px; margin:10px 15px; border-left:4px solid var(--acc); overflow:hidden;';

          var setsStr = exRef.sets || '3×10';
          var setsMatch = setsStr.match(/(\d+)\s*[×xх*]\s*(\d+)/i);
          var numSets = setsMatch ? parseInt(setsMatch[1]) : 3;
          var numReps = setsMatch ? parseInt(setsMatch[2]) : 10;

          var headerDiv = document.createElement('div');
          headerDiv.style.cssText = 'padding:12px 15px; cursor:pointer; display:flex; justify-content:space-between; align-items:center;';
          headerDiv.innerHTML = '<div style="flex:1"><div style="font-weight:700;font-size:1.05em;color:var(--acc)">' + (idx + 1) + '. ' + ex.name + '</div><div style="font-size:0.8em;opacity:0.7">' + (ex.muscleGroup || '❓') + ' · ' + setsStr + '</div></div><div style="font-size:1.2em;opacity:0.7" class="ex-arrow">▶</div>';

          var bodyDiv = document.createElement('div');
          bodyDiv.style.cssText = 'display:none; padding:0 15px 15px; border-top:1px solid var(--brd);';

          if (ex.imageUrl) bodyDiv.innerHTML += '<div style="margin:10px 0;border-radius:8px;overflow:hidden;max-height:200px"><img src="' + ex.imageUrl + '" style="width:100%;object-fit:cover" onerror="this.parentElement.style.display=\'none\'"></div>';
          if (ex.videoUrl) bodyDiv.innerHTML += '<div style="margin:10px 0"><a href="' + ex.videoUrl + '" target="_blank" style="display:inline-block;padding:6px 12px;background:var(--brd);border-radius:6px;color:var(--text);text-decoration:none;font-size:0.85em">📺 Смотреть видео</a></div>';
          if (ex.description) bodyDiv.innerHTML += '<div style="background:var(--inp);padding:10px;border-radius:8px;margin:10px 0;font-size:0.9em"><strong>📝 Техника:</strong><div style="white-space:pre-wrap;margin-top:5px">' + ex.description + '</div></div>';
          if (ex.inventory) bodyDiv.innerHTML += '<div style="background:var(--inp);padding:8px 10px;border-radius:8px;margin:10px 0;font-size:0.85em">🎒 <strong>Инвентарь:</strong> ' + ex.inventory + '</div>';
          bodyDiv.innerHTML += '<div style="display:flex;gap:15px;margin:10px 0;font-size:0.85em"><div>Сложность: <span style="color:var(--acc);letter-spacing:2px">' + self.renderStars(ex.difficulty || 3) + '</span></div><div>Эффективность: <span style="color:var(--acc);letter-spacing:2px">' + self.renderStars(ex.effectiveness || 3) + '</span></div></div>';
          if (ex.notes) bodyDiv.innerHTML += '<div style="background:rgba(255,215,0,0.1);padding:8px 10px;border-radius:8px;margin:10px 0;font-size:0.85em;border-left:3px solid var(--acc)">📌 <strong>Заметки:</strong> ' + ex.notes + '</div>';

          bodyDiv.innerHTML += '<div style="margin-top:12px"><div style="font-weight:600;margin-bottom:8px;font-size:0.95em">🏋️ Подходы (' + numSets + ' × ' + numReps + ')</div></div>';
          var setsContainer = document.createElement('div');
          setsContainer.id = 'sets-container-' + ex.id;
          for (var s = 0; s < numSets; s++) {
            var setDiv = document.createElement('div');
            setDiv.className = 'workout-set';
            setDiv.style.cssText = 'display:flex; align-items:center; gap:10px; padding:10px; background:var(--inp); border-radius:8px; margin-bottom:6px;';
            setDiv.innerHTML = '<div style="flex:1"><div style="font-weight:600">Подход ' + (s + 1) + ' <span style="font-size:0.85em;opacity:0.7">· ' + numReps + ' повт.</span></div></div><span style="font-size:1.2em;opacity:0.5">○</span>';
            setsContainer.appendChild(setDiv);
          }
          bodyDiv.appendChild(setsContainer);

          var goBtn = document.createElement('button');
          goBtn.className = 'go-btn';
          goBtn.textContent = 'ПОГНАЛИ!';
          goBtn.style.cssText = 'display:block; margin:15px auto; width:100px; height:100px; border-radius:50%; background:linear-gradient(135deg, var(--acc) 0%, #FFF8DC 100%); color:#2c3e50; border:none; font-size:0.9em; font-weight:700; cursor:pointer; box-shadow:0 4px 15px rgba(255,215,0,0.4); transition:all 0.2s;';
          goBtn.onmouseover = function() { this.style.transform = 'scale(1.05)'; };
          goBtn.onmouseout = function() { this.style.transform = 'scale(1)'; };
          goBtn.onclick = function() { self.startExercise(ex.id); };
          bodyDiv.appendChild(goBtn);

          headerDiv.onclick = function() {
            var isOpen = bodyDiv.style.display !== 'none';
            bodyDiv.style.display = isOpen ? 'none' : 'block';
            headerDiv.querySelector('.ex-arrow').textContent = isOpen ? '▶' : '▼';
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
    if (this.modalElement) {
      this.modalElement.remove();
      this.modalElement = null;
    }
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

    // Создать модалку подходов
    var subModal = document.createElement('div');
    subModal.className = 'workout-modal';
    subModal.id = 'exerciseModal';
    subModal.style.zIndex = '2100';

    var subContent = document.createElement('div');
    subContent.className = 'workout-modal-content';
    subContent.style.maxWidth = '400px';

    var closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'float:right; background:transparent; border:none; color:var(--text); font-size:1.5em; cursor:pointer';
    closeBtn.onclick = function() { subModal.remove(); };
    subContent.appendChild(closeBtn);

    var title = document.createElement('h2');
    title.style.cssText = 'color:var(--acc); margin-top:0; text-align:center';
    title.textContent = '🏋️ Упражнение';
    subContent.appendChild(title);

    var setsContainer = document.createElement('div');
    setsContainer.id = 'modalSetsContainer';

    for (var s = 0; s < numSets; s++) {
      (function(setIdx) {
        var setDiv = document.createElement('div');
        setDiv.className = 'workout-set';
        setDiv.id = 'modal-set-' + setIdx;
        setDiv.style.cssText = 'display:flex; align-items:center; gap:10px; padding:10px; background:var(--inp); border-radius:8px; margin-bottom:6px;';

        var info = document.createElement('div');
        info.style.flex = '1';
        info.innerHTML = '<div style="font-weight:600">Подход ' + (setIdx + 1) + '</div><div style="font-size:0.85em;opacity:0.7">' + numReps + ' повторений</div>';
        setDiv.appendChild(info);

        var btn = document.createElement('button');
        btn.className = 'btn';
        btn.textContent = '✅ Выполнено';
        btn.style.cssText = 'padding:8px 16px; background:var(--ok); color:#2c3e50; border:none; border-radius:6px; cursor:pointer; font-weight:700';
        btn.onclick = function() { self.completeSet(setIdx, numReps); };
        setDiv.appendChild(btn);

        setsContainer.appendChild(setDiv);
      })(s);
    }

    subContent.appendChild(setsContainer);

    var closeAllBtn = document.createElement('button');
    closeAllBtn.className = 'btn';
    closeAllBtn.textContent = 'Закрыть';
    closeAllBtn.style.cssText = 'width:100%; padding:10px; margin-top:15px; background:var(--brd); color:var(--text); border:none; border-radius:6px; cursor:pointer';
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
    // Проверяем настройку
    if (typeof FTStorage !== 'undefined') {
      var settings = FTStorage.get('settings') || {};
      if (settings.disableMiniSurvey) {
        this.markSetDone(exId, setIdx, 'done', null, dayRecord, exDetail, history);
        return;
      }
    }

    var self = this;

    // Закрыть модалку упражнения
    var exModal = document.getElementById('exerciseModal');
    if (exModal) exModal.remove();

    // Создать модалку мини-опроса
    var modal = document.createElement('div');
    modal.className = 'workout-modal';
    modal.id = 'miniSurveyModal';
    modal.style.zIndex = '2200';

    var content = document.createElement('div');
    content.className = 'workout-modal-content';
    content.style.maxWidth = '400px';

    var title = document.createElement('h2');
    title.style.cssText = 'color:var(--acc); margin-top:0; text-align:center';
    title.textContent = '📋 Подход ' + (setIdx + 1);
    content.appendChild(title);

    var question = document.createElement('p');
    question.style.cssText = 'text-align:center; margin-bottom:15px';
    question.textContent = 'Удалось выполнить все ' + numReps + ' повторений?';
    content.appendChild(question);

    var buttonsDiv = document.createElement('div');
    buttonsDiv.style.cssText = 'display:flex; flex-direction:column; gap:8px';

    var btnYes = document.createElement('button');
    btnYes.className = 'btn';
    btnYes.textContent = '✅ Да, все повторения';
    btnYes.style.cssText = 'padding:12px; background:var(--ok); color:#2c3e50; border:none; border-radius:8px; cursor:pointer; font-weight:700; font-size:1em';
    btnYes.onclick = function() { self.answerMiniSurvey('yes', setIdx, numReps); };
    buttonsDiv.appendChild(btnYes);

    var btnPartial = document.createElement('button');
    btnPartial.className = 'btn';
    btnPartial.textContent = '⚠️ Частично';
    btnPartial.style.cssText = 'padding:12px; background:#FFB347; color:#3a2a0a; border:none; border-radius:8px; cursor:pointer; font-weight:700; font-size:1em';
    btnPartial.onclick = function() { self.answerMiniSurvey('partial', setIdx, numReps); };
    buttonsDiv.appendChild(btnPartial);

    var btnNo = document.createElement('button');
    btnNo.className = 'btn';
    btnNo.textContent = '❌ Нет';
    btnNo.style.cssText = 'padding:12px; background:#e74c3c; color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:700; font-size:1em';
    btnNo.onclick = function() { self.answerMiniSurvey('no', setIdx, numReps); };
    buttonsDiv.appendChild(btnNo);

    var btnSkip = document.createElement('button');
    btnSkip.className = 'btn';
    btnSkip.textContent = '⏭ Пропустить';
    btnSkip.style.cssText = 'padding:10px; background:var(--brd); color:var(--text); border:none; border-radius:6px; cursor:pointer; font-size:0.9em';
    btnSkip.onclick = function() { self.answerMiniSurvey('skip', setIdx, numReps); };
    buttonsDiv.appendChild(btnSkip);

    content.appendChild(buttonsDiv);

    var checkboxDiv = document.createElement('div');
    checkboxDiv.style.cssText = 'margin-top:12px; text-align:center';
    var label = document.createElement('label');
    label.style.cssText = 'font-size:0.85em; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px';
    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'dontAskAgain';
    checkbox.style.cssText = 'width:16px; height:16px; accent-color:var(--acc)';
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

    // Чекбокс "Больше не спрашивать"
    var dontAskCheckbox = document.getElementById('dontAskAgain');
    if (dontAskCheckbox && dontAskCheckbox.checked) {
      if (typeof FTStorage !== 'undefined') {
        var settings = FTStorage.get('settings') || {};
        settings.disableMiniSurvey = true;
        FTStorage.set('settings', settings);
      }
    }

    // Закрыть модалку мини-опроса
    var miniModal = document.getElementById('miniSurveyModal');
    if (miniModal) miniModal.remove();

    var setStatus = 'done';
    var partialReps = null;

    if (answer === 'yes') {
      setStatus = 'done';
    } else if (answer === 'partial') {
      var repsInput = prompt('Сколько повторений удалось выполнить? (из ' + numReps + ')', Math.floor(numReps * 0.7));
      partialReps = parseInt(repsInput) || 0;
      setStatus = partialReps > 0 ? 'partial' : 'missed';
    } else if (answer === 'no') {
      setStatus = 'missed';
    } else if (answer === 'skip') {
      setStatus = 'done';
    }

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
      setTimeout(function() { alert('🎉 Новый уровень ' + stats.level + '!'); }, 100);
    }
    this.saveStats(stats);
    this.saveHistory(history);

    // Обновить UI в модалке упражнения
    var setEl = document.getElementById('modal-set-' + setIdx);
    if (setEl) {
      setEl.style.background = setStatus === 'done' ? 'rgba(144,238,144,0.15)' : setStatus === 'missed' ? 'rgba(231,76,60,0.15)' : 'rgba(255,179,71,0.15)';
      setEl.style.borderLeft = '3px solid ' + (setStatus === 'done' ? 'var(--ok)' : setStatus === 'missed' ? 'var(--err)' : '#FFB347');
      var btn = setEl.querySelector('button');
      if (btn) {
        if (setStatus === 'done') { btn.textContent = '✅ Выполнено'; btn.disabled = true; btn.style.opacity = '0.6'; }
        else if (setStatus === 'partial') { btn.textContent = '⚠️ ' + partialReps + ' повт.'; btn.disabled = true; btn.style.opacity = '0.6'; }
        else if (setStatus === 'missed') { btn.textContent = '❌ Пропущено'; btn.disabled = true; btn.style.opacity = '0.6'; }
      }
    }

    // Проверить завершение упражнения
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
          alert('🎉 Упражнение завершено! +' + (5 * numSets) + ' XP');
          var exModal = document.getElementById('exerciseModal');
          if (exModal) exModal.remove();
          // Обновить главную модалку
          self.closeWorkoutModal();
          self.openWorkoutModal();
        }, 300);
      }
    }
  }
};

window.WorkoutModule = WorkoutModule;
module.exports = WorkoutModule;