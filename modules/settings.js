// modules/settings.js

const SettingsModule = {
  init: function() {
    console.log('Settings module initialized');
    if (typeof Logger !== 'undefined') Logger.log('Модуль настроек инициализирован', 'info');
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { SettingsModule.setup(); });
    } else { this.setup(); }
  },
  setup: function() {
    this.createSettingsScreen();
    if (typeof Core !== 'undefined') Core.addNavButton('Настройки', 'settings', '<i class="ph ph-gear"></i>');
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
    if (typeof FTStorage !== 'undefined') return FTStorage.get('user_avatar') || 'ph-user-circle';
    return 'ph-user-circle';
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
      '.settings-section { background:var(--bg-card); border-radius:14px; padding:20px; margin-bottom:16px; border:1px solid var(--border-subtle); }' +
      '.settings-section:hover { border-color:var(--border-gold); }' +
      '.hint { font-size:0.75em; opacity:0.6; margin-top:3px; }' +
      '.avatar-picker { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }' +
      '.avatar-option { width:50px; height:50px; font-size:1.5em; background:var(--bg-primary); border:2px solid var(--border-subtle); border-radius:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s; color:var(--text-secondary); }' +
      '.avatar-option:hover { transform:scale(1.1); border-color:var(--accent-gold); color:var(--accent-gold); }' +
      '.avatar-option.selected { border-color:var(--accent-gold); background:rgba(212,175,55,0.1); color:var(--accent-gold); }' +
    '</style>';

    var html = css + '<div style="padding:16px;max-width:500px;margin:0 auto">';
    html += '<h2 style="font-family:var(--font-display);font-size:2em;margin-bottom:20px;color:var(--accent-gold);display:flex;align-items:center;gap:12px"><i class="ph ph-gear"></i> Настройки</h2>';

    html += '<div class="settings-section">';
    html += '<h3 style="font-family:var(--font-display);color:var(--accent-gold);margin:0 0 16px 0;display:flex;align-items:center;gap:10px"><i class="ph ph-user"></i> Профиль</h3>';
    html += '<div style="margin-bottom:16px">';
    html += '<label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.9em">Имя:</label>';
    html += '<input type="text" id="settingUserName" value="' + userName + '" placeholder="Введи своё имя" style="width:100%;padding:10px;background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary);font-size:1em">';
    html += '<div class="hint" style="display:flex;align-items:center;gap:4px;margin-top:4px"><i class="ph ph-info"></i> Будет отображаться на главном экране</div>';
    html += '</div>';

    html += '<div style="margin-bottom:16px">';
    html += '<label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.9em">Аватар:</label>';
    html += '<div style="text-align:center;margin:12px 0"><i class="ph ' + userAvatar + '" style="font-size:4em;color:var(--accent-gold)"></i></div>';
    html += '<div class="avatar-picker">';
    var avatars = ['ph-user-circle','ph-barbell','ph-sword','ph-person-simple-run','ph-person-simple-bike','ph-person-simple-swim','ph-person-simple-hike','ph-fire','ph-lightning','ph-star','ph-crown','ph-diamond','ph-trophy','ph-rocket'];
    for (var i = 0; i < avatars.length; i++) {
      html += '<div class="avatar-option ' + (userAvatar === avatars[i] ? 'selected' : '') + '" onclick="SettingsModule.setAvatar(\'' + avatars[i] + '\')"><i class="ph ' + avatars[i] + '"></i></div>';
    }
    html += '</div>';
    html += '</div>';

    html += '<button class="btn btn-primary" style="width:100%;padding:12px" onclick="SettingsModule.saveProfile()"><i class="ph ph-floppy-disk"></i> Сохранить профиль</button>';
    html += '</div>';

    html += '<div class="settings-section">';
    html += '<h3 style="font-family:var(--font-display);color:var(--accent-gold);margin:0 0 16px 0;display:flex;align-items:center;gap:10px"><i class="ph ph-clipboard-text"></i> Опросы</h3>';
    html += '<div style="margin-bottom:14px">';
    html += '<label style="display:flex;align-items:center;gap:10px;cursor:pointer">';
    html += '<input type="checkbox" id="settingDisableMini" ' + (settings.disableMiniSurvey ? 'checked' : '') + ' style="width:20px;height:20px;accent-color:var(--accent-gold)">';
    html += '<span style="font-size:0.95em">Отключить мини-опрос после подхода</span>';
    html += '</label>';
    html += '<div class="hint" style="display:flex;align-items:center;gap:4px;margin-top:4px"><i class="ph ph-info"></i> Подходы будут отмечаться сразу без вопросов</div>';
    html += '</div>';
    html += '<button class="btn btn-primary" style="width:100%;padding:12px" onclick="SettingsModule.saveSurveySettings()"><i class="ph ph-floppy-disk"></i> Сохранить</button>';
    html += '</div>';

    html += '<div class="settings-section">';
    html += '<h3 style="font-family:var(--font-display);color:var(--accent-gold);margin:0 0 16px 0;display:flex;align-items:center;gap:10px"><i class="ph ph-database"></i> Данные</h3>';
    html += '<button class="btn btn-secondary" style="width:100%;padding:12px;margin-bottom:10px" onclick="SettingsModule.exportData()"><i class="ph ph-export"></i> Экспорт данных</button>';
    html += '<button class="btn btn-secondary" style="width:100%;padding:12px;margin-bottom:10px" onclick="SettingsModule.importData()"><i class="ph ph-import"></i> Импорт данных</button>';
    html += '<button class="btn btn-danger" style="width:100%;padding:12px" onclick="SettingsModule.resetAll()"><i class="ph ph-warning"></i> Сбросить всё</button>';
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
    alert('Профиль сохранён!');
  },

  saveSurveySettings: function() {
    var settings = this.getSettings();
    settings.disableMiniSurvey = document.getElementById('settingDisableMini').checked;
    this.saveSettings(settings);
    alert('Настройки опросов сохранены!');
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
    alert('Данные экспортированы!');
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
          alert('Данные импортированы! Перезагрузи страницу.');
          location.reload();
        } catch (error) {
          alert('Ошибка импорта: ' + error.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  },

  resetAll: function() {
    if (!confirm('Удалить ВСЕ данные? Это нельзя отменить!')) return;
    if (!confirm('Ты точно уверен?')) return;
    Object.keys(localStorage).forEach(function(key) {
      if (key.startsWith('ft_')) localStorage.removeItem(key);
    });
    alert('Все данные удалены!');
    location.reload();
  }
};

window.SettingsModule = SettingsModule;
module.exports = SettingsModule;