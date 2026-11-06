// modules/welcome.js

const WelcomeModule = {
  init: function() {
    console.log('Welcome module initialized');
    if (typeof Logger !== 'undefined') Logger.log('Модуль приветствия инициализирован', 'info');
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { WelcomeModule.setup(); });
    } else { this.setup(); }
  },
  setup: function() {
    this.createWelcomeScreen();
    if (typeof Core !== 'undefined') Core.addNavButton('Главная', 'welcome', '<i class="ph ph-house"></i>');
  },
  getUserName: function() { if (typeof FTStorage !== 'undefined') return FTStorage.get('user_name') || ''; return ''; },
  getUserAvatar: function() {
    if (typeof FTStorage !== 'undefined') {
      var avatar = FTStorage.get('user_avatar');
      return avatar || null;
    }
    return null;
  },
  getStats: function() {
    if (typeof FTStorage !== 'undefined') return FTStorage.get('stats') || {yes:0, later:0, no:0, xp:0, level:1, streak:0};
    return {yes:0, later:0, no:0, xp:0, level:1, streak:0};
  },
  getMotivationalMessage: function(stats) {
    var streak = stats.streak || 0;
    if (streak === 0) return {text: 'Начни свой путь сегодня!', icon: 'ph-rocket-launch'};
    if (streak < 3) return {text: 'Хорошее начало! Продолжай', icon: 'ph-flame'};
    if (streak < 7) return {text: 'Отличная серия! Ты на пути', icon: 'ph-target'};
    if (streak < 14) return {text: 'Неделя силы! Ты машина', icon: 'ph-rocket-launch'};
    if (streak < 30) return {text: 'Дисциплина — суперсила', icon: 'ph-lightning'};
    if (streak < 60) return {text: 'Месяц! Ты легенда', icon: 'ph-crown'};
    return {text: 'Ты непобедим', icon: 'ph-trophy'};
  },
  animateValue: function(element, start, end, duration) {
    var startTime = null;
    var range = end - start;
    var step = function(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = Math.floor(start + range * eased);
      if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  },

  createWelcomeScreen: function() {
    var screen = document.getElementById('screen-welcome');
    if (!screen) {
      screen = document.createElement('div');
      screen.id = 'screen-welcome';
      screen.className = 'screen active';
      document.getElementById('userInterface').appendChild(screen);
    }
    var userName = this.getUserName();
    var userAvatar = this.getUserAvatar();
    var greeting = userName ? 'Приветствую, ' + userName + '!' : 'Приветствую!';
    var stats = this.getStats();
    var todayIdx = (new Date().getDay() + 6) % 7;
    var days = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];
    var dayName = days[todayIdx];
    var plan = [];
    if (typeof FTStorage !== 'undefined') plan = FTStorage.get('plan') || [];
    var todayPlan = plan[todayIdx] || null;
    var exCount = todayPlan ? todayPlan.exercises.length : 0;
    var history = [];
    if (typeof FTStorage !== 'undefined') history = FTStorage.get('history') || [];
    var todayStr = new Date().toISOString().slice(0, 10);
    var todayRecord = null;
    for (var i = 0; i < history.length; i++) {
      if (history[i].date === todayStr && history[i].dayName === dayName) { todayRecord = history[i]; break; }
    }
    var motivation = this.getMotivationalMessage(stats);
    var totalXp = stats.xp + (stats.level - 1) * 100;
    var hintsEnabled = typeof shouldShowHints === 'function' ? shouldShowHints() : true;

    // Аватар
    var avatarHtml = '';
    if (userAvatar && userAvatar.startsWith('data:image')) {
      avatarHtml = '<img src="' + userAvatar + '" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid var(--accent-gold)">';
    } else if (userAvatar) {
      avatarHtml = '<i class="ph ' + userAvatar + '" style="font-size:2.2em;color:var(--accent-gold)"></i>';
    } else {
      avatarHtml = '<i class="ph ph-user-circle" style="font-size:2.2em;color:var(--accent-gold)"></i>';
    }

    var css = '<style>' +
      '@keyframes fadeInUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }' +
      '@keyframes pulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.08); } }' +
      '@keyframes glow { 0%,100% { box-shadow:0 0 10px rgba(212,175,55,0.3); } 50% { box-shadow:0 0 25px rgba(212,175,55,0.6); } }' +
      '.w-fade { animation:fadeInUp 0.5s ease-out both; }' +
      '.w-delay-1 { animation-delay:0.1s; } .w-delay-2 { animation-delay:0.2s; }' +
      '.w-delay-3 { animation-delay:0.3s; } .w-delay-4 { animation-delay:0.4s; }' +
      '.w-pulse { animation:pulse 2s ease-in-out infinite; display:inline-block; }' +
      '.w-card { transition:transform 0.2s, box-shadow 0.2s; }' +
      '.w-card:hover { transform:translateY(-2px); box-shadow:0 6px 16px rgba(0,0,0,0.3); }' +
      '.w-icon { color:var(--accent-gold); }' +
      '.go-circle-btn { width:110px; height:110px; border-radius:50%; background:linear-gradient(135deg, var(--accent-gold) 0%, var(--accent-gold-light) 100%); color:#000; border:none; font-size:0.9em; font-weight:700; cursor:pointer; box-shadow:0 4px 20px rgba(212,175,55,0.4); transition:all 0.2s; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; }' +
      '.go-circle-btn:hover { transform:scale(1.05); box-shadow:0 8px 30px rgba(212,175,55,0.6); }' +
      '.go-circle-btn:active { transform:scale(0.97); }' +
      '.go-circle-btn i { font-size:2em; }' +
      '.sub-btn { padding:10px 16px; font-size:0.85em; border-radius:20px; border:1px solid var(--border-subtle); background:var(--bg-card); color:var(--text-secondary); cursor:pointer; transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:6px; }' +
      '.sub-btn:hover { background:var(--accent-gold-dim); color:var(--text-primary); border-color:var(--border-gold); }' +
      '.sub-btn.danger:hover { background:rgba(248,113,113,0.15); border-color:var(--accent-error); color:var(--accent-error); }' +
      '@media (max-width: 480px) { .go-circle-btn { width:95px; height:95px; font-size:0.85em; } .go-circle-btn i { font-size:1.7em; } }' +
    '</style>';

    // Статус дня
    var statusHtml = '';
    if (todayRecord) {
      if (todayRecord.skipped) {
        statusHtml = '<div class="w-fade w-delay-3" style="background:rgba(248,113,113,0.1);padding:10px 14px;border-radius:10px;margin-top:12px;border-left:3px solid var(--accent-error);font-size:0.88em;display:flex;align-items:center;gap:10px"><i class="ph ph-x-circle" style="font-size:1.2em;color:var(--accent-error)"></i><div><strong style="color:var(--accent-error)">День пропущен</strong><div style="font-size:0.85em;opacity:0.7;margin-top:1px">Можно передумать</div></div></div>';
      } else if (todayRecord.exercises && todayRecord.exercises.length > 0) {
        statusHtml = '<div class="w-fade w-delay-3" style="background:rgba(74,222,128,0.1);padding:10px 14px;border-radius:10px;margin-top:12px;border-left:3px solid var(--accent-success);font-size:0.88em;display:flex;align-items:center;gap:10px"><i class="ph ph-check-circle" style="font-size:1.2em;color:var(--accent-success)"></i><div><strong style="color:var(--accent-success)">Тренировка проведена</strong><div style="font-size:0.85em;opacity:0.7;margin-top:1px">' + todayRecord.exercises.length + '/' + exCount + ' упражнений</div></div></div>';
      }
    }

    // Индикатор плана (вместо "нет плана" в карточке приветствия)
    var planIndicator = '';
    if (exCount > 0) {
      planIndicator = '<div class="w-fade w-delay-2" style="background:var(--bg-card);border-radius:10px;padding:10px 14px;margin-bottom:16px;border:1px solid var(--border-subtle);font-size:0.88em;display:flex;align-items:center;gap:10px"><i class="ph ph-list-checks" style="color:var(--accent-gold);font-size:1.2em"></i><div style="flex:1"><strong style="color:var(--accent-gold)">' + dayName + '</strong> · ' + exCount + ' упражнений</div><div style="font-size:0.8em;opacity:0.7">' + (todayPlan.muscleGroup || '') + '</div></div>';
    } else {
      planIndicator = '<div class="w-fade w-delay-2" style="background:var(--bg-card);border-radius:10px;padding:10px 14px;margin-bottom:16px;border:1px solid var(--border-gold);font-size:0.88em;display:flex;align-items:center;gap:10px"><i class="ph ph-calendar-plus" style="color:var(--accent-warning);font-size:1.2em"></i><div style="flex:1"><strong style="color:var(--accent-warning)">План на сегодня не составлен</strong></div><button class="btn btn-primary" style="padding:6px 12px;font-size:0.8em" onclick="WelcomeModule.goToPlan()"><i class="ph ph-plus"></i> Создать</button></div>';
    }

    screen.innerHTML = css +
      '<div style="padding:12px;max-width:480px;margin:0 auto">' +

      // Карточка приветствия
      '<div class="w-fade w-delay-1" style="background:var(--bg-card);border-radius:14px;padding:14px 18px;border:1px solid var(--border-subtle);margin-bottom:12px">' +
        '<div style="display:flex;align-items:center;gap:12px">' +
          avatarHtml +
          '<div style="flex:1;min-width:0"><div style="font-size:1.05em;font-weight:600;color:var(--accent-gold);line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + greeting + '</div><div style="font-size:0.82em;opacity:0.7;margin-top:2px">Сегодня <strong>' + dayName + '</strong></div></div>' +
        '</div>' +
      '</div>' +

      planIndicator +

      // Круглая кнопка + подкнопки
      '<div class="w-fade w-delay-2" style="display:flex;flex-direction:column;align-items:center;gap:10px;margin-bottom:16px">' +
        (exCount > 0 
          ? '<button class="go-circle-btn" id="btnStartWorkout"><i class="ph ph-play-circle"></i><span>Начать</span></button>'
          : '<button class="go-circle-btn" onclick="WelcomeModule.goToPlan()"><i class="ph ph-calendar-plus"></i><span>План</span></button>'
        ) +
        '<div style="display:flex;flex-direction:column;gap:6px;width:100%;max-width:220px">' +
          '<button class="sub-btn" onclick="WelcomeModule.handleAnswer(\'later\')"><i class="ph ph-clock"></i> Позже</button>' +
          '<button class="sub-btn danger" onclick="WelcomeModule.handleAnswer(\'no\')"><i class="ph ph-x"></i> Пропустить</button>' +
        '</div>' +
      '</div>' +

      statusHtml +

      // Карточки статистики (в одну линию, меньше)
      '<div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;margin:14px 0">' +
        '<div class="w-card w-fade w-delay-2" style="background:var(--bg-card);border-radius:10px;padding:10px 6px;text-align:center;border:1px solid var(--border-subtle)"><i class="ph ph-flame w-pulse w-icon" style="font-size:1.3em"></i><div style="font-size:1.1em;font-weight:bold;color:var(--accent-gold);line-height:1.2;margin-top:3px"><span class="w-anim-streak">0</span></div><div style="font-size:0.68em;opacity:0.7">стрик</div></div>' +
        '<div class="w-card w-fade w-delay-3" style="background:var(--bg-card);border-radius:10px;padding:10px 6px;text-align:center;border:1px solid var(--border-subtle)"><i class="ph ph-barbell w-icon" style="font-size:1.3em"></i><div style="font-size:1.1em;font-weight:bold;color:var(--accent-gold);line-height:1.2;margin-top:3px"><span class="w-anim-workouts">0</span></div><div style="font-size:0.68em;opacity:0.7">тренировок</div></div>' +
        '<div class="w-card w-fade w-delay-4" style="background:var(--bg-card);border-radius:10px;padding:10px 6px;text-align:center;border:1px solid var(--border-subtle)"><i class="ph ph-lightning w-icon" style="font-size:1.3em"></i><div style="font-size:1.1em;font-weight:bold;color:var(--accent-gold);line-height:1.2;margin-top:3px"><span class="w-anim-totalxp">0</span></div><div style="font-size:0.68em;opacity:0.7">всего XP</div></div>' +
      '</div>' +

      // Мотивация
      '<div class="w-fade w-delay-4" style="background:var(--bg-card);border-radius:10px;padding:10px 14px;margin-bottom:12px;border-left:3px solid var(--accent-gold);font-size:0.88em;display:flex;align-items:center;gap:10px">' +
        '<i class="ph ' + motivation.icon + ' w-icon" style="font-size:1.2em"></i>' +
        '<div style="color:var(--accent-gold);font-weight:600">' + motivation.text + '</div>' +
      '</div>' +

      // Подсказка про XP
      (hintsEnabled ? '<details class="w-fade w-delay-4" style="background:var(--bg-card);border-radius:10px;padding:10px 14px;font-size:0.78em;opacity:0.85;cursor:pointer;border:1px solid var(--border-subtle)">' +
        '<summary style="font-weight:600;color:var(--accent-gold);margin-bottom:6px;display:flex;align-items:center;gap:8px"><i class="ph ph-info"></i> Как получать XP</summary>' +
        '<div style="margin-top:6px;line-height:1.5">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px"><i class="ph ph-check" style="color:var(--accent-success)"></i> Упражнение: <strong>+5 XP</strong></div>' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px"><i class="ph ph-flag-checkered" style="color:var(--accent-success)"></i> Завершение: <strong>+15 XP</strong></div>' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px"><i class="ph ph-trophy" style="color:var(--accent-success)"></i> День: <strong>+20 XP</strong></div>' +
          '<div style="display:flex;align-items:center;gap:8px"><i class="ph ph-chart-bar" style="color:var(--accent-success)"></i> Данные: <strong>+10 XP</strong></div>' +
        '</div>' +
      '</details>' : '') +

      '</div>';

    var self = this;
    setTimeout(function() {
      var btnStart = document.getElementById('btnStartWorkout');
      if (btnStart) btnStart.onclick = function() { self.startWorkout(); };
      var streakEl = document.querySelector('.w-anim-streak');
      var workoutsEl = document.querySelector('.w-anim-workouts');
      var totalXpEl = document.querySelector('.w-anim-totalxp');
      if (streakEl) self.animateValue(streakEl, 0, stats.streak || 0, 800);
      if (workoutsEl) self.animateValue(workoutsEl, 0, stats.yes, 1000);
      if (totalXpEl) self.animateValue(totalXpEl, 0, totalXp, 1200);
    }, 300);
  },

  startWorkout: function() {
    var todayIdx = (new Date().getDay() + 6) % 7;
    var days = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];
    var dayName = days[todayIdx];
    var todayStr = new Date().toISOString().slice(0, 10);
    var stats = this.getStats();
    var history = [];
    if (typeof FTStorage !== 'undefined') history = FTStorage.get('history') || [];
    var filtered = [];
    for (var i = 0; i < history.length; i++) {
      if (!(history[i].date === todayStr && history[i].dayName === dayName && history[i].skipped)) filtered.push(history[i]);
    }
    if (typeof FTStorage !== 'undefined') FTStorage.set('history', filtered);
    stats.yes++;
    stats.streak = (stats.streak || 0) + 1;
    if (typeof FTStorage !== 'undefined') FTStorage.set('stats', stats);
    if (typeof refreshHeaderAfterXP === 'function') refreshHeaderAfterXP();
    if (typeof WorkoutModule !== 'undefined' && WorkoutModule.openWorkoutModal) {
      WorkoutModule.openWorkoutModal();
    } else {
      alert('Модуль тренировки ещё не загружен');
    }
  },

  goToPlan: function() {
    if (typeof moduleManager !== 'undefined' && moduleManager.loadedModules && moduleManager.loadedModules.has('plan')) {
      Core.navigate('plan');
    } else {
      alert('Модуль "План" ещё не добавлен.');
    }
  },

  handleAnswer: function(answer) {
    var todayIdx = (new Date().getDay() + 6) % 7;
    var days = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];
    var dayName = days[todayIdx];
    var todayStr = new Date().toISOString().slice(0, 10);
    var stats = this.getStats();
    var history = [];
    if (typeof FTStorage !== 'undefined') history = FTStorage.get('history') || [];
    var plan = [];
    if (typeof FTStorage !== 'undefined') plan = FTStorage.get('plan') || [];
    if (answer === 'later') {
      stats.later++;
      if (typeof FTStorage !== 'undefined') FTStorage.set('stats', stats);
      alert('Хорошо, напомню позже!');
      this.createWelcomeScreen();
    } else if (answer === 'no') {
      stats.no++;
      stats.streak = 0;
      if (typeof FTStorage !== 'undefined') FTStorage.set('stats', stats);
      var dayRecord = null;
      for (var i = 0; i < history.length; i++) if (history[i].date === todayStr && history[i].dayName === dayName) { dayRecord = history[i]; break; }
      if (!dayRecord) {
        var muscleGroup = '';
        if (plan[todayIdx] && plan[todayIdx].muscleGroup) muscleGroup = plan[todayIdx].muscleGroup;
        dayRecord = { date: todayStr, dayName: dayName, muscleGroup: muscleGroup, exercises: [], details: [], duration: 0, skipped: true, timestamp: Date.now() };
        history.push(dayRecord);
      } else { dayRecord.skipped = true; }
      if (typeof FTStorage !== 'undefined') FTStorage.set('history', history);
      alert('Понял, день пропущен. Завтра новый шанс!');
      this.createWelcomeScreen();
    }
    if (typeof refreshHeaderAfterXP === 'function') refreshHeaderAfterXP();
  }
};

window.WelcomeModule = WelcomeModule;
module.exports = WelcomeModule;