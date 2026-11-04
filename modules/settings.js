// modules/settings.js

const SettingsModule = {
  init: function() {
    console.log('⚙️ Settings module initialized');
    if (typeof Logger !== 'undefined') Logger.log('Модуль настроек инициализирован', 'info');
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { SettingsModule.setup(); });
    } else { this.setup(); }
  },
  setup: function() {
    this.createSettingsScreen();
    if (typeof Core !== 'undefined') Core.addNavButton('Настройки', 'settings', '⚙️');
  },

  getSettings: function() {
    if (typeof FTStorage !== 'undefined') return FTStorage.get('settings') || {};
    return {};
  },
  saveSettings: function(s) { if (typeof FTStorage !== 'undefined') FTStorage.set('settings', s); },
  getUserName: function() {
    if (typeof FTStorage !== 'undefined') return FTStorage.get('user_name') || '';
    return '';
  },
  saveUserName: function(n) { if (typeof FTStorage !== 'undefined') FTStorage.set('user_name', n); },
  getUserAvatar: function() {
    if (typeof FTStorage !== 'undefined') return FTStorage.get('user_avatar') || '💪';
    return '💪';
  },
  saveUserAvatar: function(a) { if (typeof FTStorage !== 'undefined') FTStorage.set('user_avatar', a); },

  createSettingsScreen: function() {
    var screen = document.getElementById('screen-settings');
    if (!screen) {
      screen = document.createElement('div');
      screen.id = 'screen-settings';
      screen.className = 'screen';
      document.getElementById('userInterface').appendChild(screen);
    }

    var settings = this.getSettings();
    var userName = this.getUserName();
    var userAvatar = this.getUserAvatar();

    var css = '<style>' +
      '.settings-section { background:var(--card); border-radius:10px; padding:15px; margin-bottom:15px; border:1px solid var(--brd); }' +
      '.hint { font-size:0.75em; opacity:0.6; margin-top:3px; }' +
      '.avatar-picker { display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; }' +
      '.avatar-option { width:50px; height:50px; font-size:1.8em; background:var(--bg); border:2px solid var(--brd); border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s; }' +
      '.avatar-option:hover { transform:scale(1.1); }' +
      '.avatar-option.selected { border-color:var(--acc); background:rgba(255,215,0,0.1); }' +
    '</style>';

    var html = css + '<div style="padding:15px;max-width:500px;margin:0 auto">';
    html += '<h2 style="color:var(--acc);margin-top:0">⚙️ Настройки</h2>';

    // Профиль
    html += '<div class="settings-section">';
    html += '<h3 style="color:var(--acc);margin:0 0 15px 0">👤 Профиль</h3>';
    html += '<div style="margin-bottom:15px">';
    html += '<label style="display:block;margin-bottom:5px;font-weight:600">Имя:</label>';
    html += '<input type="text" id="settingUserName" value="' + userName + '" placeholder="Введи своё имя" style="width:100%;padding:8px;background:var(--inp);border:1px solid var(--brd);border-radius:6px;color:var(--text);font-size:1em">';
    html += '<div class="hint">💡 Будет отображаться на главном экране</div>';
    html += '</div>';

    html += '<div style="margin-bottom:15px">';
    html += '<label style="display:block;margin-bottom:5px;font-weight:600">Аватар:</label>';
    html += '<div style="font-size:3em;text-align:center;margin:10px 0">' + userAvatar + '</div>';
    html += '<div class="avatar-picker">';
    var avatars = ['💪','🏋️','🥊','🤸','🧘','🏃','🚴','🏊','⚽','🎯','🔥','⭐','👑','💎','🦾','🤖'];
    for (var i = 0; i < avatars.length; i++) {
      html += '<div class="avatar-option ' + (userAvatar === avatars[i] ? 'selected' : '') + '" onclick="SettingsModule.setAvatar(\'' + avatars[i] + '\')">' + avatars[i] + '</div>';
    }
    html += '</div>';
    html += '</div>';

    html += '<button class="btn" style="width:100%;padding:10px;background:var(--ok);color:#2c3e50;border:none;border-radius:6px;cursor:pointer;font-weight:700" onclick="SettingsModule.saveProfile()">💾 Сохранить профиль</button>';
    html += '</div>';

    // Опросы
    html += '<div class="settings-section">';
    html += '<h3 style="color:var(--acc);margin:0 0 15px 0">📋 Опросы</h3>';
    html += '<div style="margin-bottom:12px">';
    html += '<label style="display:flex;align-items:center;gap:10px;cursor:pointer">';
    html += '<input type="checkbox" id="settingDisableMini" ' + (settings.disableMiniSurvey ? 'checked' : '') + ' style="width:20px;height:20px;accent-color:var(--acc)">';
    html += '<span>Отключить мини-опрос после подхода</span>';
    html += '</label>';
    html += '<div class="hint">💡 Подходы будут отмечаться сразу без вопросов</div>';
    html += '</div>';
    html += '<button class="btn" style="width:100%;padding:10px;background:var(--ok);color:#2c3e50;border:none;border-radius:6px;cursor:pointer;font-weight:700" onclick="SettingsModule.saveSurveySettings()">💾 Сохранить</button>';
    html += '</div>';

    // Данные
    html += '<div class="settings-section">';
    html += '<h3 style="color:var(--acc);margin:0 0 15px 0">💾 Данные</h3>';
    html += '<button class="btn" style="width:100%;padding:10px;background:var(--brd);color:var(--text);border:none;border-radius:6px;cursor:pointer;margin-bottom:8px" onclick="SettingsModule.exportData()">📤 Экспорт данных</button>';
    html += '<button class="btn" style="width:100%;padding:10px;background:var(--brd);color:var(--text);border:none;border-radius:6px;cursor:pointer;margin-bottom:8px" onclick="SettingsModule.importData()">📥 Импорт данных</button>';
    html += '<button class="btn" style="width:100%;padding:10px;background:#e74c3c;color:#fff;border:none;border-radius:6px;cursor:pointer" onclick="SettingsModule.resetAll()">⚠️ Сбросить всё</button>';
    html += '</div>';

    html += '</div>';
    screen.innerHTML = html;
  },

  setAvatar: function(a) {
    this.saveUserAvatar(a);
    this.createSettingsScreen();
  },

  saveProfile: function() {
    var name = document.getElementById('settingUserName').value.trim();
    this.saveUserName(name);
    alert('✅ Профиль сохранён!');
  },

  saveSurveySettings: function() {
    var settings = this.getSettings();
    settings.disableMiniSurvey = document.getElementById('settingDisableMini').checked;
    this.saveSettings(settings);
    alert('✅ Настройки опросов сохранены!');
  },

  exportData: function() {
    var data = {};
    Object.keys(localStorage).forEach(function(key) {
      if (key.startsWith('ft_')) data[key] = localStorage.getItem(key);
    });
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'fitness_backup_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    alert('📤 Данные экспортированы!');
  },

  importData: function() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        try {
          var data = JSON.parse(ev.target.result);
          Object.keys(data).forEach(function(key) { localStorage.setItem(key, data[key]); });
          alert('✅ Данные импортированы! Перезагрузи страницу.');
          location.reload();
        } catch (error) {
          alert('❌ Ошибка импорта: ' + error.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  },

  resetAll: function() {
    if (!confirm('⚠️ Удалить ВСЕ данные? Это нельзя отменить!')) return;
    if (!confirm('Ты точно уверен?')) return;
    Object.keys(localStorage).forEach(function(key) {
      if (key.startsWith('ft_')) localStorage.removeItem(key);
    });
    alert('🗑️ Все данные удалены!');
    location.reload();
  }
};

window.SettingsModule = SettingsModule;
module.exports = SettingsModule;