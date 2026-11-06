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
    var hintsEnabled = typeof shouldShowHints === 'function' ? shouldShowHints() : true;

    var css = '<style>' +
      '.settings-section { background:var(--bg-card); border-radius:12px; margin-bottom:10px; border:1px solid var(--border-subtle); overflow:hidden; transition:all 0.2s; }' +
      '.settings-section:hover { border-color:var(--border-gold); }' +
      '.settings-header { padding:14px 18px; cursor:pointer; display:flex; align-items:center; justify-content:space-between; transition:background 0.2s; }' +
      '.settings-header:hover { background:var(--accent-gold-dim); }' +
      '.settings-header h3 { font-family:var(--font-display); color:var(--accent-gold); margin:0; display:flex; align-items:center; gap:10px; font-size:1.1em; }' +
      '.settings-header i.chevron { transition:transform 0.3s; color:var(--accent-gold); }' +
      '.settings-header.open i.chevron { transform:rotate(180deg); }' +
      '.settings-body { max-height:0; overflow:hidden; transition:max-height 0.3s ease-out; padding:0 18px; }' +
      '.settings-body.open { max-height:2000px; padding:0 18px 18px; }' +
      '.hint { font-size:0.75em; opacity:0.6; margin-top:3px; color:var(--text-secondary); }' +
      '.avatar-preview { width:90px; height:90px; border-radius:50%; border:3px solid var(--accent-gold); overflow:hidden; background:var(--bg-primary); display:flex; align-items:center; justify-content:center; margin:0 auto 14px; }' +
      '.avatar-preview img { width:100%; height:100%; object-fit:cover; }' +
      '.avatar-preview i { font-size:2.5em; color:var(--accent-gold); }' +
    '</style>';

    var html = css + '<div style="padding:12px;max-width:500px;margin:0 auto">';
    html += '<h2 style="font-family:var(--font-display);font-size:1.8em;margin-bottom:16px;color:var(--accent-gold);display:flex;align-items:center;gap:12px"><i class="ph ph-gear"></i> Настройки</h2>';

    html += this.renderAccordion('profile', 'ph-user', 'Профиль', true);
    html += this.renderAccordion('survey', 'ph-clipboard-text', 'Опросы', false);
    html += this.renderAccordion('interface', 'ph-eye-slash', 'Интерфейс', false);
    html += this.renderAccordion('data', 'ph-database', 'Данные', false);

    html += '</div>';
    screen.innerHTML = html;

    document.querySelectorAll('.settings-header').forEach(function(header) {
      header.onclick = function() {
        var body = this.nextElementSibling;
        var isOpen = body.classList.contains('open');
        document.querySelectorAll('.settings-body').forEach(function(b) { b.classList.remove('open'); });
        document.querySelectorAll('.settings-header').forEach(function(h) { h.classList.remove('open'); });
        if (!isOpen) {
          body.classList.add('open');
          this.classList.add('open');
        }
      };
    });
  },

  renderAccordion: function(id, icon, title, isOpen) {
    var settings = this.getSettings();
    var userName = this.getUserName();
    var userAvatar = this.getUserAvatar();
    var hintsEnabled = typeof shouldShowHints === 'function' ? shouldShowHints() : true;

    var html = '<div class="settings-section">';
    html += '<div class="settings-header ' + (isOpen ? 'open' : '') + '" data-section="' + id + '">';
    html += '<h3><i class="ph ph-' + icon + '"></i> ' + title + '</h3>';
    html += '<i class="ph ph-caret-down chevron"></i>';
    html += '</div>';
    html += '<div class="settings-body ' + (isOpen ? 'open' : '') + '">';

    if (id === 'profile') {
      html += '<div class="avatar-preview">';
      if (userAvatar && userAvatar.startsWith('data:image')) html += '<img src="' + userAvatar + '" alt="avatar">';
      else if (userAvatar) html += '<i class="ph ' + userAvatar + '"></i>';
      else html += '<i class="ph ph-user-circle"></i>';
      html += '</div>';
      html += '<div style="display:flex;gap:8px;justify-content:center;margin-bottom:16px;flex-wrap:wrap">';
      html += '<button class="btn btn-primary" onclick="SettingsModule.uploadAvatar()" style="padding:8px 14px;font-size:0.85em"><i class="ph ph-upload-simple"></i> Фото</button>';
      if (userAvatar) {
        html += '<button class="btn btn-secondary" onclick="SettingsModule.chooseIconAvatar()" style="padding:8px 14px;font-size:0.85em"><i class="ph ph-smiley"></i> Иконка</button>';
        html += '<button class="btn btn-danger" onclick="SettingsModule.removeAvatar()" style="padding:8px 14px;font-size:0.85em"><i class="ph ph-trash"></i> Удалить</button>';
      }
      html += '</div>';
      html += '<div style="margin-bottom:14px">';
      html += '<label style="display:block;margin-bottom:5px;font-weight:600;font-size:0.88em">Имя:</label>';
      html += '<input type="text" id="settingUserName" value="' + userName + '" placeholder="Введи своё имя" style="width:100%;padding:9px;background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary);font-size:0.95em">';
      if (hintsEnabled) html += '<div class="hint" style="display:flex;align-items:center;gap:4px;margin-top:3px"><i class="ph ph-info"></i> Отображается на главном экране и в профиле</div>';
      html += '</div>';
      html += '<button class="btn btn-primary" style="width:100%;padding:10px" onclick="SettingsModule.saveProfile()"><i class="ph ph-floppy-disk"></i> Сохранить профиль</button>';
    } else if (id === 'survey') {
      html += '<div style="margin-bottom:12px">';
      html += '<label style="display:flex;align-items:center;gap:10px;cursor:pointer">';
      html += '<input type="checkbox" id="settingDisableMini" ' + (settings.disableMiniSurvey ? 'checked' : '') + ' style="width:18px;height:18px;accent-color:var(--accent-gold)">';
      html += '<span style="font-size:0.92em">Отключить мини-опрос после подхода</span>';
      html += '</label>';
      if (hintsEnabled) html += '<div class="hint" style="display:flex;align-items:center;gap:4px;margin-top:3px"><i class="ph ph-info"></i> Подходы будут отмечаться сразу без вопросов</div>';
      html += '</div>';
      html += '<button class="btn btn-primary" style="width:100%;padding:10px" onclick="SettingsModule.saveSurveySettings()"><i class="ph ph-floppy-disk"></i> Сохранить</button>';
    } else if (id === 'interface') {
      html += '<div style="margin-bottom:12px">';
      html += '<label style="display:flex;align-items:center;gap:10px;cursor:pointer">';
      html += '<input type="checkbox" id="settingDisableHints" ' + (settings.disableHints ? 'checked' : '') + ' style="width:18px;height:18px;accent-color:var(--accent-gold)">';
      html += '<span style="font-size:0.92em">Отключить все подсказки (хинты)</span>';
      html += '</label>';
      if (hintsEnabled) html += '<div class="hint" style="display:flex;align-items:center;gap:4px;margin-top:3px"><i class="ph ph-info"></i> Уберёт информационные подсказки во всех разделах</div>';
      html += '</div>';
      html += '<button class="btn btn-primary" style="width:100%;padding:10px" onclick="SettingsModule.saveInterfaceSettings()"><i class="ph ph-floppy-disk"></i> Сохранить</button>';
    } else if (id === 'data') {
      html += '<button class="btn btn-secondary" style="width:100%;padding:10px;margin-bottom:8px" onclick="SettingsModule.exportData()"><i class="ph ph-export"></i> Экспорт данных</button>';
      html += '<button class="btn btn-secondary" style="width:100%;padding:10px;margin-bottom:8px" onclick="SettingsModule.importData()"><i class="ph ph-import"></i> Импорт данных</button>';
      html += '<button class="btn btn-danger" style="width:100%;padding:10px" onclick="SettingsModule.resetAll()"><i class="ph ph-warning"></i> Сбросить всё</button>';
    }

    html += '</div></div>';
    return html;
  },

  uploadAvatar: function() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(e) {
      var file = e.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { alert('Файл слишком большой. Максимум 2 МБ.'); return; }
      var reader = new FileReader();
      reader.onload = function(ev) {
        var img = new Image();
        img.onload = function() {
          var canvas = document.createElement('canvas');
          var size = 200;
          canvas.width = size; canvas.height = size;
          var ctx = canvas.getContext('2d');
          var minDim = Math.min(img.width, img.height);
          var sx = (img.width - minDim) / 2;
          var sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
          var dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          SettingsModule.saveUserAvatar(dataUrl);
          SettingsModule.createSettingsScreen();
          if (typeof updateSidebarProfile === 'function') updateSidebarProfile();
          alert('Аватар обновлён!');
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
      if (typeof updateSidebarProfile === 'function') updateSidebarProfile();
    }
  },

  removeAvatar: function() {
    if (!confirm('Удалить аватар?')) return;
    this.saveUserAvatar(null);
    this.createSettingsScreen();
    if (typeof updateSidebarProfile === 'function') updateSidebarProfile();
  },

  saveProfile: function() {
    var name = document.getElementById('settingUserName').value.trim();
    this.saveUserName(name);
    if (typeof updateSidebarProfile === 'function') updateSidebarProfile();
    alert('Профиль сохранён!');
  },

  saveSurveySettings: function() {
    var settings = this.getSettings();
    settings.disableMiniSurvey = document.getElementById('settingDisableMini').checked;
    this.saveSettings(settings);
    alert('Настройки опросов сохранены!');
  },

  saveInterfaceSettings: function() {
    var settings = this.getSettings();
    settings.disableHints = document.getElementById('settingDisableHints').checked;
    this.saveSettings(settings);
    alert('Настройки интерфейса сохранены!');
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
          var importedCount = 0;
          var skippedCount = 0;
          Object.keys(data).forEach(function(key) {
            var value = data[key];
            var stringValue = (typeof value === 'string') ? value : JSON.stringify(value);
            try {
              localStorage.setItem(key, stringValue);
              importedCount++;
            } catch (err) { skippedCount++; }
          });
          var msg = 'Импортировано ключей: ' + importedCount;
          if (skippedCount > 0) msg += '\nПропущено: ' + skippedCount;
          msg += '\n\nСтраница перезагрузится.';
          alert(msg);
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