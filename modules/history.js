// modules/history.js

const HistoryModule = {
  init() {
    console.log('📋 History module initialized');
    if (typeof Logger !== 'undefined') Logger.log('Модуль истории инициализирован', 'info');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  },

  setup() {
    this.createHistoryScreen();
  },

  createHistoryScreen() {
    let screen = document.getElementById('screen-history');
    if (!screen) {
      screen = document.createElement('div');
      screen.id = 'screen-history';
      screen.className = 'screen';
      document.getElementById('userInterface').appendChild(screen);
    }

    const history = FTStorage.get('history') || [];

    if (history.length === 0) {
      screen.innerHTML = `
        <h2 style="color:var(--acc);margin-top:0">📋 История тренировок</h2>
        <div style="text-align:center;padding:30px;opacity:0.6">
          <div style="font-size:4em;margin-bottom:15px">📋</div>
          <p>История пуста. Завершите первую тренировку!</p>
        </div>
      `;
      return;
    }

    screen.innerHTML = `
      <h2 style="color:var(--acc);margin-top:0">📋 История тренировок</h2>
      ${history.slice().reverse().map(h => {
        const details = (h.details||[]).map(d => {
          let info = d.mode === 'static' ? `${d.sets}×${d.holdTime}с` : `${d.sets}×${d.reps}`;
          if (d.weight) info += ` · ${d.weight}кг`;
          return `<div class="text-small">• ${FTUtils.escapeHtml(d.name)} · ${info}</div>`;
        }).join('');
        const dur = Math.floor((h.duration||0)/60);
        return `
          <div style="background:var(--inp);padding:10px;border-radius:6px;margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
              <div>
                <div style="font-weight:bold;color:var(--acc)">${FTUtils.escapeHtml(h.dayName)} · ${h.date}</div>
                <div class="text-small">${FTUtils.escapeHtml(h.muscleGroup||'—')} · ${h.exercises.length} упр. · ${dur} мин</div>
              </div>
              <button class="btn btn-danger" style="padding:4px 8px;font-size:.85em" onclick="HistoryModule.deleteHistory(${h.timestamp})">🗑️</button>
            </div>
            ${details}
          </div>
        `;
      }).join('')}
    `;
  },

  deleteHistory(ts) {
    if (!confirm('Удалить запись?')) return;
    let history = FTStorage.get('history') || [];
    history = history.filter(h => h.timestamp !== ts);
    FTStorage.set('history', history);
    this.createHistoryScreen();
  }
};

module.exports = HistoryModule;