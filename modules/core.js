// modules/core.js

const CoreModule = {
  storage: {
    get: function(key) { try { return JSON.parse(localStorage.getItem('ft_' + key)); } catch (e) { return null; } },
    set: function(key, value) { localStorage.setItem('ft_' + key, JSON.stringify(value)); },
    remove: function(key) { localStorage.removeItem('ft_' + key); }
  },
  utils: {
    escapeHtml: function(text) {
      if (text == null) return '';
      return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },
    generateId: function() { return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9); }
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
    // Обновить профиль в sidebar после навигации
    if (typeof updateSidebarProfile === 'function') updateSidebarProfile();
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
    item.innerHTML = icon + ' ' + label;
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
  }
};

window.CoreModule = CoreModule;
module.exports = CoreModule;