// modules/core.js

const CoreModule = {
  storage: {
    get(key) {
      try {
        return JSON.parse(localStorage.getItem('ft_' + key));
      } catch {
        return null;
      }
    },
    set(key, value) {
      localStorage.setItem('ft_' + key, JSON.stringify(value));
    },
    remove(key) {
      localStorage.removeItem('ft_' + key);
    }
  },

  utils: {
    escapeHtml(text) {
      if (text == null) return '';
      return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },
    generateId() {
      return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
  },

  navigate(screenId) {
    document.querySelectorAll('#userInterface .screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('screen-' + screenId);
    if (target) target.classList.add('active');

    document.querySelectorAll('#userNav .nav-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`#userNav .nav-btn[data-screen="${screenId}"]`);
    if (activeBtn) activeBtn.classList.add('active');
  },

	addNavButton(label, screenId, icon = '') {
		const nav = document.getElementById('userNav');
		if (!nav) return;

		// Проверяем, нет ли уже такой кнопки
		const existing = nav.querySelector(`[data-screen="${screenId}"]`);
		if (existing) return;

		const btn = document.createElement('button');
		btn.className = 'nav-btn';
		btn.setAttribute('data-screen', screenId);
		btn.innerHTML = `${icon} ${label}`;
		btn.onclick = () => this.navigate(screenId);
		nav.appendChild(btn);
	},

  init() {
    console.log('⚙️ Core module initialized');
    if (typeof Logger !== 'undefined') Logger.log('Ядро системы загружено', 'info');
    
    window.Core = this;
    window.FTStorage = this.storage;
    window.FTUtils = this.utils;
    window.FTNavigate = this.navigate.bind(this);
  }
};

module.exports = CoreModule;