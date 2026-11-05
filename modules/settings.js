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
  getSettings: function() { if (typeof FTStorage !== 'undefined') return FTStorage.get('settings') || {}; return {}; },
  saveSettings: function(s) { if (typeof FTStorage !== 'undefined') FTStorage.set('settings', s); },
  getUserName: function() { if (typeof FTStorage !== 'undefined') return FTStorage.get('user_name') || ''; return ''; },
  saveUserName: function(n) { if (typeof FTStorage !== 'undefined') FTStorage.set('user_name', n); },
  getUserAvatar: function() {
    if (typeof FTStorage !== 'undefined') return FTStorage.get('user_avatar') || null;
    return null;
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
      '.hint { font-size:0.75em; opacity:0.6; margin-top:3px; color:var(--text-secondary); }' +
      '.avatar-preview { width:100px; height:100px; border-radius:50%; border:3px solid var(--accent-gold); overflow:hidden; background:var(--bg-primary); display:flex; align-items:center; justify-content:center; margin:0 auto 16px; }' +
      '.avatar-preview img { width:100%; height:100%; object-fit:cover; }' +
      '.avatar-preview i { font-size:3em; color:var(--accent-gold); }' +
    '</style>';

    var html = css + '<div style="padding:16px;max-width:500px;margin:0 auto">';
    html += '<h2 style="font-family:var(--font-display);font-size:2em;margin-bottom:20px;color:var(--accent-gold);display:flex;align-items:center;gap:12px"><i class="ph ph-gear"></i> Настройки</h2>';

    html += '<div class="settings-section">';
    html += '<h3 style="font-family:var(--font-display);color:var(--accent-gold);margin:0 0 16px 0;display:flex;align-items:center;gap:10px"><i class="ph ph-user"></i> Профиль</h3>';
    
    // Превью аватарки
    html += '<div class="avatar-preview">';
    if (userAvatar && userAvatar.startsWith('data:image')) {
      html += '<img src="' + userAvatar + '" alt="avatar">';
    } else if (userAvatar) {
      html += '<i class="ph ' + userAvatar + '"></i>';
    } else {
      html += '<i class="ph ph-user-circle"></i>';
    }
    html += '</div>';

    // Кнопки управления аватаркой
    html += '<div style="display:flex;gap:10px;justify-content:center;margin-bottom:20px;flex-wrap:wrap">';
    html += '<button class="btn btn-primary" onclick="SettingsModule.uploadAvatar()" style="padding:10px 18px;font-size:0.9em"><i class="ph ph-upload-simple"></i> Загрузить фото</button>';
    if (userAvatar) {
      html += '<button class="btn btn-secondary" onclick="SettingsModule.chooseIconAvatar()" style="padding:10px 18px;font-size:0.9em"><i class="ph ph-smiley"></i> Выбрать иконку</button>';
      html += '<button class="btn btn-danger" onclick="SettingsModule.removeAvatar()" style="padding:10px 18px;font-size:0.9em"><i class="ph ph-trash"></i> Удалить</button>';
    }
    html += '</div>';

    html += '<div style="margin-bottom:16px">';
    html += '<label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.9em">Имя:</label>';
    html += '<input type="text" id="settingUserName" value="' + userName + '" placeholder="Введи своё имя" style="width:100%;padding:10px;background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary);font-size:1em">';
    html += '<div class="hint" style="display:flex;align-items:center;gap:4px;margin-top:4px"><i class="ph ph-info"></i> Будет отображаться на главном экране</div>';
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

  uploadAvatar: function() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(e) {
      var file = e.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        alert('Файл слишком большой. Максимум 2 МБ.');
        return;
      }
      var reader = new FileReader();
      reader.onload = function(ev) {
        // Сжимаем изображение через canvas
        var img = new Image();
        img.onload = function() {
          var canvas = document.createElement('canvas');
          var size = 200;
          canvas.width = size;
          canvas.height = size;
          var ctx = canvas.getContext('2d');
          // Центрируем и обрезаем в квадрат
          var minDim = Math.min(img.width, img.height);
          var sx = (img.width - minDim) / 2;
          var sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
          var dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          SettingsModule.saveUserAvatar(dataUrl);
          SettingsModule.createSettingsScreen();
          alert('Аватарка обновлена!');
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  },

  chooseIconAvatar: function() {
    var icons = ['ph-user-circle','ph-barbell','ph-sword','ph-person-simple-run','ph-person-simple-bike','ph-person-simple-swim','ph-person-simple-hike','ph-flame','ph-lightning','ph-star','ph-crown','ph-diamond','ph-trophy','ph-rocket'];
    var choice = prompt('Введи номер иконки (1-' + icons.length + '):\n' + icons.map(function(ic, i) { return (i+1) + '. ' + ic; }).join('\n'));
    if (!choice) return;
    var idx = parseInt(choice) - 1;
    if (idx >= 0 && idx < icons.length) {
      this.saveUserAvatar(icons[idx]);
      this.createSettingsScreen();
    }
  },

  removeAvatar: function() {
    if (!confirm('Удалить аватарку?')) return;
    this.saveUserAvatar(null);
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
        } catch (error) { alert('Ошибка импорта: ' + error.message); }
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