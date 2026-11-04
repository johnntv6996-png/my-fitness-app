// modules/workout.js

const WorkoutModule = {
  currentExerciseId: null,
  expandedExerciseId: null,

  init: function() {
    console.log('🏋️ Workout module initialized');
    if (typeof Logger !== 'undefined') Logger.log('Модуль тренировки инициализирован', 'info');
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { WorkoutModule.setup(); });
    } else { this.setup(); }
  },

  setup: function() {
    this.createWorkoutScreen();
    if (typeof Core !== 'undefined') Core.addNavButton('Тренировка', 'workout', '🏋️');
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
    for (var i = 1; i <= 5; i++) s += i <= c ? '★' : '☆';
    return s;
  },

  createWorkoutScreen: function() {
    var screen = document.getElementById('screen-workout');
    if (!screen) {
      screen = document.createElement('div');
      screen.id = 'screen-workout';
      screen.className = 'screen';
      document.getElementById('userInterface').appendChild(screen);
    }

    var stats = this.getStats();
    var plan = this.getPlan();
    var db = this.getDB();
    var todayIdx = this.getTodayIndex();
    var todayPlan = plan[todayIdx] || { dayName: 'Сегодня', muscleGroup: '', exercises: [] };
    var xpNeeded = stats.level * 100;
    var xpPercent = Math.min(100, Math.round((stats.xp / xpNeeded) * 100));

    var css = '<style>' +
      '.workout-status-bar { background:linear-gradient(135deg, #3D3D3D 0%, #2a2a2a 100%); border-radius:10px; padding:10px 14px; margin-bottom:15px; border:1px solid var(--acc); }' +
      '.workout-ex-card { background:var(--card); border-radius:10px; margin-bottom:10px; border-left:4px solid var(--acc); overflow:hidden; }' +
      '.workout-ex-header { padding:12px 15px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; }' +
      '.workout-ex-header:hover { background:rgba(255,255,255,0.05); }' +
      '.workout-ex-body { padding:0 15px 15px; border-top:1px solid var(--brd); }' +
      '.workout-set { display:flex; align-items:center; gap:10px; padding:10px; background:var(--inp); border-radius:8px; margin-bottom:6px; }' +
      '.workout-set.done { background:rgba(144,238,144,0.15); border-left:3px solid var(--ok); }' +
      '.workout-set.missed { background:rgba(231,76,60,0.15); border-left:3px solid var(--err); }' +
      '.go-btn { width:80px; height:80px; border-radius:50%; background:linear-gradient(135deg, var(--acc) 0%, #FFF8DC 100%); color:#2c3e50; border:none; font-size:0.9em; font-weight:700; cursor:pointer; box-shadow:0 4px 15px rgba(255,215,0,0.4); transition:all 0.2s; }' +
      '.go-btn:hover { transform:scale(1.05); box-shadow:0 6px 20px rgba(255,215,0,0.6); }' +
      '.go-btn:active { transform:scale(0.95); }' +
      '.hint { font-size:0.75em; opacity:0.6; margin-top:3px; }' +
      '.stars { color:var(--acc); letter-spacing:2px; }' +
      '.survey-modal { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:1000; display:flex; justify-content:center; align-items:center; padding:15px; }' +
      '.survey-modal-content { background:var(--card); padding:20px; border-radius:12px; width:100%; max-width:400px; }' +
    '</style>';

    // Статус-бар
    var statusBarHtml = '<div class="workout-status-bar">';
    statusBarHtml += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">';
    statusBarHtml += '<div style="display:flex;align-items:center;gap:8px">';
    statusBarHtml += '<span style="font-size:1.3em">⭐</span>';
    statusBarHtml += '<span style="font-size:1.3em;font-weight:bold;color:var(--acc)">' + stats.level + '</span>';
    statusBarHtml += '<span style="font-size:0.75em;opacity:0.7">уровень</span>';
    statusBarHtml += '</div>';
    statusBarHtml += '<div style="text-align:right">';
    statusBarHtml += '<div style="font-size:0.75em;opacity:0.7">XP</div>';
    statusBarHtml += '<div style="font-size:0.95em;font-weight:bold">' + stats.xp + '/' + xpNeeded + '</div>';
    statusBarHtml += '</div></div>';
    statusBarHtml += '<div style="height:6px;background:var(--bg);border-radius:3px;overflow:hidden;border:1px solid var(--brd)">';
    statusBarHtml += '<div style="height:100%;width:' + xpPercent + '%;background:linear-gradient(90deg, var(--acc), var(--warn));border-radius:3px;transition:width 0.5s"></div>';
    statusBarHtml += '</div>';
    statusBarHtml += '<div style="text-align:center;font-size:0.7em;opacity:0.6;margin-top:4px">До следующего уровня: ' + (xpNeeded - stats.xp) + ' XP</div>';
    statusBarHtml += '</div>';

    // Заголовок дня
    var dayHeaderHtml = '<div style="text-align:center;margin-bottom:15px">';
    dayHeaderHtml += '<h2 style="color:var(--acc);margin:0 0 5px 0">🏋️ ' + todayPlan.dayName + '</h2>';
    dayHeaderHtml += '<div style="font-size:0.9em;opacity:0.7">' + (todayPlan.muscleGroup || 'Тренировка') + ' · ' + todayPlan.exercises.length + ' упражнений</div>';
    dayHeaderHtml += '</div>';

    // Список упражнений
    var exercisesHtml = '';
    if (todayPlan.exercises.length === 0) {
      exercisesHtml = '<div style="text-align:center;padding:30px;opacity:0.6"><div style="font-size:3em;margin-bottom:10px">📝</div><p>План на сегодня пуст</p>' +
        '<button class="btn" style="margin-top:10px;padding:10px 20px;background:var(--acc);color:#2c3e50;border:none;border-radius:6px;cursor:pointer" onclick="Core.navigate(\'plan\')">Составить план</button></div>';
    } else {
      for (var i = 0; i < todayPlan.exercises.length; i++) {
        var exRef = todayPlan.exercises[i];
        var ex = null;
        for (var j = 0; j < db.length; j++) if (db[j].id === exRef.id) { ex = db[j]; break; }
        if (!ex) continue;

        var isExpanded = this.expandedExerciseId === ex.id;
        var setsStr = exRef.sets || '3×10';
        var setsMatch = setsStr.match(/(\d+)\s*[×xх*]\s*(\d+)/i);
        var numSets = setsMatch ? parseInt(setsMatch[1]) : 3;
        var numReps = setsMatch ? parseInt(setsMatch[2]) : 10;

        exercisesHtml += '<div class="workout-ex-card">';
        exercisesHtml += '<div class="workout-ex-header" onclick="WorkoutModule.toggleExercise(\'' + ex.id + '\')">';
        exercisesHtml += '<div style="flex:1">';
        exercisesHtml += '<div style="font-weight:700;font-size:1.05em;color:var(--acc)">' + (i + 1) + '. ' + ex.name + '</div>';
        exercisesHtml += '<div style="font-size:0.8em;opacity:0.7">' + (ex.muscleGroup || '❓') + ' · ' + setsStr + '</div>';
        exercisesHtml += '</div>';
        exercisesHtml += '<div style="font-size:1.2em;opacity:0.7">' + (isExpanded ? '▼' : '▶') + '</div>';
        exercisesHtml += '</div>';

        if (isExpanded) {
          exercisesHtml += '<div class="workout-ex-body">';
          if (ex.imageUrl) exercisesHtml += '<div style="margin-bottom:10px;border-radius:8px;overflow:hidden;max-height:200px"><img src="' + ex.imageUrl + '" style="width:100%;object-fit:cover" onerror="this.parentElement.style.display=\'none\'"></div>';
          if (ex.videoUrl) exercisesHtml += '<div style="margin-bottom:10px"><a href="' + ex.videoUrl + '" target="_blank" style="display:inline-block;padding:6px 12px;background:var(--brd);border-radius:6px;color:var(--text);text-decoration:none;font-size:0.85em">📺 Смотреть видео</a></div>';
          if (ex.description) exercisesHtml += '<div style="background:var(--inp);padding:10px;border-radius:8px;margin-bottom:10px;font-size:0.9em"><strong>📝 Техника:</strong><div style="white-space:pre-wrap;margin-top:5px">' + ex.description + '</div></div>';
          if (ex.inventory) exercisesHtml += '<div style="background:var(--inp);padding:8px 10px;border-radius:8px;margin-bottom:10px;font-size:0.85em">🎒 <strong>Инвентарь:</strong> ' + ex.inventory + '</div>';
          exercisesHtml += '<div style="display:flex;gap:15px;margin-bottom:12px;font-size:0.85em"><div>Сложность: <span class="stars">' + this.renderStars(ex.difficulty || 3) + '</span></div><div>Эффективность: <span class="stars">' + this.renderStars(ex.effectiveness || 3) + '</span></div></div>';
          if (ex.notes) exercisesHtml += '<div style="background:rgba(255,215,0,0.1);padding:8px 10px;border-radius:8px;margin-bottom:12px;font-size:0.85em;border-left:3px solid var(--acc)">📌 <strong>Заметки:</strong> ' + ex.notes + '</div>';

          exercisesHtml += '<div style="margin-top:12px"><div style="font-weight:600;margin-bottom:8px;font-size:0.95em">🏋️ Подходы (' + numSets + ' × ' + numReps + ')</div>';
          for (var s = 0; s < numSets; s++) {
            exercisesHtml += '<div class="workout-set"><div style="flex:1"><div style="font-weight:600">Подход ' + (s + 1) + ' <span style="font-size:0.85em;opacity:0.7">· ' + numReps + ' повт.</span></div></div><span style="font-size:1.2em;opacity:0.5">○</span></div>';
          }
          exercisesHtml += '</div>';

          exercisesHtml += '<div style="text-align:center;margin-top:15px">';
          exercisesHtml += '<button class="go-btn" onclick="WorkoutModule.startExercise(\'' + ex.id + '\')">ПОГНАЛИ!</button>';
          exercisesHtml += '<div class="hint" style="margin-top:8px">Начать упражнение</div>';
          exercisesHtml += '</div>';
          exercisesHtml += '</div>';
        }
        exercisesHtml += '</div>';
      }
    }

    screen.innerHTML = css +
      '<div style="padding:15px;max-width:500px;margin:0 auto">' +
        statusBarHtml + dayHeaderHtml + exercisesHtml +
      '</div>';
  },

  toggleExercise: function(exId) {
    this.expandedExerciseId = this.expandedExerciseId === exId ? null : exId;
    this.createWorkoutScreen();
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

    var modal = document.createElement('div');
    modal.className = 'survey-modal';
    modal.id = 'workoutModal';

    var setsHtml = '';
    for (var s = 0; s < numSets; s++) {
      setsHtml += '<div class="workout-set" id="modal-set-' + s + '">';
      setsHtml += '<div style="flex:1"><div style="font-weight:600">Подход ' + (s + 1) + '</div><div style="font-size:0.85em;opacity:0.7">' + numReps + ' повторений</div></div>';
      setsHtml += '<button class="btn" style="padding:8px 16px;background:var(--ok);color:#2c3e50;border:none;border-radius:6px;cursor:pointer;font-weight:700" onclick="WorkoutModule.completeSet(' + s + ',' + numReps + ')">✅ Выполнено</button>';
      setsHtml += '</div>';
    }

    modal.innerHTML =
      '<div class="survey-modal-content">' +
        '<button style="float:right;background:transparent;border:none;color:var(--text);font-size:1.5em;cursor:pointer" onclick="WorkoutModule.closeWorkoutModal()">×</button>' +
        '<h2 style="color:var(--acc);margin-top:0">🏋️ Упражнение</h2>' +
        '<div id="modalSetsContainer">' + setsHtml + '</div>' +
        '<div style="text-align:center;margin-top:15px">' +
          '<button class="btn" style="padding:10px 20px;background:var(--brd);color:var(--text);border:none;border-radius:6px;cursor:pointer" onclick="WorkoutModule.closeWorkoutModal()">Закрыть</button>' +
        '</div></div>';
    document.body.appendChild(modal);
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

    var modal = document.createElement('div');
    modal.className = 'survey-modal';
    modal.id = 'miniSurveyModal';
    modal.innerHTML =
      '<div class="survey-modal-content">' +
        '<h2 style="color:var(--acc);margin-top:0;text-align:center">📋 Подход ' + (setIdx + 1) + '</h2>' +
        '<p style="text-align:center;margin-bottom:15px">Удалось выполнить все ' + numReps + ' повторений?</p>' +
        '<div style="display:flex;flex-direction:column;gap:8px">' +
          '<button class="btn" style="padding:12px;background:var(--ok);color:#2c3e50;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:1em" onclick="WorkoutModule.answerMiniSurvey(\'yes\',' + setIdx + ',' + numReps + ')">✅ Да, все повторения</button>' +
          '<button class="btn" style="padding:12px;background:#FFB347;color:#3a2a0a;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:1em" onclick="WorkoutModule.answerMiniSurvey(\'partial\',' + setIdx + ',' + numReps + ')">⚠️ Частично</button>' +
          '<button class="btn" style="padding:12px;background:#e74c3c;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:1em" onclick="WorkoutModule.answerMiniSurvey(\'no\',' + setIdx + ',' + numReps + ')">❌ Нет</button>' +
          '<button class="btn" style="padding:10px;background:var(--brd);color:var(--text);border:none;border-radius:6px;cursor:pointer;font-size:0.9em" onclick="WorkoutModule.answerMiniSurvey(\'skip\',' + setIdx + ',' + numReps + ')">⏭ Пропустить</button>' +
        '</div>' +
        '<div style="margin-top:12px;text-align:center">' +
          '<label style="font-size:0.85em;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">' +
            '<input type="checkbox" id="dontAskAgain" style="width:16px;height:16px;accent-color:var(--acc)"> ' +
            '<span>Больше не спрашивать</span>' +
          '</label>' +
        '</div>' +
      '</div>';
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

    var setStatus = 'done';
    var partialReps = null;
    if (answer === 'yes') setStatus = 'done';
    else if (answer === 'partial') {
      var repsInput = prompt('Сколько повторений удалось выполнить? (из ' + numReps + ')', Math.floor(numReps * 0.7));
      partialReps = parseInt(repsInput) || 0;
      setStatus = partialReps > 0 ? 'partial' : 'missed';
    } else if (answer === 'no') setStatus = 'missed';
    else if (answer === 'skip') setStatus = 'done';

    var miniModal = document.getElementById('miniSurveyModal');
    if (miniModal) miniModal.remove();

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

    var setEl = document.getElementById('modal-set-' + setIdx);
    if (setEl) {
      setEl.className = 'workout-set ' + setStatus;
      var btn = setEl.querySelector('button');
      if (btn) {
        if (setStatus === 'done') { btn.textContent = '✅ Выполнено'; btn.disabled = true; btn.style.opacity = '0.6'; }
        else if (setStatus === 'partial') { btn.textContent = '⚠️ ' + partialReps + ' повт.'; btn.disabled = true; btn.style.opacity = '0.6'; }
        else if (setStatus === 'missed') { btn.textContent = '❌ Пропущено'; btn.disabled = true; btn.style.opacity = '0.6'; }
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
      for (var s = 0; s < numSets; s++) if (!exDetail.sets[s] || exDetail.sets[s] === 'pending') { allDone = false; break; }
      if (allDone) {
        var self = this;
        setTimeout(function() {
          alert('🎉 Упражнение завершено! +' + (5 * numSets) + ' XP');
          WorkoutModule.closeWorkoutModal();
          self.createWorkoutScreen();
        }, 300);
      }
    }
  },

  closeWorkoutModal: function() {
    var modal = document.getElementById('workoutModal');
    if (modal) modal.remove();
    this.currentExerciseId = null;
  }
};

window.WorkoutModule = WorkoutModule;
module.exports = WorkoutModule;