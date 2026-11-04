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
    if (typeof Core !== 'undefined') {
      Core.addNavButton('Главная', 'welcome', '<i class="ph ph-house"></i>');
    }
  },

  getUserName: function() {
    if (typeof FTStorage !== 'undefined') return FTStorage.get('user_name') || '';
    return '';
  },
  getUserAvatar: function() {
    if (typeof FTStorage !== 'undefined') return FTStorage.get('user_avatar') || 'ph-user-circle';
    return 'ph-user-circle';
  },
  getStats: function() {
    if (typeof FTStorage !== 'undefined') return FTStorage.get('stats') || {yes:0, later:0, no:0, xp:0, level:1, streak:0};
    return {yes:0, later:0, no:0, xp:0, level:1, streak:0};
  },

  getMotivationalMessage: function(stats) {
    var streak = stats.streak || 0;
    if (streak === 0) return {text: 'Начни свой путь сегодня!', color: '#FFB347', icon: 'ph-rocket'};
    if (streak < 3) return {text: 'Хорошее начало! Продолжай', color: '#90EE90', icon: 'ph-flame'};
    if (streak < 7) return {text: 'Отличная серия! Ты на пути', color: '#90EE90', icon: 'ph-target'};
    if (streak < 14) return {text: 'Неделя силы! Ты машина', color: '#FFD700', icon: 'ph-rocket'};
    if (streak < 30) return {text: 'Дисциплина — суперсила', color: '#FFD700', icon: 'ph-lightning'};
    if (streak < 60) return {text: 'Месяц! Ты легенда', color: '#FFD700', icon: 'ph-crown'};
    return {text: 'Ты непобедим', color: '#FFD700', icon: 'ph-trophy'};
  },

  getLevelEmoji: function(level) {
    if (level < 5) return 'ph-star';
    if (level < 10) return 'ph-star-four';
    if (level < 20) return 'ph-trophy';
    if (level < 50) return 'ph-crown';
    return 'ph-diamond';
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
    var greeting = userName ? 'Привет, ' + userName + '!' : 'Привет!';
    var stats = this.getStats();
    var xpNeeded = stats.level * 100;
    var xpPercent = Math.min(100, Math.round((stats.xp / xpNeeded) * 100));
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
    var levelIcon = this.getLevelEmoji(stats.level);
    var totalXp = stats.xp + (stats.level - 1) * 100;

    var css = '<style>' +
      '@keyframes fadeInUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }' +
      '@keyframes fillBar { from { width:0%; } }' +
      '@keyframes pulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.15); } }' +
      '@keyframes glow { 0%,100% { box-shadow:0 0 10px rgba(212,175,55,0.3); } 50% { box-shadow:0 0 25px rgba(212,175,55,0.6); } }' +
      '.w-fade { animation:fadeInUp 0.5s ease-out both; }' +
      '.w-delay-1 { animation-delay:0.1s; } .w-delay-2 { animation-delay:0.2s; }' +
      '.w-delay-3 { animation-delay:0.3s; } .w-delay-4 { animation-delay:0.4s; }' +
      '.w-pulse { animation:pulse 2s ease-in-out infinite; display:inline-block; }' +
      '.w-glow { animation:glow 2s ease-in-out infinite; }' +
      '.w-xp-bar { animation:fillBar 1.2s ease-out both; }' +
      '.w-card { transition:transform 0.2s, box-shadow 0.2s; }' +
      '.w-card:hover { transform:translateY(-3px); box-shadow:0 8px 20px rgba(0,0,0,0.3); }' +
      '.w-btn { transition:all 0.2s; cursor:pointer; }' +
      '.w-btn:hover { transform:translateY(-2px); filter:brightness(1.1); }' +
      '.w-btn:active { transform:scale(0.97); }' +
      '.w-icon { font-size:1.3em; color:var(--accent-gold); }' +
    '</style>';

    var statusHtml = '';
    if (todayRecord) {
      if (todayRecord.skipped) {
        statusHtml = '<div class="w-fade w-delay-4" style="background:rgba(255,51,102,0.1);padding:12px 16px;border-radius:12px;margin-top:12px;border-left:3px solid #ff3366;font-size:0.9em;display:flex;align-items:center;gap:10px"><i class="ph ph-x-circle" style="font-size:1.3em;color:#ff3366"></i><div><strong style="color:#ff3366">День пропущен</strong><div style="font-size:0.85em;opacity:0.7;margin-top:2px">Можно передумать</div></div></div>';
      } else if (todayRecord.exercises && todayRecord.exercises.length > 0) {
        statusHtml = '<div class="w-fade w-delay-4" style="background:rgba(0,255,136,0.1);padding:12px 16px;border-radius:12px;margin-top:12px;border-left:3px solid #00ff88;font-size:0.9em;display:flex;align-items:center;gap:10px"><i class="ph ph-check-circle" style="font-size:1.3em;color:#00ff88"></i><div><strong style="color:#00ff88">Тренировка проведена</strong><div style="font-size:0.85em;opacity:0.7;margin-top:2px">' + todayRecord.exercises.length + '/' + exCount + ' упражнений</div></div></div>';
      }
    }

    var yesButton = '';
    if (exCount > 0) {
      yesButton = '<button class="btn w-btn" style="flex:1;padding:14px;font-size:0.95em;font-weight:600;background:linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);color:#000;border:none" id="btnStartWorkout"><i class="ph ph-play-circle"></i> Начать</button>';
    } else {
      yesButton = '<button class="btn w-btn" style="flex:1;padding:14px;font-size:0.95em;font-weight:600;background:linear-gradient(135deg, var(--accent-gold) 0%, var(--accent-gold-light) 100%);color:#000;border:none" onclick="WelcomeModule.goToPlan()"><i class="ph ph-calendar-plus"></i> Составить план</button>';
    }

    screen.innerHTML = css +
      '<div style="padding:16px;max-width:500px;margin:0 auto">' +
      
      '<div class="w-fade w-glow" style="background:linear-gradient(135deg, #1a1a2e 0%, #151520 100%);border-radius:16px;padding:16px 20px;margin-bottom:16px;border:1px solid var(--border-gold)">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
          '<div style="display:flex;align-items:center;gap:10px">' +
            '<i class="ph ' + levelIcon + ' w-icon w-pulse" style="font-size:1.8em"></i>' +
            '<div style="font-size:1.8em;font-weight:bold;color:var(--accent-gold);line-height:1" class="w-anim-level">' + stats.level + '</div>' +
            '<div style="font-size:0.75em;opacity:0.7">уровень</div>' +
          '</div>' +
          '<div style="text-align:right"><div style="font-size:0.75em;opacity:0.7">XP</div><div style="font-size:1em;font-weight:bold"><span class="w-anim-xp">0</span><span style="font-size:0.7em;opacity:0.6">/' + xpNeeded + '</span></div></div>' +
        '</div>' +
        '<div style="height:6px;background:var(--bg-primary);border-radius:3px;overflow:hidden;border:1px solid var(--border-subtle)"><div class="w-xp-bar" style="height:100%;width:' + xpPercent + '%;background:linear-gradient(90deg, var(--accent-gold), var(--accent-gold-light));border-radius:3px"></div></div>' +
      '</div>' +

      '<div class="w-fade w-delay-1" style="background:var(--bg-card);border-radius:16px;padding:16px 20px;border:1px solid var(--border-subtle);margin-bottom:16px">' +
        '<div style="display:flex;align-items:center;gap:12px">' +
          '<i class="ph ' + userAvatar + '" style="font-size:2.2em;color:var(--accent-gold)"></i>' +
          '<div style="flex:1"><div style="font-size:1.15em;font-weight:600;color:var(--accent-gold);line-height:1.2">' + greeting + '</div><div style="font-size:0.85em;opacity:0.7;margin-top:2px">Сегодня <strong>' + dayName + '</strong></div></div>' +
          '<div style="font-size:0.8em;color:var(--accent-gold);text-align:right"><i class="ph ph-list-checks"></i> ' + (exCount > 0 ? exCount + ' упр.' : 'нет плана') + '</div>' +
        '</div>' +
      '</div>' +

      '<div class="w-fade w-delay-2" style="display:flex;gap:8px;margin-bottom:16px">' +
        yesButton +
        '<button class="btn w-btn" style="flex:1;padding:14px;font-size:0.95em;font-weight:600;background:linear-gradient(135deg, #FFB347 0%, #FFC870 100%);color:#000;border:none" onclick="WelcomeModule.handleAnswer(\'later\')"><i class="ph ph-clock"></i> Позже</button>' +
        '<button class="btn w-btn" style="flex:1;padding:14px;font-size:0.95em;font-weight:600;background:linear-gradient(135deg, #ff3366 0%, #ff5577 100%);color:#fff;border:none" onclick="WelcomeModule.handleAnswer(\'no\')"><i class="ph ph-x"></i> Пропустить</button>' +
      '</div>' +

      statusHtml +

      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:16px 0">' +
        '<div class="w-card w-fade w-delay-2" style="background:var(--bg-card);border-radius:12px;padding:12px 8px;text-align:center;border:1px solid var(--border-subtle)"><i class="ph ph-flame w-pulse" style="font-size:1.5em;color:#FFB347"></i><div style="font-size:1.3em;font-weight:bold;color:#FFB347;line-height:1.2;margin-top:4px"><span class="w-anim-streak">0</span></div><div style="font-size:0.7em;opacity:0.7">стрик</div></div>' +
        '<div class="w-card w-fade w-delay-3" style="background:var(--bg-card);border-radius:12px;padding:12px 8px;text-align:center;border:1px solid var(--border-subtle)"><i class="ph ph-barbell" style="font-size:1.5em;color:#00ff88"></i><div style="font-size:1.3em;font-weight:bold;color:#00ff88;line-height:1.2;margin-top:4px"><span class="w-anim-workouts">0</span></div><div style="font-size:0.7em;opacity:0.7">тренировок</div></div>' +
        '<div class="w-card w-fade w-delay-4" style="background:var(--bg-card);border-radius:12px;padding:12px 8px;text-align:center;border:1px solid var(--border-subtle)"><i class="ph ph-lightning" style="font-size:1.5em;color:var(--accent-gold)"></i><div style="font-size:1.3em;font-weight:bold;color:var(--accent-gold);line-height:1.2;margin-top:4px"><span class="w-anim-totalxp">0</span></div><div style="font-size:0.7em;opacity:0.7">всего XP</div></div>' +
      '</div>' +

      '<div class="w-fade w-delay-4" style="background:var(--bg-card);border-radius:12px;padding:12px 16px;margin-bottom:16px;border-left:3px solid ' + motivation.color + ';font-size:0.9em;display:flex;align-items:center;gap:10px">' +
        '<i class="ph ' + motivation.icon + '" style="font-size:1.3em;color:' + motivation.color + '"></i>' +
        '<div style="color:' + motivation.color + ';font-weight:600">' + motivation.text + '</div>' +
      '</div>' +

      '<details class="w-fade w-delay-4" style="background:var(--bg-card);border-radius:12px;padding:12px 16px;font-size:0.8em;opacity:0.85;cursor:pointer;border:1px solid var(--border-subtle)">' +
        '<summary style="font-weight:600;color:var(--accent-gold);margin-bottom:8px;display:flex;align-items:center;gap:8px"><i class="ph ph-info"></i> Как получать XP</summary>' +
        '<div style="margin-top:8px;line-height:1.6">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><i class="ph ph-check" style="color:#00ff88"></i> Упражнение: <strong>+5 XP</strong></div>' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><i class="ph ph-flag-checkered" style="color:#00ff88"></i> Завершение: <strong>+15 XP</strong></div>' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><i class="ph ph-trophy" style="color:#00ff88"></i> День: <strong>+20 XP</strong></div>' +
          '<div style="display:flex;align-items:center;gap:8px"><i class="ph ph-chart-bar" style="color:#00ff88"></i> Данные: <strong>+10 XP</strong></div>' +
        '</div>' +
      '</details>' +

      '</div>';

    var self = this;
    setTimeout(function() {
      var btnStart = document.getElementById('btnStartWorkout');
      if (btnStart) btnStart.onclick = function() { self.startWorkout(); };
      var levelEl = document.querySelector('.w-anim-level');
      var xpEl = document.querySelector('.w-anim-xp');
      var streakEl = document.querySelector('.w-anim-streak');
      var workoutsEl = document.querySelector('.w-anim-workouts');
      var totalXpEl = document.querySelector('.w-anim-totalxp');
      if (levelEl) self.animateValue(levelEl, 0, stats.level, 800);
      if (xpEl) self.animateValue(xpEl, 0, stats.xp, 1000);
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
  }
};

window.WelcomeModule = WelcomeModule;
module.exports = WelcomeModule;