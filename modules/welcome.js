// modules/welcome.js

const WelcomeModule = {
  init: function() {
    console.log('🎉 Welcome module initialized');
    if (typeof Logger !== 'undefined') Logger.log('Модуль приветствия инициализирован', 'info');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { WelcomeModule.setup(); });
    } else {
      this.setup();
    }
  },

  setup: function() {
    this.createWelcomeScreen();
    
    if (typeof Core !== 'undefined') {
      Core.addNavButton('Главная', 'welcome', '🏠');
    }
  },

  getStats: function() {
    if (typeof FTStorage !== 'undefined') {
      return FTStorage.get('stats') || {yes:0, later:0, no:0, xp:0, level:1, streak:0};
    }
    return {yes:0, later:0, no:0, xp:0, level:1, streak:0};
  },

  getMotivationalMessage: function(stats) {
    var streak = stats.streak || 0;
    if (streak === 0) return {text: 'Начни свой путь сегодня! 💪', color: '#FFB347'};
    if (streak < 3) return {text: 'Хорошее начало! Продолжай 🔥', color: '#90EE90'};
    if (streak < 7) return {text: 'Отличная серия! Ты на пути 🎯', color: '#90EE90'};
    if (streak < 14) return {text: 'Неделя силы! Ты машина 🚀', color: '#FFD700'};
    if (streak < 30) return {text: 'Дисциплина — суперсила ⚡', color: '#FFD700'};
    if (streak < 60) return {text: 'Месяц! Ты легенда 👑', color: '#FFD700'};
    return {text: 'Ты непобедим 🏆', color: '#FFD700'};
  },

  getLevelEmoji: function(level) {
    if (level < 5) return '⭐';
    if (level < 10) return '🌟';
    if (level < 20) return '🏆';
    if (level < 50) return '👑';
    return '💎';
  },

  animateValue: function(element, start, end, duration) {
    var startTime = null;
    var range = end - start;
    var step = function(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = Math.floor(start + range * eased);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
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
      if (history[i].date === todayStr && history[i].dayName === dayName) {
        todayRecord = history[i];
        break;
      }
    }

    var motivation = this.getMotivationalMessage(stats);
    var levelEmoji = this.getLevelEmoji(stats.level);
    var totalXp = stats.xp + (stats.level - 1) * 100;

    // CSS анимации
    var css = '<style>' +
      '@keyframes fadeInUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }' +
      '@keyframes fillBar { from { width:0%; } }' +
      '@keyframes pulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.15); } }' +
      '@keyframes glow { 0%,100% { box-shadow:0 0 10px rgba(255,215,0,0.3); } 50% { box-shadow:0 0 25px rgba(255,215,0,0.6); } }' +
      '.w-fade { animation:fadeInUp 0.5s ease-out both; }' +
      '.w-delay-1 { animation-delay:0.1s; }' +
      '.w-delay-2 { animation-delay:0.2s; }' +
      '.w-delay-3 { animation-delay:0.3s; }' +
      '.w-delay-4 { animation-delay:0.4s; }' +
      '.w-delay-5 { animation-delay:0.5s; }' +
      '.w-pulse { animation:pulse 2s ease-in-out infinite; display:inline-block; }' +
      '.w-glow { animation:glow 2s ease-in-out infinite; }' +
      '.w-xp-bar { animation:fillBar 1.2s ease-out both; }' +
      '.w-card { transition:transform 0.2s, box-shadow 0.2s; }' +
      '.w-card:hover { transform:translateY(-3px); box-shadow:0 8px 20px rgba(0,0,0,0.3); }' +
      '.w-btn { transition:all 0.2s; cursor:pointer; }' +
      '.w-btn:hover { transform:translateY(-2px); filter:brightness(1.1); }' +
      '.w-btn:active { transform:scale(0.97); }' +
    '</style>';

    // Статус дня
    var statusHtml = '';
    if (todayRecord) {
      if (todayRecord.skipped) {
        statusHtml = '<div class="w-fade w-delay-5" style="background:rgba(231,76,60,0.1);padding:10px 14px;border-radius:8px;margin-top:12px;border-left:3px solid #e74c3c;font-size:0.9em"><strong style="color:#e74c3c">❌ День пропущен</strong><span class="text-small" style="margin-left:8px">Можно передумать</span></div>';
      } else if (todayRecord.exercises && todayRecord.exercises.length > 0) {
        statusHtml = '<div class="w-fade w-delay-5" style="background:rgba(144,238,144,0.1);padding:10px 14px;border-radius:8px;margin-top:12px;border-left:3px solid #90EE90;font-size:0.9em"><strong style="color:#90EE90">✅ Тренировка проведена</strong><span class="text-small" style="margin-left:8px">' + todayRecord.exercises.length + '/' + exCount + '</span></div>';
      }
    }

    // План
    var planInfo = '';
    if (exCount > 0) {
      var muscleGroup = todayPlan.muscleGroup || 'тренировка';
      planInfo = '<div class="text-small" style="margin-bottom:12px;opacity:0.8">📋 <strong>' + muscleGroup + '</strong> · ' + exCount + ' упр.</div>';
    } else {
      planInfo = '<div class="text-small" style="margin-bottom:12px;color:#FFB347">⚠️ План пуст</div>';
    }

    // Кнопка "Да"
    var yesButton = '';
    if (exCount > 0) {
      yesButton = '<button class="btn w-btn" style="width:100%;padding:12px;font-size:1em;font-weight:700;background:linear-gradient(135deg, #90EE90 0%, #7FDD7F 100%);color:#1a3a1a;border:1px solid #90EE90" onclick="WelcomeModule.handleAnswer(\'yes\')">✅ Тренируемся!</button>';
    } else {
      yesButton = '<button class="btn w-btn" style="width:100%;padding:12px;font-size:1em;font-weight:700;background:linear-gradient(135deg, #FFD700 0%, #FFF8DC 100%);color:#3a2a0a;border:1px solid #FFD700" onclick="WelcomeModule.goToPlan()">📝 Составить план</button>';
    }

    // ПОРЯДОК: Приветствие → XP-бар → Кнопки → Статус → Карточки → Мотивация → Подсказка
    screen.innerHTML = css +
      '<div style="padding:15px;max-width:500px;margin:0 auto">' +
      
      // === 1. ПРИВЕТСТВИЕ (сверху) ===
      '<div class="w-fade" style="background:var(--card);border-radius:10px 10px 0 0;padding:20px 15px 10px;text-align:center;border:1px solid var(--brd);border-bottom:none">' +
        '<div style="font-size:2.5em;margin-bottom:5px">💪</div>' +
        '<h1 style="color:var(--acc);margin:0 0 6px 0;font-size:1.4em">Привет!</h1>' +
        '<div class="text-small" style="margin-bottom:8px">Сегодня <strong>' + dayName + '</strong></div>' +
        planInfo +
      '</div>' +

      // === 2. XP-БАР (над кнопками) ===
      '<div class="w-fade w-delay-1 w-glow" style="background:linear-gradient(135deg, #3D3D3D 0%, #2a2a2a 100%);padding:12px 15px;border-left:1px solid var(--acc);border-right:1px solid var(--acc)">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
          '<div style="display:flex;align-items:center;gap:8px">' +
            '<div style="font-size:2em;line-height:1" class="w-pulse">' + levelEmoji + '</div>' +
            '<div style="font-size:1.8em;font-weight:bold;color:var(--acc);line-height:1" class="w-anim-level">' + stats.level + '</div>' +
            '<div style="font-size:0.75em;opacity:0.7">уровень</div>' +
          '</div>' +
          '<div style="text-align:right">' +
            '<div style="font-size:0.75em;opacity:0.7">XP</div>' +
            '<div style="font-size:1em;font-weight:bold;color:var(--text)"><span class="w-anim-xp">0</span><span style="font-size:0.7em;opacity:0.6">/' + xpNeeded + '</span></div>' +
          '</div>' +
        '</div>' +
        '<div style="height:8px;background:var(--bg);border-radius:4px;overflow:hidden;border:1px solid var(--brd)">' +
          '<div class="w-xp-bar" style="height:100%;width:' + xpPercent + '%;background:linear-gradient(90deg, var(--acc), var(--warn));border-radius:4px"></div>' +
        '</div>' +
      '</div>' +

      // === 3. КНОПКИ ===
      '<div class="w-fade w-delay-2" style="background:var(--card);border-radius:0 0 10px 10px;padding:10px 15px 18px;text-align:center;border:1px solid var(--brd);border-top:none;margin-bottom:10px">' +
        '<div style="font-size:1.05em;margin:8px 0 10px;font-weight:600">Позанимаемся?</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">' +
          yesButton +
          '<button class="btn w-btn" style="padding:12px;font-size:0.95em;font-weight:700;background:linear-gradient(135deg, #FFB347 0%, #FFC870 100%);color:#3a2a0a;border:1px solid #FFB347" onclick="WelcomeModule.handleAnswer(\'later\')">⏰ Позже</button>' +
          '<button class="btn w-btn" style="padding:12px;font-size:0.95em;font-weight:700;background:linear-gradient(135deg, #e74c3c 0%, #FF7070 100%);color:#fff;border:1px solid #e74c3c" onclick="WelcomeModule.handleAnswer(\'no\')">❌ Нет</button>' +
        '</div>' +
      '</div>' +

      // === 4. СТАТУС ДНЯ ===
      statusHtml +

      // === 5. ТРИ МИНИ-КАРТОЧКИ ===
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:10px 0">' +
        '<div class="w-card w-fade w-delay-2" style="background:var(--card);border-radius:8px;padding:10px 8px;text-align:center;border:1px solid var(--brd);cursor:default">' +
          '<div class="w-pulse" style="font-size:1.5em">🔥</div>' +
          '<div style="font-size:1.4em;font-weight:bold;color:#FFB347;line-height:1.2"><span class="w-anim-streak">0</span></div>' +
          '<div style="font-size:0.7em;opacity:0.7">стрик</div>' +
        '</div>' +
        '<div class="w-card w-fade w-delay-3" style="background:var(--card);border-radius:8px;padding:10px 8px;text-align:center;border:1px solid var(--brd);cursor:default">' +
          '<div style="font-size:1.5em">🏋️</div>' +
          '<div style="font-size:1.4em;font-weight:bold;color:#90EE90;line-height:1.2"><span class="w-anim-workouts">0</span></div>' +
          '<div style="font-size:0.7em;opacity:0.7">тренировок</div>' +
        '</div>' +
        '<div class="w-card w-fade w-delay-4" style="background:var(--card);border-radius:8px;padding:10px 8px;text-align:center;border:1px solid var(--brd);cursor:default">' +
          '<div style="font-size:1.5em">⚡</div>' +
          '<div style="font-size:1.4em;font-weight:bold;color:var(--acc);line-height:1.2"><span class="w-anim-totalxp">0</span></div>' +
          '<div style="font-size:0.7em;opacity:0.7">всего XP</div>' +
        '</div>' +
      '</div>' +

      // === 6. МОТИВАЦИЯ ===
      '<div class="w-fade w-delay-4" style="background:var(--bg);border-radius:8px;padding:8px 12px;margin-bottom:10px;border-left:3px solid ' + motivation.color + ';font-size:0.9em;text-align:center;color:' + motivation.color + ';font-weight:600">' +
        motivation.text +
      '</div>' +

      // === 7. ПОДСКАЗКА XP (свёрнутая) ===
      '<details class="w-fade w-delay-5" style="background:var(--bg);border-radius:8px;padding:10px 12px;font-size:0.8em;opacity:0.85;cursor:pointer">' +
        '<summary style="font-weight:600;color:var(--acc);margin-bottom:6px">💡 Как получать XP</summary>' +
        '<div style="margin-top:6px;line-height:1.6">' +
          '<div>✅ Выполнение упражнения: <strong>+5 XP</strong></div>' +
          '<div>🏁 Завершение упражнения: <strong>+15 XP</strong></div>' +
          '<div>🎉 Завершение дня: <strong>+20 XP</strong></div>' +
          '<div>📊 Запись данных: <strong>+10 XP</strong></div>' +
        '</div>' +
      '</details>' +

      '</div>';

    // Запуск анимации счётчиков
    var self = this;
    setTimeout(function() {
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

  goToPlan: function() {
    if (typeof moduleManager !== 'undefined' && moduleManager.loadedModules && moduleManager.loadedModules.has('plan')) {
      Core.navigate('plan');
    } else {
      alert('📝 Модуль "План" ещё не добавлен.\n\nСледующим шагом мы его создадим!');
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

    if (answer === 'yes') {
      var filtered = [];
      for (var i = 0; i < history.length; i++) {
        if (!(history[i].date === todayStr && history[i].dayName === dayName && history[i].skipped)) {
          filtered.push(history[i]);
        }
      }
      if (typeof FTStorage !== 'undefined') FTStorage.set('history', filtered);
      stats.yes++;
      stats.streak = (stats.streak || 0) + 1;
      if (typeof FTStorage !== 'undefined') FTStorage.set('stats', stats);
      alert('🎉 Отлично! Стрик: ' + stats.streak + ' дней 🔥');
      this.createWelcomeScreen();
    } else if (answer === 'later') {
      stats.later++;
      if (typeof FTStorage !== 'undefined') FTStorage.set('stats', stats);
      alert('⏰ Хорошо, напомню позже!');
      this.createWelcomeScreen();
    } else if (answer === 'no') {
      stats.no++;
      stats.streak = 0;
      if (typeof FTStorage !== 'undefined') FTStorage.set('stats', stats);
      
      var dayRecord = null;
      for (var i = 0; i < history.length; i++) {
        if (history[i].date === todayStr && history[i].dayName === dayName) {
          dayRecord = history[i];
          break;
        }
      }
      
      if (!dayRecord) {
        var muscleGroup = '';
        if (plan[todayIdx] && plan[todayIdx].muscleGroup) muscleGroup = plan[todayIdx].muscleGroup;
        dayRecord = { 
          date: todayStr, dayName: dayName, muscleGroup: muscleGroup, 
          exercises: [], details: [], duration: 0, skipped: true, timestamp: Date.now() 
        };
        history.push(dayRecord);
      } else {
        dayRecord.skipped = true;
      }
      if (typeof FTStorage !== 'undefined') FTStorage.set('history', history);
      alert('❌ Понял, день пропущен. Завтра новый шанс! 💪');
      this.createWelcomeScreen();
    }
  }
};

window.WelcomeModule = WelcomeModule;
module.exports = WelcomeModule;