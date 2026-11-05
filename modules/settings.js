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
      '.settings-section { background:var(--bg-card); border-radius:14px; padding:20px; margin-bottom:16px; border:1px solid var(--border-subtle); }' +
      '.settings-section:hover { border-color:var(--border-gold); }' +
      '.hint { font-size:0.75em; opacity:0.6; margin-top:3px; color:var(--text-secondary); }' +
    '</style>';

    var html = css + '<div style="padding:16px;max-width:500px;margin:0 auto">';
    html += '<h2 style="font-family:var(--font-display);font-size:2em;margin-bottom:20px;color:var(--accent-gold);display:flex;align-items:center;gap:12px"><i class="ph ph-gear"></i> Настройки</h2>';

    html += '<div style="background:var(--accent-gold-dim);border:1px solid var(--border-gold);border-radius:10px;padding:12px 16px;margin-bottom:18px;font-size:0.9em;display:flex;align-items:start;gap:10px">';
    html += '<i class="ph ph-user-circle" style="color:var(--accent-gold);font-size:1.2em;margin-top:2px"></i>';
    html += '<div><strong style="color:var(--accent-gold)">Профиль перенесён</strong><div style="margin-top:4px;opacity:0.8">Нажми на свой профиль в боковом меню (сверху) чтобы изменить имя и аватар.</div></div>';
    html += '</div>';

    html += '<div class="settings-section">';
    html += '<h3 style="font-family:var(--font-display);color:var(--accent-gold);margin:0 0 16px 0;display:flex;align-items:center;gap:10px"><i class="ph ph-clipboard-text"></i> Опросы</h3>';
    html += '<div style="margin-bottom:14px">';
    html += '<label style="display:flex;align-items:center;gap:10px;cursor:pointer">';
    html += '<input type="checkbox" id="settingDisableMini" ' + (settings.disableMiniSurvey ? 'checked' : '') + ' style="width:20px;height:20px;accent-color:var(--accent-gold)">';
    html += '<span style="font-size:0.95em">Отключить мини-опрос после подхода</span>';
    html += '</label>';
    if (hintsEnabled) html += '<div class="hint" style="display:flex;align-items:center;gap:4px;margin-top:4px"><i class="ph ph-info"></i> Подходы будут отмечаться сразу без вопросов</div>';
    html += '</div>';
    html += '<button class="btn btn-primary" style="width:100%;padding:12px" onclick="SettingsModule.saveSurveySettings()"><i class="ph ph-floppy-disk"></i> Сохранить</button>';
    html += '</div>';

    html += '<div class="settings-section">';
    html += '<h3 style="font-family:var(--font-display);color:var(--accent-gold);margin:0 0 16px 0;display:flex;align-items:center;gap:10px"><i class="ph ph-eye-slash"></i> Интерфейс</h3>';
    html += '<div style="margin-bottom:14px">';
    html += '<label style="display:flex;align-items:center;gap:10px;cursor:pointer">';
    html += '<input type="checkbox" id="settingDisableHints" ' + (settings.disableHints ? 'checked' : '') + ' style="width:20px;height:20px;accent-color:var(--accent-gold)">';
    html += '<span style="font-size:0.95em">Отключить все подсказки (хинты)</span>';
    html += '</label>';
    if (hintsEnabled) html += '<div class="hint" style="display:flex;align-items:center;gap:4px;margin-top:4px"><i class="ph ph-info"></i> Уберёт все информационные подсказки во всех разделах</div>';
    html += '</div>';
    html += '<button class="btn btn-primary" style="width:100%;padding:12px" onclick="SettingsModule.saveInterfaceSettings()"><i class="ph ph-floppy-disk"></i> Сохранить</button>';
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