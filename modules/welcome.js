// modules/welcome.js

const WelcomeModule = {
  init() {
    console.log('🎉 Welcome module initialized');
    if (typeof Logger !== 'undefined') Logger.log('Модуль приветствия инициализирован', 'info');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  },

  setup() {
    this.createWelcomeScreen();
    
    if (typeof Core !== 'undefined') {
      Core.addNavButton('Главная', 'welcome', '🏠');
    }
  },

  createWelcomeScreen() {
    let screen = document.getElementById('screen-welcome');
    if (!screen) {
      screen = document.createElement('div');
      screen.id = 'screen-welcome';
      screen.className = 'screen active';
      document.getElementById('userInterface').appendChild(screen);
    }

    const todayIdx = (new Date().getDay() + 6) % 7;
    const dayName = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'][todayIdx];
    const plan = (typeof FTStorage !== 'undefined' ? FTStorage.get('plan') : null) || [];
    const todayPlan = plan[todayIdx];
    const exCount = todayPlan ? todayPlan.exercises.length : 0;
    const history = (typeof FTStorage !== 'undefined' ? FTStorage.get('history') : null) || [];
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayRecord = history.find(h => h.date === todayStr && h.dayName === dayName);

    let statusHtml = '';
    if (todayRecord) {
      if (todayRecord.skipped) {
        statusHtml = `<div style="background:var(--bg);padding:12px;border-radius:8px;margin-top:15px;border-left:4px solid var(--err)">
          <strong style="color:var(--err)">❌ Сегодня вы отметили «Нет»</strong>
          <div class="text-small" style="margin-top:5px">День пропущен. Можно передумать — нажмите «Да».</div>
        </div>`;
      } else if (todayRecord.exercises.length > 0) {
        statusHtml = `<div style="background:var(--bg);padding:12px;border-radius:8px;margin-top:15px;border-left:4px solid var(--ok)">
          <strong style="color:var(--ok)">✅ Тренировка проведена</strong>
          <div class="text-small" style="margin-top:5px">Выполнено: ${todayRecord.exercises.length} из ${exCount}</div>
        </div>`;
      }
    }

    const yesButton = exCount > 0 
      ? `<button class="btn btn-primary" style="width:100%;padding:15px;font-size:1.1em" onclick="WelcomeModule.handleAnswer('yes')">✅ Да, тренируемся!</button>`
      : `<button class="btn btn-primary" style="width:100%;padding:15px;font-size:1.1em" onclick="alert('Сначала добавь упражнения в план!')">📝 Сначала составь план</button>`;

    screen.innerHTML = `
      <div style="text-align:center;padding:30px 20px">
        <div style="font-size:4em;margin-bottom:15px">💪</div>
        <h1 style="color:var(--acc);margin-bottom:10px">Привет!</h1>
        <p style="font-size:1.1em;margin-bottom:5px">Сегодня <strong>${dayName}</strong>.</p>
        ${exCount > 0 
          ? `<p class="text-small" style="margin-bottom:20px">План: <strong>${todayPlan.muscleGroup || 'тренировка'}</strong> · ${exCount} упр.</p>` 
          : `<p class="text-small" style="margin-bottom:20px;color:var(--warn)">План пуст. Добавь упражнения!</p>`
        }
        <p style="font-size:1.2em;margin-bottom:25px">Позанимаемся?</p>
        
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;max-width:500px;margin:0 auto 20px">
          ${yesButton}
          <button class="btn btn-secondary" style="padding:15px;font-size:1.1em" onclick="WelcomeModule.handleAnswer('later')">⏰ Позже</button>
          <button class="btn btn-danger" style="padding:15px;font-size:1.1em" onclick="WelcomeModule.handleAnswer('no')">❌ Нет</button>
        </div>
        
        ${statusHtml}
      </div>
    `;
  },

  handleAnswer(answer) {
    const todayIdx = (new Date().getDay() + 6) % 7;
    const dayName = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'][todayIdx];
    const todayStr = new Date().toISOString().slice(0, 10);
    
    const stats = (typeof FTStorage !== 'undefined' ? FTStorage.get('stats') : null) || {yes:0,later:0,no:0,xp:0,level:1,streak:0};
    const history = (typeof FTStorage !== 'undefined' ? FTStorage.get('history') : null) || [];
    const plan = (typeof FTStorage !== 'undefined' ? FTStorage.get('plan') : null) || [];

    if (answer === 'yes') {
      const filtered = history.filter(h => !(h.date === todayStr && h.dayName === dayName && h.skipped));
      if (typeof FTStorage !== 'undefined') FTStorage.set('history', filtered);
      stats.yes++;
      stats.streak = (stats.streak || 0) + 1;
      if (typeof FTStorage !== 'undefined') FTStorage.set('stats', stats);
      alert(`🎉 Отлично! Стрик: ${stats.streak} дней`);
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
      
      let dayRecord = history.find(h => h.date === todayStr && h.dayName === dayName);
      if (!dayRecord) {
        dayRecord = { 
          date: todayStr, 
          dayName: dayName, 
          muscleGroup: plan[todayIdx]?.muscleGroup || '', 
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