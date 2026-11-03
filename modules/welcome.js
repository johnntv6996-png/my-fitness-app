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
    var level = stats.level || 1;
    
    if (streak === 0) return {text: 'Начни свой путь сегодня! 💪', color: 'var(--warn)'};
    if (streak < 3) return {text: 'Хорошее начало! Продолжай 🔥', color: 'var(--ok)'};
    if (streak < 7) return {text: 'Отличная серия! Ты на пути к цели 🎯', color: 'var(--ok)'};
    if (streak < 14) return {text: 'Неделя силы! Ты машина 🚀', color: 'var(--acc)'};
    if (streak < 30) return {text: 'Две недели! Дисциплина — это суперсила ⚡', color: 'var(--acc)'};
    if (streak < 60) return {text: 'Месяц подряд! Ты легенда 👑', color: 'var(--acc)'};
    return {text: 'Невероятно! Ты непобедим 🏆', color: 'var(--acc)'};
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
    if (typeof FTStorage !== 'undefined') {
      plan = FTStorage.get('plan') || [];
    }
    var todayPlan = plan[todayIdx] || null;
    var exCount = todayPlan ? todayPlan.exercises.length : 0;
    
    var history = [];
    if (typeof FTStorage !== 'undefined') {
      history = FTStorage.get('history') || [];
    }
    var todayStr = new Date().toISOString().slice(0, 10);
    var todayRecord = null;
    for (var i = 0; i < history.length; i++) {
      if (history[i].date === todayStr && history[i].dayName === dayName) {
        todayRecord = history[i];
        break;
      }
    }

    var motivation = this.getMotivationalMessage(stats);

    // Статус дня
    var statusHtml = '';
    if (todayRecord) {
      if (todayRecord.skipped) {
        statusHtml = '<div style="background:var(--bg);padding:12px;border-radius:8px;margin-top:15px;border-left:4px solid var(--err)"><strong style="color:var(--err)">❌ Сегодня вы отметили «Нет»</strong><div class="text-small" style="margin-top:5px">День пропущен. Можно передумать — нажмите «Да».</div></div>';
      } else if (todayRecord.exercises && todayRecord.exercises.length > 0) {
        statusHtml = '<div style="background:var(--bg);padding:12px;border-radius:8px;margin-top:15px;border-left:4px solid var(--ok)"><strong style="color:var(--ok)">✅ Тренировка проведена</strong><div class="text-small" style="margin-top:5px">Выполнено: ' + todayRecord.exercises.length + ' из ' + exCount + '</div></div>';
      }
    }

    // План на сегодня
    var planInfo = '';
    if (exCount > 0) {
      var muscleGroup = todayPlan.muscleGroup || 'тренировка';
      planInfo = '<p class="text-small" style="margin:0 0 20px 0">План: <strong>' + muscleGroup + '</strong> · ' + exCount + ' упр.</p>';
    } else {
      planInfo = '<p class="text-small" style="margin:0 0 20px 0;color:var(--warn)">⚠️ План пуст. Добавь упражнения!</p>';
    }

    // Кнопка "Да"
    var yesButton = '';
    if (exCount > 0) {
      yesButton = '<button class="btn btn-primary" style="width:100%;padding:15px;font-size:1.1em" onclick="WelcomeModule.handleAnswer(\'yes\')">✅ Да, тренируемся!</button>';
    } else {
      yesButton = '<button class="btn btn-primary" style="width:100%;padding:15px;font-size:1.1em" onclick="WelcomeModule.goToPlan()">📝 Составить план</button>';
    }

    // Собираем всё вместе
    screen.innerHTML = 
      '<div style="padding:20px;max-width:600px;margin:0 auto">' +
      
      // === БЛОК УРОВНЯ И XP ===
      '<div style="background:linear-gradient(135deg, var(--card) 0%, var(--card2) 100%);border-radius:12px;padding:20px;margin-bottom:15px;border:2px solid var(--acc);box-shadow:0 4px 12px rgba(255,215,0,0.2)">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
          '<div>' +
            '<div style="font-size:0.85em;opacity:0.7">⭐ Уровень</div>' +
            '<div style="font-size:2.5em;font-weight:bold;color:var(--acc);line-height:1">' + stats.level + '</div>' +
          '</div>' +
          '<div style="text-align:right">' +
            '<div style="font-size:0.85em;opacity:0.7">До следующего</div>' +
            '<div style="font-size:1.5em;font-weight:bold;color:var(--text)">' + stats.xp + '<span style="font-size:0.6em;opacity:0.6">/' + xpNeeded + ' XP</span></div>' +
          '</div>' +
        '</div>' +
        '<div style="height:12px;background:var(--bg);border-radius:6px;overflow:hidden;border:1px solid var(--brd)">' +
          '<div style="height:100%;width:' + xpPercent + '%;background:linear-gradient(90deg, var(--acc), var(--warn));border-radius:6px;transition:width 0.5s ease"></div>' +
        '</div>' +
        '<div style="text-align:center;margin-top:6px;font-size:0.85em;color:var(--acc);font-weight:bold">' + xpPercent + '% до уровня ' + (stats.level + 1) + '</div>' +
      '</div>' +

      // === БЛОК СТАТИСТИКИ ===
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:15px">' +
        // Стрик
        '<div style="background:var(--card);border-radius:10px;padding:15px;text-align:center;border:1px solid var(--brd)">' +
          '<div style="font-size:2em;margin-bottom:5px">🔥</div>' +
          '<div style="font-size:1.8em;font-weight:bold;color:var(--warn)">' + (stats.streak || 0) + '</div>' +
          '<div class="text-small">дней подряд</div>' +
        '</div>' +
        // Тренировки
        '<div style="background:var(--card);border-radius:10px;padding:15px;text-align:center;border:1px solid var(--brd)">' +
          '<div style="font-size:2em;margin-bottom:5px">🏋️</div>' +
          '<div style="font-size:1.8em;font-weight:bold;color:var(--ok)">' + stats.yes + '</div>' +
          '<div class="text-small">тренировок</div>' +
        '</div>' +
        // Всего XP
        '<div style="background:var(--card);border-radius:10px;padding:15px;text-align:center;border:1px solid var(--brd)">' +
          '<div style="font-size:2em;margin-bottom:5px">⚡</div>' +
          '<div style="font-size:1.8em;font-weight:bold;color:var(--acc)">' + (stats.xp + (stats.level - 1) * 100) + '</div>' +
          '<div class="text-small">всего XP</div>' +
        '</div>' +
      '</div>' +

      // === МОТИВАЦИОННОЕ СООБЩЕНИЕ ===
      '<div style="background:var(--bg);border-radius:10px;padding:15px;margin-bottom:15px;border-left:4px solid ' + motivation.color + ';text-align:center">' +
        '<div style="font-size:1.1em;font-weight:600;color:' + motivation.color + '">' + motivation.text + '</div>' +
      '</div>' +

      // === ОСНОВНОЙ БЛОК ===
      '<div style="background:var(--card);border-radius:12px;padding:25px 20px;text-align:center;margin-bottom:15px">' +
        '<div style="font-size:3.5em;margin-bottom:10px">💪</div>' +
        '<h1 style="color:var(--acc);margin:0 0 10px 0;font-size:1.8em">Привет!</h1>' +
        '<p style="font-size:1.1em;margin:0 0 5px 0">Сегодня <strong>' + dayName + '</strong>.</p>' +
        planInfo +
        '<p style="font-size:1.15em;margin:20px 0">Позанимаемся?</p>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:15px">' +
          yesButton +
          '<button class="btn btn-secondary" style="padding:15px;font-size:1.1em" onclick="WelcomeModule.handleAnswer(\'later\')">⏰ Позже</button>' +
          '<button class="btn btn-danger" style="padding:15px;font-size:1.1em" onclick="WelcomeModule.handleAnswer(\'no\')">❌ Нет</button>' +
        '</div>' +
      '</div>' +

      // === СТАТУС ДНЯ ===
      statusHtml +

      // === ПОДСКАЗКА ПО XP ===
      '<div style="background:var(--bg);border-radius:8px;padding:12px;margin-top:15px;font-size:0.85em;opacity:0.8">' +
        '<div style="font-weight:600;margin-bottom:6px;color:var(--acc)">💡 Как получать XP:</div>' +
        '<div>✅ Выполнение упражнения: <strong>+5 XP</strong></div>' +
        '<div>🏁 Завершение упражнения: <strong>+15 XP</strong></div>' +
        '<div>🎉 Завершение дня: <strong>+20 XP</strong></div>' +
        '<div>📊 Запись данных: <strong>+10 XP</strong></div>' +
      '</div>' +

      '</div>';
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
    if (typeof FTStorage !== 'undefined') {
      history = FTStorage.get('history') || [];
    }
    var plan = [];
    if (typeof FTStorage !== 'undefined') {
      plan = FTStorage.get('plan') || [];
    }

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
        if (plan[todayIdx] && plan[todayIdx].muscleGroup) {
          muscleGroup = plan[todayIdx].muscleGroup;
        }
        dayRecord = { 
          date: todayStr, 
          dayName: dayName, 
          muscleGroup: muscleGroup, 
          exercises: [], 
          details: [], 
          duration: 0, 
          skipped: true, 
          timestamp: Date.now() 
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