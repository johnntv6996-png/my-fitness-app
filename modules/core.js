// modules/core.js

const CoreModule = {
  storage: {
    get: function(key) {
      try { return JSON.parse(localStorage.getItem('ft_' + key)); }
      catch (e) { return null; }
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

  // Drag-to-reorder для вкладок
  enableDragReorder: function() {
    var nav = document.getElementById('userNav');
    if (!nav) return;

    var draggedItem = null;
    var touchStartX = 0;
    var touchStartY = 0;
    var isDragging = false;
    var longPressTimer = null;
    var LONG_PRESS_DELAY = 400;

    function saveOrder() {
      var order = [];
      nav.querySelectorAll('.nav-btn').forEach(function(btn) {
        order.push(btn.getAttribute('data-screen'));
      });
      if (typeof FTStorage !== 'undefined') FTStorage.set('nav_order', order);
    }

    function restoreOrder() {
      var savedOrder = null;
      if (typeof FTStorage !== 'undefined') savedOrder = FTStorage.get('nav_order');
      if (!savedOrder || savedOrder.length === 0) return;
      var buttons = Array.from(nav.querySelectorAll('.nav-btn'));
      savedOrder.forEach(function(screenId) {
        var btn = nav.querySelector('[data-screen="' + screenId + '"]');
        if (btn) nav.appendChild(btn);
      });
    }

    function moveDraggedItem(clientX, clientY) {
      if (!draggedItem) return;
      var target = document.elementFromPoint(clientX, clientY);
      if (!target) return;
      var btn = target.closest ? target.closest('.nav-btn') : null;
      if (!btn) {
        var parent = target.parentElement;
        while (parent && parent !== nav) {
          if (parent.classList && parent.classList.contains('nav-btn')) { btn = parent; break; }
          parent = parent.parentElement;
        }
      }
      if (btn && btn !== draggedItem) {
        var rect = btn.getBoundingClientRect();
        var midX = rect.left + rect.width / 2;
        if (clientX < midX) {
          nav.insertBefore(draggedItem, btn);
        } else {
          nav.insertBefore(draggedItem, btn.nextSibling);
        }
      }
    }

    function startDrag(item) {
      draggedItem = item;
      draggedItem.style.opacity = '0.5';
      draggedItem.style.cursor = 'grabbing';
      isDragging = true;
    }

    function endDrag() {
      if (draggedItem) {
        draggedItem.style.opacity = '';
        draggedItem.style.cursor = '';
        draggedItem = null;
      }
      isDragging = false;
      saveOrder();
    }

    // Mouse events
    nav.addEventListener('mousedown', function(e) {
      var btn = e.target.closest ? e.target.closest('.nav-btn') : null;
      if (!btn) return;
      longPressTimer = setTimeout(function() { startDrag(btn); }, LONG_PRESS_DELAY);
    });

    document.addEventListener('mousemove', function(e) {
      if (!isDragging) return;
      e.preventDefault();
      moveDraggedItem(e.clientX, e.clientY);
    });

    document.addEventListener('mouseup', function() {
      clearTimeout(longPressTimer);
      endDrag();
    });

    // Touch events
    nav.addEventListener('touchstart', function(e) {
      var btn = e.target.closest ? e.target.closest('.nav-btn') : null;
      if (!btn) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      longPressTimer = setTimeout(function() { startDrag(btn); }, LONG_PRESS_DELAY);
    }, {passive: true});

    nav.addEventListener('touchmove', function(e) {
      if (!isDragging) return;
      var touch = e.touches[0];
      moveDraggedItem(touch.clientX, touch.clientY);
    }, {passive: true});

    document.addEventListener('touchend', function() {
      clearTimeout(longPressTimer);
      endDrag();
    });

    document.addEventListener('touchcancel', function() {
      clearTimeout(longPressTimer);
      endDrag();
    });

    // Восстановить порядок после небольшой задержки (чтобы все кнопки добавились)
    setTimeout(restoreOrder, 500);
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