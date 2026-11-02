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
    } else {
      // Фоллбэк, если core еще не инициализировал глобальные переменные
      const nav = document.getElementById('userNav');
      if (nav) {
        const btn = document.createElement('button');
        btn.className = 'nav-btn active';
        btn.setAttribute('data-screen', 'welcome');
        btn.textContent = '🏠 Главная';
        btn.onclick = () => {
          document.querySelectorAll('#userInterface .screen').forEach(s => s.classList.remove('active'));
          document.getElementById('screen-welcome').classList.add('active');
          nav.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        };
        nav.appendChild(btn);
      }
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

    const now = new Date();
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    
    const dateStr = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    screen.innerHTML = `
      <div style="text-align:center;padding:40px 20px">
        <div style="font-size:5em;margin-bottom:20px">💪</div>
        <h1 style="color:var(--acc);margin-bottom:15px">Добро пожаловать!</h1>
        <p style="font-size:1.2em;margin-bottom:10px">Сегодня: <strong>${dateStr}</strong></p>
        <p style="font-size:1.1em;opacity:0.8;margin-bottom:30px">Время: <strong>${timeStr}</strong></p>
        
        <div style="padding:20px;background:var(--card);border-radius:10px;max-width:500px;margin:0 auto">
          <h3 style="color:var(--acc);margin-bottom:15px">📊 Быстрая статистика</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:15px">
            <div><div style="font-size:2em;color:var(--acc);font-weight:bold">0</div><div style="font-size:0.9em;opacity:0.7">Тренировок</div></div>
            <div><div style="font-size:2em;color:var(--ok);font-weight:bold">0</div><div style="font-size:0.9em;opacity:0.7">Дней подряд</div></div>
            <div><div style="font-size:2em;color:var(--warn);font-weight:bold">0</div><div style="font-size:0.9em;opacity:0.7">Уровень</div></div>
          </div>
        </div>
      </div>
    `;
  }
};

module.exports = WelcomeModule;