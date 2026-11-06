// modules/core.js
const CoreModule = {
  storage: {
    get: function(key) {
      try {
        var raw = localStorage.getItem('ft_' + key);
        return raw === null ? null : JSON.parse(raw);
      } catch (e) {
        if (typeof Logger !== 'undefined') Logger.log('Storage parse error: ' + key, 'warn');
        return null;
      }
    },
    set: function(key, value) {
      try { localStorage.setItem('ft_' + key, JSON.stringify(value)); return true; }
      catch (e) {
        if (typeof Logger !== 'undefined') Logger.log('Storage write error: ' + key, 'error');
        return false;
      }
    },
    remove: function(key) { localStorage.removeItem('ft_' + key); }
  },
  utils: {
    escapeHtml: function(text) {
      if (text == null) return '';
      return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },
    formatLocalDate: function(date) {
      date = date || new Date();
      var y = date.getFullYear();
      var m = String(date.getMonth() + 1).padStart(2, '0');
      var d = String(date.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + d;
    },
    getTodayIndex: function() { return (new Date().getDay() + 6) % 7; },
    getDayName: function(idx) {
      return ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'][idx];
    },
    renderStars: function(count) {
      var s = '';
      for (var i = 1; i <= 5; i++) {
        s += i <= count
          ? '<i class="ph-fill ph-star" style="color:var(--accent-gold)"></i>'
          : '<i class="ph ph-star" style="color:var(--text-secondary);opacity:0.3"></i>';
      }
      return s;
    },
    getLevelIcon: function(level) {
      if (level >= 50) return 'ph-diamond';
      if (level >= 20) return 'ph-crown';
      if (level >= 10) return 'ph-trophy';
      if (level >= 5) return 'ph-star-four';
      return 'ph-star';
    },
    totalXp: function(stats) {
      stats = stats || {};
      var level = stats.level || 1;
      var xp = stats.xp || 0;
      // Исправлена математика: сумма арифметической прогрессии для уровней
      var baseXp = (level - 1) * level / 2 * 100;
      return baseXp + xp;
    },
    generateId: function(prefix) {
      prefix = prefix || 'id';
      var rnd = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).slice(2, 10);
      return prefix + '_' + Date.now() + '_' + rnd;
    },
    debounce: function(fn, wait) {
      var t = null;
      return function() {
        var args = arguments, self = this;
        clearTimeout(t);
        t = setTimeout(function() { fn.apply(self, args); }, wait || 300);
      };
    },
    throttleRaf: function(fn) {
      var scheduled = false, lastArgs = null, self = null;
      return function() {
        lastArgs = arguments; self = this;
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(function() {
          scheduled = false;
          fn.apply(self, lastArgs);
        });
      };
    }
  },
  _historyMapCache: null,
  _historyMapSourceLength: 0,
  _historyMapLastDate: '',
  getHistoryMap: function(history) {
    history = history || [];
    // Исправлена проверка кэша: сравниваем длину и последнюю дату, а не ссылку на объект
    var lastDate = history.length > 0 ? history[history.length - 1].date : '';
    if (this._historyMapSourceLength === history.length && this._historyMapLastDate === lastDate && this._historyMapCache) {
      return this._historyMapCache;
    }
    var map = {};
    for (var i = 0; i < history.length; i++) {
      map[history[i].date] = history[i];
    }
    this._historyMapSourceLength = history.length;
    this._historyMapLastDate = lastDate;
    this._historyMapCache = map;
    return map;
  },
  navigate: function(screenId) {
    if (screenId === 'dev') {
      if (typeof switchMode === 'function') switchMode('dev');
      document.querySelectorAll('.sidebar-item').forEach(function(b) { b.classList.remove('active'); });
      var devItem = document.querySelector('.sidebar-item[data-screen="dev"]');
      if (devItem) devItem.classList.add('active');
      return;
    }
    document.querySelectorAll('#userInterface .screen').forEach(function(s) { s.classList.remove('active'); });
    var target = document.getElementById('screen-' + screenId);
    if (target) { target.classList.add('active'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    if (typeof switchMode === 'function') switchMode('user');
    document.querySelectorAll('.sidebar-item').forEach(function(b) { b.classList.remove('active'); });
    var activeBtn = document.querySelector('.sidebar-item[data-screen="' + screenId + '"]');
    if (activeBtn) activeBtn.classList.add('active');
    if (typeof toggleSidebar === 'function' && document.getElementById('sidebar').classList.contains('active')) toggleSidebar();
    if (typeof updateSidebarProfile === 'function') updateSidebarProfile();
    
    var renderer = this.screenRenderers[screenId];
    if (renderer) {
      try { renderer(); } catch (e) {
        if (typeof Logger !== 'undefined') Logger.log('Render error ' + screenId + ': ' + e.message, 'error');
      }
    }
  },
  screenRenderers: {},
  registerScreen: function(screenId, renderFn) {
    this.screenRenderers[screenId] = renderFn;
  },
  addNavButton: function(label, screenId, icon) {
    icon = icon || '<i class="ph ph-circle"></i>';
    var menu = document.getElementById('sidebarMenu');
    if (!menu) return;
    var existing = menu.querySelector('[data-screen="' + screenId + '"]');
    if (existing) return;
    var item = document.createElement('div');
    item.className = 'sidebar-item';
    item.setAttribute('data-screen', screenId);
    item.innerHTML = icon + ' ' + this.utils.escapeHtml(label);
    item.onclick = function() { CoreModule.navigate(screenId); };
    menu.appendChild(item);
  },
  init: function() {
    console.log('Core module initialized');
    if (typeof Logger !== 'undefined') Logger.log('Ядро системы загружено', 'info');
    window.Core = this;
    window.FTStorage = this.storage;
    window.FTUtils = this.utils;
    window.FTNavigate = this.navigate.bind(this);
    window.shouldShowHints = function() {
      try {
        var settings = JSON.parse(localStorage.getItem('ft_settings')) || {};
        return !settings.disableHints;
      } catch (e) { return true; }
    };
  }
};

window.CoreModule = CoreModule;
window.Core = CoreModule;
module.exports = CoreModule;