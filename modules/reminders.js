// modules/reminders.js

const RemindersModule = {
  init() {
    console.log('🔔 Reminders module initialized');
    if (typeof Logger !== 'undefined') Logger.log('Модуль напоминалок инициализирован', 'info');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  },

	setup() {
		this.createRemindersScreen();
		
		// ДОБАВЬ ЭТИ СТРОКИ:
		if (typeof Core !== 'undefined') {
			Core.addNavButton('Напоминалки', 'reminders', '🔔');
		}
	},

  createRemindersScreen() {
    let screen = document.getElementById('screen-reminders');
    if (!screen) {
      screen = document.createElement('div');
      screen.id = 'screen-reminders';
      screen.className = 'screen';
      document.getElementById('userInterface').appendChild(screen);
    }

    const reminders = FTStorage.get('reminders') || [];

    screen.innerHTML = `
      <h2 style="color:var(--acc);margin-top:0">🔔 Напоминалки и важное</h2>
      <div style="background:var(--card);padding:15px;border-radius:10px;margin-bottom:15px">
        <h3 style="color:var(--acc);margin:0 0 15px 0">➕ Добавить напоминание</h3>
        <div style="margin-bottom:12px"><label style="display:block;margin-bottom:5px;font-weight:600">Текст:</label><input type="text" id="reminderText" placeholder="Например: Выпить воду" style="width:100%;padding:8px;background:var(--inp);border:1px solid var(--brd);border-radius:6px;color:var(--text)"></div>
        <div style="margin-bottom:12px"><label style="display:block;margin-bottom:5px;font-weight:600">Время (необязательно):</label><input type="time" id="reminderTime" style="width:100%;padding:8px;background:var(--inp);border:1px solid var(--brd);border-radius:6px;color:var(--text)"></div>
        <div style="margin-bottom:12px"><label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="reminderImportant" style="width:18px;height:18px;accent-color:var(--acc)"><span>⭐ Важное</span></label></div>
        <button class="btn btn-primary" style="width:100%" onclick="RemindersModule.addReminder()">➕ Добавить</button>
      </div>
      <div id="remindersList">
        ${reminders.length === 0 ? '<div style="text-align:center;padding:30px;opacity:0.6">Нет напоминаний. Добавьте первое!</div>' :
          [...reminders].sort((a,b) => {
            if(a.important && !b.important) return -1;
            if(!a.important && b.important) return 1;
            if(a.done && !b.done) return 1;
            if(!a.done && b.done) return -1;
            return 0;
          }).map(r => `
            <div style="background:var(--inp);padding:10px;border-radius:6px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;${r.done ? 'opacity:.5' : ''}${r.important ? ';border-left:3px solid var(--acc)' : ''}">
              <div style="flex:1">
                <div style="font-weight:600${r.done ? ';text-decoration:line-through' : ''}">${r.important ? '⭐ ' : ''}${FTUtils.escapeHtml(r.text)}</div>
                ${r.time ? `<div class="text-small" style="margin-top:3px">🕐 ${r.time}</div>` : ''}
              </div>
              <div style="display:flex;gap:5px">
                <button class="btn ${r.done ? 'btn-secondary' : 'btn-primary'}" style="padding:4px 8px;font-size:.85em" onclick="RemindersModule.toggleReminder(${r.id})">${r.done ? '↩️' : '✅'}</button>
                <button class="btn btn-danger" style="padding:4px 8px;font-size:.85em" onclick="RemindersModule.deleteReminder(${r.id})">🗑️</button>
              </div>
            </div>
          `).join('')
        }
      </div>
    `;
  },

  addReminder() {
    const text = document.getElementById('reminderText').value.trim();
    const time = document.getElementById('reminderTime').value;
    const important = document.getElementById('reminderImportant').checked;
    
    if (!text) { alert('Введите текст напоминания'); return; }
    
    let reminders = FTStorage.get('reminders') || [];
    reminders.push({ id: Date.now(), text, time: time || null, important, done: false, createdAt: new Date().toISOString() });
    FTStorage.set('reminders', reminders);
    
    document.getElementById('reminderText').value = '';
    document.getElementById('reminderTime').value = '';
    document.getElementById('reminderImportant').checked = false;
    this.createRemindersScreen();
  },

  toggleReminder(id) {
    let reminders = FTStorage.get('reminders') || [];
    const r = reminders.find(x => x.id === id);
    if (r) {
      r.done = !r.done;
      FTStorage.set('reminders', reminders);
      this.createRemindersScreen();
    }
  },

  deleteReminder(id) {
    if (!confirm('Удалить напоминание?')) return;
    let reminders = FTStorage.get('reminders') || [];
    reminders = reminders.filter(x => x.id !== id);
    FTStorage.set('reminders', reminders);
    this.createRemindersScreen();
  }
};

module.exports = RemindersModule;