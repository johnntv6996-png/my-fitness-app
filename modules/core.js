// modules/core.js

const CoreModule = {
  storage: {
    get: function(key) {
      try {
        return JSON.parse(localStorage.getItem('ft_' + key));
      } catch (e) { return null; }
    },
    set: function(key, value) {
      localStorage.setItem('ft_' + key, JSON.stringify(value));
    },
    remove: function(key) {
      localStorage.removeItem('ft_' + key);
    }
  },

  utils: {
    escapeHtml: function(text) {
      if (text == null) return '';
      return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },
    generateId: function() {
      return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
  },

  navigate: function(screenId) {
    document.querySelectorAll('#userInterface .screen').forEach(function(s) { s.classList.remove('active'); });
    var target = document.getElementById('screen-' + screenId);
    if (target) target.classList.add('active');
    document.querySelectorAll('#userNav .nav-btn').forEach(function(b) { b.classList.remove('active'); });
    var activeBtn = document.querySelector('#userNav .nav-btn[data-screen="' + screenId + '"]');
    if (activeBtn) activeBtn.classList.add('active');
  },

  addNavButton: function(label, screenId, icon) {
    icon = icon || '';
    var nav = document.getElementById('userNav');
    if (!nav) return;
    var existing = nav.querySelector('[data-screen="' + screenId + '"]');
    if (existing) return;
    var btn = document.createElement('button');
    btn.className = 'nav-btn';
    btn.setAttribute('data-screen', screenId);
    btn.innerHTML = icon + ' ' + label;
    btn.onclick = function() { CoreModule.navigate(screenId); };
    nav.appendChild(btn);
  },

  init: function() {
    console.log('⚙️ Core module initialized');
    if (typeof Logger !== 'undefined') Logger.log('Ядро системы загружено', 'info');
    window.Core = this;
    window.FTStorage = this.storage;
    window.FTUtils = this.utils;
    window.FTNavigate = this.navigate.bind(this);
  }
};

window.CoreModule = CoreModule;
module.exports = CoreModule;