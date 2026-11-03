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

  createWelcomeScreen: function() {
    var screen = document.getElementById('screen-welcome');
    if (!screen) {
      screen = document.createElement('div');
      screen.id = 'screen-welcome';
      screen.className = 'screen active';
      document.getElementById('userInterface').appendChild(screen);
    }

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

    var statusHtml = '';
    if (todayRecord) {
      if (todayRecord.skipped) {
        statusHtml = '<div style="background:var(--bg);padding:12px;border-radius:8px;margin-top:15px;border-left:4px solid var(--err)"><strong style="color:var(--err)">❌ Сегодня вы отметили «Нет»</strong><div class="text-small" style="margin-top:5px">День пропущен. Можно передумать — нажмите «Да».</div></div>';
      } else if (todayRecord.exercises && todayRecord.exercises.length > 0) {
        statusHtml = '<div style="background:var(--bg);padding:12px;border-radius:8px;margin-top:15px;border-left:4px solid var(--ok)"><strong style="color:var(--ok)">✅ Тренировка проведена</strong><div class="text-small" style="margin-top:5px">Выполнено: ' + todayRecord.exercises.length + ' из ' + exCount + '</div></div>';
      }
    }

    var planInfo = '';
    if (exCount > 0) {
      var muscleGroup = todayPlan.muscleGroup || 'тренировка';
      planInfo = '<p class="text-small" style="margin-bottom:20px">План: <strong>' + muscleGroup + '</strong> · ' + exCount + ' упр.</p>';
    } else {
      planInfo = '<p class="text-small" style="margin-bottom:20px;color:var(--warn)">План пуст. Добавь упражнения!</p>';
    }

    var yesButton = '';
    if (exCount > 0) {
      yesButton = '<button class="btn btn-primary" style="width:100%;padding:15px;font-size:1.1em" onclick="WelcomeModule.handleAnswer(\'yes\')">✅ Да, тренируемся!</button>';
    } else {
      yesButton = '<button class="btn btn-primary" style="width:100%;padding:15px;font-size:1.1em" onclick="WelcomeModule.goToPlan()">📝 Составить план</button>';
    }

    screen.innerHTML = '<div style="text-align:center;padding:30px 20px">' +
      '<div style="font-size:4em;margin-bottom:15px">💪</div>' +
      '<h1 style="color:var(--acc);margin-bottom:10px">Привет!</h1>' +
      '<p style="font-size:1.1em;margin-bottom:5px">Сегодня <strong>' + dayName + '</strong>.</p>' +
      planInfo +
      '<p style="font-size:1.2em;margin-bottom:25px">Позанимаемся?</p>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;max-width:500px;margin:0 auto 20px">' +
      yesButton +
      '<button class="btn btn-secondary" style="padding:15px;font-size:1.1em" onclick="WelcomeModule.handleAnswer(\'later\')">⏰ Позже</button>' +
      '<button class="btn btn-danger" style="padding:15px;font-size:1.1em" onclick="WelcomeModule.handleAnswer(\'no\')">❌ Нет</button>' +
      '</div>' +
      statusHtml +
      '</div>';
  },

  goToPlan: function() {
    if (typeof Core !== 'undefined') {
      Core.navigate('plan');
    } else {
      alert('Модуль плана ещё не загружен!');
    }
  },

  handleAnswer: function(answer) {
    var todayIdx = (new Date().getDay() + 6) % 7;
    var days = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];
    var dayName = days[todayIdx];
    var todayStr = new Date().toISOString().slice(0, 10);
    
    var stats = {yes:0, later:0, no:0, xp:0, level:1, streak:0};
    if (typeof FTStorage !== 'undefined') {
      stats = FTStorage.get('stats') || stats;
    }
    
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
      alert('🎉 Отлично! Стрик: ' + stats.streak + ' дней');
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

module.exports = WelcomeModule;