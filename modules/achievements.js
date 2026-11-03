// modules/achievements.js

const AchievementsModule = {
  init() {
    console.log('🏆 Achievements module initialized');
    if (typeof Logger !== 'undefined') Logger.log('Модуль достижений инициализирован', 'info');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  },

	setup() {
		this.createAchievementsScreen();
		
		// ДОБАВЬ ЭТИ СТРОКИ:
		if (typeof Core !== 'undefined') {
			Core.addNavButton('Достижения', 'achievements', '🏆');
		}
	},

  createAchievementsScreen() {
    let screen = document.getElementById('screen-achievements');
    if (!screen) {
      screen = document.createElement('div');
      screen.id = 'screen-achievements';
      screen.className = 'screen';
      document.getElementById('userInterface').appendChild(screen);
    }

    const stats = FTStorage.get('stats') || {yes:0,later:0,no:0,xp:0,level:1,streak:0};
    const xpNeeded = stats.level * 100;
    const xpPercent = Math.min(100, (stats.xp / xpNeeded) * 100);

    screen.innerHTML = `
      <h2 style="color:var(--acc);margin-top:0">🏆 Достижения</h2>
      
      <div style="background:var(--card);padding:15px;border-radius:10px;margin-bottom:15px">
        <h3 style="color:var(--acc);margin:0 0 15px 0">📊 Статистика</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">
          <div style="background:var(--bg);padding:15px;border-radius:8px;text-align:center">
            <div style="font-size:2em;font-weight:bold;color:var(--acc)">${stats.level}</div>
            <div class="text-small">Уровень</div>
            <div style="height:8px;background:var(--brd);border-radius:4px;overflow:hidden;margin-top:8px"><div style="height:100%;background:linear-gradient(90deg,var(--acc),var(--warn));width:${xpPercent}%"></div></div>
            <div class="text-small" style="margin-top:4px">${stats.xp}/${xpNeeded} XP</div>
          </div>
          <div style="background:var(--bg);padding:15px;border-radius:8px;text-align:center">
            <div style="font-size:2em;font-weight:bold;color:var(--ok)">${stats.yes}</div>
            <div class="text-small">Тренировок</div>
          </div>
          <div style="background:var(--bg);padding:15px;border-radius:8px;text-align:center">
            <div style="font-size:2em;font-weight:bold;color:var(--warn)">${stats.streak || 0}</div>
            <div class="text-small">Стрик дней</div>
          </div>
        </div>
      </div>

      <div style="background:var(--card);padding:15px;border-radius:10px">
        <h3 style="color:var(--acc);margin:0 0 15px 0">🎯 Достижения</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">
          ${this.getAchievements(stats).map(a => `
            <div style="background:var(--bg);padding:15px;border-radius:8px;text-align:center;${a.unlocked ? 'border:2px solid var(--acc)' : 'opacity:0.5'}">
              <div style="font-size:2em;margin-bottom:8px">${a.icon}</div>
              <div style="font-weight:600">${a.name}</div>
              <div class="text-small">${a.desc}</div>
              ${a.unlocked ? '<div style="color:var(--ok);font-size:.85em;margin-top:5px">✅ Получено</div>' : '<div class="text-small" style="margin-top:5px">🔒 Заблокировано</div>'}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  getAchievements(stats) {
    return [
      { name: 'Первый шаг', desc: 'Завершить первую тренировку', icon: '👣', unlocked: stats.yes >= 1 },
      { name: 'Неделя силы', desc: '7 тренировок подряд', icon: '🔥', unlocked: (stats.streak || 0) >= 7 },
      { name: 'Месяц дисциплины', desc: '30 тренировок', icon: '📅', unlocked: stats.yes >= 30 },
      { name: 'Уровень 5', desc: 'Достичь 5 уровня', icon: '⭐', unlocked: stats.level >= 5 },
      { name: 'Уровень 10', desc: 'Достичь 10 уровня', icon: '🌟', unlocked: stats.level >= 10 },
      { name: 'Марафонец', desc: '100 тренировок', icon: '🏃', unlocked: stats.yes >= 100 }
    ];
  }
};

module.exports = AchievementsModule;