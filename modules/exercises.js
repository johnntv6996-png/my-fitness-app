// modules/exercises.js

const ExercisesModule = {
  editingId: null,
  currentFilter: 'all',

  init: function() {
    console.log('Exercises module initialized');
    if (typeof Logger !== 'undefined') Logger.log('Модуль базы упражнений инициализирован', 'info');
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { ExercisesModule.setup(); });
    } else { this.setup(); }
  },

  setup: function() {
    this.createExercisesScreen();
    if (typeof Core !== 'undefined') Core.addNavButton('База упражнений', 'exercises', '<i class="ph ph-books"></i>');
  },

  getDB: function() { if (typeof FTStorage !== 'undefined') return FTStorage.get('db') || []; return []; },
  saveDB: function(db) { if (typeof FTStorage !== 'undefined') FTStorage.set('db', db); },
  getCategories: function() { if (typeof FTStorage !== 'undefined') return FTStorage.get('categories') || []; return []; },
  saveCategories: function(c) { if (typeof FTStorage !== 'undefined') FTStorage.set('categories', c); },

  getDefaultExercise: function() {
    return { name: '', muscleGroup: '', description: '', videoUrl: '', imageUrl: '', notes: '', inventory: '', difficulty: 3, effectiveness: 3, favorite: false };
  },

  toggleFavorite: function(id) {
    var db = this.getDB();
    for (var i = 0; i < db.length; i++) {
      if (db[i].id === id) { db[i].favorite = !db[i].favorite; break; }
    }
    this.saveDB(db);
    this.createExercisesScreen();
  },

  renderStars: function(count) {
    var s = '';
    for (var i = 1; i <= 5; i++) s += i <= count ? '<i class="ph-fill ph-star" style="color:var(--accent-gold)"></i>' : '<i class="ph ph-star" style="color:var(--text-secondary);opacity:0.3"></i>';
    return s;
  },

  parseVideoUrl: function(url) {
    if (!url) return null;
    url = url.trim();
    var m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (m) return { type: 'iframe', embedUrl: 'https://www.youtube.com/embed/' + m[1] };
    m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (m) return { type: 'iframe', embedUrl: 'https://player.vimeo.com/video/' + m[1] };
    m = url.match(/rutube\.ru\/(?:video|play\/embed)\/([a-zA-Z0-9]+)/);
    if (m) return { type: 'iframe', embedUrl: 'https://rutube.ru/play/embed/' + m[1] };
    m = url.match(/(?:vk\.com|vkvideo\.ru)\/video(?:_?)(-?\d+)_(\d+)/);
    if (m) return { type: 'iframe', embedUrl: 'https://vk.com/video_ext.php?oid=' + m[1] + '&id=' + m[2] + '&hd=2' };
    if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return { type: 'video', directUrl: url };
    return null;
  },

  createExercisesScreen: function() {
    var screen = document.getElementById('screen-exercises');
    if (!screen) {
      screen = document.createElement('div');
      screen.id = 'screen-exercises';
      screen.className = 'screen';
      document.getElementById('userInterface').appendChild(screen);
    }

    var db = this.getDB();
    var categories = this.getCategories();
    
    var favCount = 0;
    for (var i = 0; i < db.length; i++) if (db[i].favorite) favCount++;

    var filtered = db;
    if (this.currentFilter === 'favorites') {
      filtered = [];
      for (var i = 0; i < db.length; i++) if (db[i].favorite) filtered.push(db[i]);
    } else if (this.currentFilter === 'uncategorized') {
      filtered = [];
      for (var i = 0; i < db.length; i++) if (!db[i].muscleGroup || db[i].muscleGroup === '') filtered.push(db[i]);
    } else if (this.currentFilter !== 'all') {
      filtered = [];
      for (var i = 0; i < db.length; i++) if (db[i].muscleGroup === this.currentFilter) filtered.push(db[i]);
    }

    var css = '<style>' +
      '.ex-card { background:var(--bg-card); border-radius:12px; padding:16px; margin-bottom:12px; border:1px solid var(--border-subtle); cursor:pointer; transition:all 0.2s; position:relative; }' +
      '.ex-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,0.3); border-color:var(--border-gold); }' +
      '.ex-card.favorite { border-left:3px solid var(--accent-gold); }' +
      '.ex-modal { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); backdrop-filter:blur(15px); z-index:1000; display:flex; justify-content:center; align-items:center; padding:15px; }' +
      '.ex-modal-content { background:var(--bg-secondary); padding:28px; border-radius:24px; width:100%; max-width:600px; max-height:90vh; overflow-y:auto; border:1px solid var(--border-gold); box-shadow:0 0 40px rgba(212,175,55,0.2); }' +
      '.hint { font-size:0.75em; opacity:0.6; margin-top:3px; }' +
      '.cat-scroll-container { display:flex; gap:8px; overflow-x:auto; scroll-behavior:smooth; padding:8px 4px; scrollbar-width:none; cursor:grab; user-select:none; }' +
      '.cat-scroll-container:active { cursor:grabbing; }' +
      '.cat-scroll-container::-webkit-scrollbar { display:none; }' +
      '.cat-btn { padding:8px 14px; font-size:0.85em; border:1px solid var(--border-subtle); border-radius:20px; cursor:pointer; transition:all 0.2s; background:var(--bg-card); color:var(--text-secondary); display:inline-flex; align-items:center; gap:6px; white-space:nowrap; flex-shrink:0; }' +
      '.cat-btn.active { background:linear-gradient(135deg, var(--accent-gold), var(--accent-gold-light)); color:#000; border-color:var(--accent-gold); font-weight:600; }' +
      '.cat-btn:not(.active):hover { background:rgba(255,255,255,0.08); color:var(--text-primary); }' +
      '.cat-action-btn { width:36px; height:36px; border-radius:50%; background:var(--bg-card); border:1px solid var(--border-subtle); color:var(--text-secondary); cursor:pointer; display:inline-flex; align-items:center; justify-content:center; font-size:1em; transition:all 0.2s; flex-shrink:0; }' +
      '.cat-action-btn:hover:not(:disabled) { background:var(--accent-gold-dim); border-color:var(--border-gold); color:var(--accent-gold); }' +
      '.cat-action-btn:disabled { opacity:0.3; cursor:not-allowed; }' +
      '.cat-action-btn.danger:hover:not(:disabled) { background:rgba(248,113,113,0.15); border-color:var(--accent-error); color:var(--accent-error); }' +
      '.fav-btn { background:transparent; border:none; cursor:pointer; font-size:1.3em; padding:4px 8px; transition:all 0.2s; }' +
      '.fav-btn:hover { transform:scale(1.2); }' +
      '.fav-btn.active { color:var(--accent-gold); }' +
      '.fav-btn:not(.active) { color:var(--text-muted); opacity:0.5; }' +
      '.ex-view-section { background:var(--bg-primary); padding:14px; border-radius:10px; margin-bottom:12px; }' +
      '.ex-view-section h3 { color:var(--accent-gold); margin:0 0 10px 0; display:flex; align-items:center; gap:8px; font-family:var(--font-display); font-size:1.1em; }' +
      '.ex-view-actions { display:flex; gap:10px; margin-top:20px; }' +
    '</style>';

    // Тулбар категорий
    var toolbarHtml = '<div style="background:var(--bg-card);border-radius:14px;padding:16px;margin-bottom:16px;border:1px solid var(--border-subtle)">';
    toolbarHtml += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">';
    toolbarHtml += '<div style="font-weight:600;font-size:0.95em;display:flex;align-items:center;gap:8px"><i class="ph ph-folder" style="color:var(--accent-gold)"></i> Категории</div>';
    toolbarHtml += '<div style="display:flex;gap:6px;align-items:center">';
    var isSystemFilter = ['all', 'uncategorized', 'favorites'].indexOf(this.currentFilter) !== -1;
    toolbarHtml += '<button class="cat-action-btn" ' + (isSystemFilter ? 'disabled' : '') + ' onclick="ExercisesModule.openCategoryForm(\'' + this.currentFilter.replace(/'/g, "\\'") + '\')" title="Редактировать"><i class="ph ph-pencil-simple"></i></button>';
    toolbarHtml += '<button class="cat-action-btn danger" ' + (isSystemFilter ? 'disabled' : '') + ' onclick="ExercisesModule.deleteCategory(\'' + this.currentFilter.replace(/'/g, "\\'") + '\')" title="Удалить"><i class="ph ph-trash"></i></button>';
    toolbarHtml += '<button class="cat-action-btn" onclick="ExercisesModule.openCategoryForm()" title="Добавить категорию" style="background:var(--accent-gold);color:#000;border-color:var(--accent-gold)"><i class="ph ph-plus"></i></button>';
    toolbarHtml += '</div></div>';
    
    toolbarHtml += '<div class="cat-scroll-container" id="catScrollContainer">';
    toolbarHtml += '<button class="cat-btn ' + (this.currentFilter === 'all' ? 'active' : '') + '" onclick="ExercisesModule.setFilter(\'all\')"><i class="ph ph-squares-four"></i> Все (' + db.length + ')</button>';
    if (favCount > 0) {
      toolbarHtml += '<button class="cat-btn ' + (this.currentFilter === 'favorites' ? 'active' : '') + '" onclick="ExercisesModule.setFilter(\'favorites\')"><i class="ph-fill ph-star"></i> Избранное (' + favCount + ')</button>';
    }
    toolbarHtml += '<button class="cat-btn ' + (this.currentFilter === 'uncategorized' ? 'active' : '') + '" onclick="ExercisesModule.setFilter(\'uncategorized\')"><i class="ph ph-question"></i> Без категории</button>';
    for (var i = 0; i < categories.length; i++) {
      var count = 0;
      for (var j = 0; j < db.length; j++) if (db[j].muscleGroup === categories[i]) count++;
      toolbarHtml += '<button class="cat-btn ' + (this.currentFilter === categories[i] ? 'active' : '') + '" onclick="ExercisesModule.setFilter(\'' + categories[i].replace(/'/g, "\\'") + '\')"><i class="ph ph-tag"></i> ' + categories[i] + ' (' + count + ')</button>';
    }
    toolbarHtml += '</div>';
    toolbarHtml += '<div class="hint" style="margin-top:10px;display:flex;align-items:center;gap:6px"><i class="ph ph-info"></i> Перетаскивай мышкой для навигации. Кликни на категорию для фильтрации.</div>';
    toolbarHtml += '</div>';

    // Кнопка "Добавить упражнение" ПОД категориями
    var addBtnText = 'Добавить упражнение';
    if (this.currentFilter !== 'all' && this.currentFilter !== 'uncategorized' && this.currentFilter !== 'favorites') {
      addBtnText = 'Добавить в "' + this.currentFilter + '"';
    }
    var addBtnHtml = '<button class="btn btn-primary" style="width:100%;padding:14px;font-size:1em;font-weight:600;margin-bottom:16px" onclick="ExercisesModule.openExForm(null, \'' + (this.currentFilter !== 'all' && this.currentFilter !== 'uncategorized' && this.currentFilter !== 'favorites' ? this.currentFilter.replace(/'/g, "\\'") : '') + '\')"><i class="ph ph-plus-circle"></i> ' + addBtnText + '</button>';

    var listHtml = '';
    if (filtered.length === 0) {
      var emptyIcon = this.currentFilter === 'favorites' ? 'ph-star' : 'ph-books';
      var emptyText = this.currentFilter === 'favorites' ? 'Нет избранных упражнений. Нажми ☆ на упражнении.' : 'Ничего не найдено';
      listHtml = '<div style="text-align:center;padding:40px;opacity:0.6"><i class="ph ' + emptyIcon + '" style="font-size:3em;color:var(--accent-gold);margin-bottom:10px;display:block"></i><p>' + emptyText + '</p></div>';
    } else {
      for (var i = 0; i < filtered.length; i++) {
        var ex = filtered[i];
        var diff = ex.difficulty || 3;
        var eff = ex.effectiveness || 3;
        var isFav = ex.favorite ? 'favorite' : '';
        listHtml += '<div class="ex-card ' + isFav + '" onclick="ExercisesModule.viewExercise(\'' + ex.id + '\')">';
        listHtml += '<div style="display:flex;justify-content:space-between;align-items:start">';
        listHtml += '<div style="flex:1">';
        listHtml += '<h4 style="margin:0 0 6px 0;color:var(--accent-gold);font-size:1.05em;display:flex;align-items:center;gap:8px;flex-wrap:wrap">' + ex.name;
        if (ex.videoUrl) listHtml += '<i class="ph ph-video-camera" style="color:var(--accent-neon)"></i>';
        if (ex.imageUrl) listHtml += '<i class="ph ph-image" style="color:var(--accent-neon)"></i>';
        listHtml += '</h4>';
        listHtml += '<div style="font-size:0.85em;opacity:0.7;margin-bottom:6px;display:flex;align-items:center;gap:6px"><i class="ph ph-tag"></i> ' + (ex.muscleGroup || 'Без категории') + '</div>';
        listHtml += '<div style="font-size:0.8em;opacity:0.7;display:flex;gap:16px;flex-wrap:wrap">';
        listHtml += '<span style="display:flex;align-items:center;gap:4px"><i class="ph ph-fire" style="color:var(--accent-warning)"></i> ' + this.renderStars(diff) + '</span>';
        listHtml += '<span style="display:flex;align-items:center;gap:4px"><i class="ph ph-target" style="color:var(--accent-success)"></i> ' + this.renderStars(eff) + '</span>';
        listHtml += '</div>';
        listHtml += '</div>';
        listHtml += '<div style="display:flex;gap:6px;margin-left:10px;align-items:center">';
        listHtml += '<button class="fav-btn ' + (ex.favorite ? 'active' : '') + '" onclick="event.stopPropagation();ExercisesModule.toggleFavorite(\'' + ex.id + '\')" title="В избранное"><i class="' + (ex.favorite ? 'ph-fill' : 'ph') + ' ph-star"></i></button>';
        listHtml += '<button class="btn btn-secondary" style="padding:6px 10px;font-size:0.85em" onclick="event.stopPropagation();ExercisesModule.editExercise(\'' + ex.id + '\')"><i class="ph ph-pencil-simple"></i></button>';
        listHtml += '<button class="btn btn-danger" style="padding:6px 10px;font-size:0.85em" onclick="event.stopPropagation();ExercisesModule.deleteExercise(\'' + ex.id + '\')"><i class="ph ph-trash"></i></button>';
        listHtml += '</div></div></div>';
      }
    }

    screen.innerHTML = css +
      '<div style="padding:8px;max-width:700px;margin:0 auto">' +
        '<h2 style="font-family:var(--font-display);font-size:1.8em;margin-bottom:16px;color:var(--accent-gold);display:flex;align-items:center;gap:12px"><i class="ph ph-books"></i> База упражнений</h2>' +
        toolbarHtml +
        addBtnHtml +
        listHtml +
      '</div>';

    setTimeout(function() { ExercisesModule.initDragScroll(); }, 100);
  },

  initDragScroll: function() {
    var container = document.getElementById('catScrollContainer');
    if (!container) return;
    var isDown = false, startX, scrollLeft;
    container.addEventListener('mousedown', function(e) { isDown = true; startX = e.pageX - container.offsetLeft; scrollLeft = container.scrollLeft; });
    container.addEventListener('mouseleave', function() { isDown = false; });
    container.addEventListener('mouseup', function() { isDown = false; });
    container.addEventListener('mousemove', function(e) { if (!isDown) return; e.preventDefault(); var x = e.pageX - container.offsetLeft; container.scrollLeft = scrollLeft - (x - startX) * 2; });
    var touchStartX = 0, touchScrollLeft = 0;
    container.addEventListener('touchstart', function(e) { touchStartX = e.touches[0].pageX - container.offsetLeft; touchScrollLeft = container.scrollLeft; }, { passive: true });
    container.addEventListener('touchmove', function(e) { var x = e.touches[0].pageX - container.offsetLeft; container.scrollLeft = touchScrollLeft - (x - touchStartX) * 2; }, { passive: true });
  },

  setFilter: function(f) { this.currentFilter = f; this.createExercisesScreen(); },

  openCategoryForm: function(oldName) {
    var isEdit = oldName ? true : false;
    var modal = document.createElement('div');
    modal.className = 'ex-modal';
    modal.id = 'catFormModal';
    modal.innerHTML =
      '<div class="ex-modal-content" style="max-width:400px">' +
        '<button style="float:right;background:transparent;border:none;color:var(--text-secondary);font-size:1.5em;cursor:pointer" onclick="document.getElementById(\'catFormModal\').remove()"><i class="ph ph-x"></i></button>' +
        '<h2 style="font-family:var(--font-display);color:var(--accent-gold);margin-top:0;display:flex;align-items:center;gap:10px">' + (isEdit ? '<i class="ph ph-pencil-simple"></i> Редактировать' : '<i class="ph ph-plus-circle"></i> Новая категория') + '</h2>' +
        '<div style="margin-bottom:16px">' +
          '<label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.9em">Название:</label>' +
          '<input type="text" id="catName" value="' + (isEdit ? oldName : '') + '" placeholder="Например: Грудь" style="width:100%;padding:10px;background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary);font-size:1em">' +
        '</div>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">' +
          '<button class="btn btn-secondary" onclick="document.getElementById(\'catFormModal\').remove()">Отмена</button>' +
          '<button class="btn btn-primary" onclick="ExercisesModule.saveCategory(\'' + (isEdit ? oldName : '') + '\')"><i class="ph ph-floppy-disk"></i> Сохранить</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
  },

  saveCategory: function(oldName) {
    var newName = document.getElementById('catName').value.trim();
    if (!newName) { alert('Введи название'); return; }
    var categories = this.getCategories();
    for (var i = 0; i < categories.length; i++) {
      if (categories[i] === newName && categories[i] !== oldName) { alert('Такая категория уже существует'); return; }
    }
    if (oldName) {
      for (var i = 0; i < categories.length; i++) if (categories[i] === oldName) { categories[i] = newName; break; }
      var db = this.getDB();
      for (var i = 0; i < db.length; i++) if (db[i].muscleGroup === oldName) db[i].muscleGroup = newName;
      this.saveDB(db);
      if (this.currentFilter === oldName) this.currentFilter = newName;
    } else { categories.push(newName); }
    this.saveCategories(categories);
    document.getElementById('catFormModal').remove();
    this.createExercisesScreen();
  },

  deleteCategory: function(name) {
    if (!confirm('Удалить категорию "' + name + '"?\n\nУпражнения станут "Без категории".')) return;
    var categories = this.getCategories();
    var newC = [];
    for (var i = 0; i < categories.length; i++) if (categories[i] !== name) newC.push(categories[i]);
    this.saveCategories(newC);
    var db = this.getDB();
    for (var i = 0; i < db.length; i++) if (db[i].muscleGroup === name) db[i].muscleGroup = '';
    this.saveDB(db);
    if (this.currentFilter === name) this.currentFilter = 'all';
    this.createExercisesScreen();
  },

  openExForm: function(id, defaultCategory) {
    this.editingId = id || null;
    var db = this.getDB();
    var categories = this.getCategories();
    var ex = null;
    for (var i = 0; i < db.length; i++) if (db[i].id === id) { ex = db[i]; break; }
    if (!ex) ex = this.getDefaultExercise();

    var optionsHtml = '<option value="">Без категории</option>';
    for (var i = 0; i < categories.length; i++) {
      var selected = (ex.muscleGroup === categories[i]) ? 'selected' : '';
      if (defaultCategory && !id && categories[i] === defaultCategory) selected = 'selected';
      optionsHtml += '<option value="' + categories[i] + '" ' + selected + '>' + categories[i] + '</option>';
    }

    var modal = document.createElement('div');
    modal.className = 'ex-modal';
    modal.id = 'exFormModal';
    modal.innerHTML =
      '<div class="ex-modal-content">' +
        '<button style="float:right;background:transparent;border:none;color:var(--text-secondary);font-size:1.5em;cursor:pointer" onclick="document.getElementById(\'exFormModal\').remove()"><i class="ph ph-x"></i></button>' +
        '<h2 style="font-family:var(--font-display);color:var(--accent-gold);margin-top:0;display:flex;align-items:center;gap:10px">' + (id ? '<i class="ph ph-pencil-simple"></i> Редактирование' : '<i class="ph ph-plus-circle"></i> Новое упражнение') + '</h2>' +
        '<div style="margin-bottom:14px"><label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.9em">Название: <span style="color:var(--accent-error)">*</span></label>' +
          '<input type="text" id="exName" value="' + ex.name + '" placeholder="Например: Отжимания" style="width:100%;padding:10px;background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary);font-size:1em"></div>' +
        '<div style="margin-bottom:14px"><label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.9em">Категория:</label>' +
          '<select id="exMuscleGroup" style="width:100%;padding:10px;background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary);font-size:1em">' + optionsHtml + '</select></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">' +
          '<div><label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.9em"><i class="ph ph-fire" style="color:var(--accent-warning)"></i> Сложность:</label>' +
            '<select id="exDifficulty" style="width:100%;padding:10px;background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary);font-size:1em">' +
            '<option value="1" ' + (ex.difficulty==1?'selected':'') + '>1 — Очень легко</option>' +
            '<option value="2" ' + (ex.difficulty==2?'selected':'') + '>2 — Легко</option>' +
            '<option value="3" ' + (ex.difficulty==3?'selected':'') + '>3 — Средне</option>' +
            '<option value="4" ' + (ex.difficulty==4?'selected':'') + '>4 — Сложно</option>' +
            '<option value="5" ' + (ex.difficulty==5?'selected':'') + '>5 — Очень сложно</option></select></div>' +
          '<div><label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.9em"><i class="ph ph-target" style="color:var(--accent-success)"></i> Эффективность:</label>' +
            '<select id="exEffectiveness" style="width:100%;padding:10px;background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary);font-size:1em">' +
            '<option value="1" ' + (ex.effectiveness==1?'selected':'') + '>1 — Низкая</option>' +
            '<option value="2" ' + (ex.effectiveness==2?'selected':'') + '>2 — Ниже среднего</option>' +
            '<option value="3" ' + (ex.effectiveness==3?'selected':'') + '>3 — Средняя</option>' +
            '<option value="4" ' + (ex.effectiveness==4?'selected':'') + '>4 — Высокая</option>' +
            '<option value="5" ' + (ex.effectiveness==5?'selected':'') + '>5 — Максимальная</option></select></div>' +
        '</div>' +
        '<div style="margin-bottom:14px"><label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.9em"><i class="ph ph-text-t"></i> Описание:</label>' +
          '<textarea id="exDescription" rows="3" placeholder="Техника выполнения..." style="width:100%;padding:10px;background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary);font-size:1em;resize:vertical">' + ex.description + '</textarea></div>' +
        '<div style="margin-bottom:14px"><label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.9em"><i class="ph ph-image"></i> Картинка (URL):</label>' +
          '<input type="text" id="exImage" value="' + ex.imageUrl + '" placeholder="https://example.com/image.jpg" style="width:100%;padding:10px;background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary);font-size:1em"></div>' +
        '<div style="margin-bottom:14px"><label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.9em"><i class="ph ph-video-camera"></i> Видео (URL):</label>' +
          '<input type="text" id="exVideo" value="' + ex.videoUrl + '" placeholder="YouTube, VK, Rutube..." style="width:100%;padding:10px;background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary);font-size:1em"></div>' +
        '<div style="margin-bottom:14px"><label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.9em"><i class="ph ph-backpack"></i> Инвентарь:</label>' +
          '<input type="text" id="exInventory" value="' + ex.inventory + '" placeholder="гантели 10кг, коврик..." style="width:100%;padding:10px;background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary);font-size:1em"></div>' +
        '<div style="margin-bottom:14px"><label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.9em"><i class="ph ph-push-pin"></i> Заметки:</label>' +
          '<textarea id="exNotes" rows="2" placeholder="Личные заметки..." style="width:100%;padding:10px;background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary);font-size:1em;resize:vertical">' + ex.notes + '</textarea></div>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">' +
          '<button class="btn btn-secondary" onclick="document.getElementById(\'exFormModal\').remove()">Отмена</button>' +
          '<button class="btn btn-primary" onclick="ExercisesModule.saveExercise()"><i class="ph ph-floppy-disk"></i> Сохранить</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
  },

  saveExercise: function() {
    var name = document.getElementById('exName').value.trim();
    if (!name) { alert('Укажи название'); return; }
    var db = this.getDB();
    var exData = {
      name: name,
      muscleGroup: document.getElementById('exMuscleGroup').value,
      difficulty: parseInt(document.getElementById('exDifficulty').value),
      effectiveness: parseInt(document.getElementById('exEffectiveness').value),
      description: document.getElementById('exDescription').value.trim(),
      imageUrl: document.getElementById('exImage').value.trim(),
      videoUrl: document.getElementById('exVideo').value.trim(),
      inventory: document.getElementById('exInventory').value.trim(),
      notes: document.getElementById('exNotes').value.trim(),
      updatedAt: Date.now()
    };
    if (this.editingId) {
      for (var i = 0; i < db.length; i++) if (db[i].id === this.editingId) {
        exData.favorite = db[i].favorite || false;
        db[i] = Object.assign({}, db[i], exData);
        break;
      }
    } else {
      exData.id = 'ex_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      exData.createdAt = Date.now();
      exData.favorite = false;
      db.push(exData);
    }
    this.saveDB(db);
    document.getElementById('exFormModal').remove();
    this.editingId = null;
    this.createExercisesScreen();
  },

  editExercise: function(id) { this.openExForm(id); },

  deleteExercise: function(id) {
    if (!confirm('Удалить упражнение?')) return;
    var db = this.getDB();
    var newDb = [];
    for (var i = 0; i < db.length; i++) if (db[i].id !== id) newDb.push(db[i]);
    this.saveDB(newDb);
    this.createExercisesScreen();
  },

  // === ИСПРАВЛЕННАЯ ФУНКЦИЯ ПРОСМОТРА (через createElement) ===
  viewExercise: function(id) {
    var db = this.getDB();
    var ex = null;
    for (var i = 0; i < db.length; i++) if (db[i].id === id) { ex = db[i]; break; }
    if (!ex) return;

    var self = this;

    // Создаём модалку
    var modal = document.createElement('div');
    modal.className = 'ex-modal';
    modal.id = 'exViewModal';

    var content = document.createElement('div');
    content.className = 'ex-modal-content';

    // Кнопка закрытия
    var closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'float:right;background:transparent;border:none;color:var(--text-secondary);font-size:1.5em;cursor:pointer';
    closeBtn.innerHTML = '<i class="ph ph-x"></i>';
    closeBtn.onclick = function() { modal.remove(); };
    content.appendChild(closeBtn);

    // Заголовок + избранное
    var titleRow = document.createElement('div');
    titleRow.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:12px';
    var title = document.createElement('h2');
    title.style.cssText = 'font-family:var(--font-display);color:var(--accent-gold);margin:0;flex:1';
    title.textContent = ex.name;
    titleRow.appendChild(title);
    var favBtn = document.createElement('button');
    favBtn.className = 'fav-btn ' + (ex.favorite ? 'active' : '');
    favBtn.title = 'В избранное';
    favBtn.innerHTML = '<i class="' + (ex.favorite ? 'ph-fill' : 'ph') + ' ph-star"></i>';
    favBtn.onclick = function() {
      self.toggleFavorite(ex.id);
      modal.remove();
    };
    titleRow.appendChild(favBtn);
    content.appendChild(titleRow);

    // Категория
    var catDiv = document.createElement('div');
    catDiv.style.cssText = 'font-size:0.9em;opacity:0.7;margin-bottom:12px;display:flex;align-items:center;gap:6px';
    catDiv.innerHTML = '<i class="ph ph-tag"></i> ' + (ex.muscleGroup || 'Без категории');
    content.appendChild(catDiv);

    // Звёзды
    var starsDiv = document.createElement('div');
    starsDiv.style.cssText = 'display:flex;gap:20px;margin-bottom:16px;font-size:0.9em;flex-wrap:wrap';
    starsDiv.innerHTML = 
      '<div style="display:flex;align-items:center;gap:6px"><i class="ph ph-fire" style="color:var(--accent-warning)"></i> Сложность: ' + this.renderStars(ex.difficulty || 3) + '</div>' +
      '<div style="display:flex;align-items:center;gap:6px"><i class="ph ph-target" style="color:var(--accent-success)"></i> Эффективность: ' + this.renderStars(ex.effectiveness || 3) + '</div>';
    content.appendChild(starsDiv);

    // Инвентарь
    if (ex.inventory) {
      var invDiv = document.createElement('div');
      invDiv.className = 'ex-view-section';
      invDiv.style.cssText = 'display:flex;align-items:start;gap:8px';
      invDiv.innerHTML = '<i class="ph ph-backpack" style="color:var(--accent-gold);font-size:1.1em;margin-top:2px"></i><div><strong style="color:var(--accent-gold)">Инвентарь:</strong> ' + ex.inventory + '</div>';
      content.appendChild(invDiv);
    }

    // Описание
    if (ex.description) {
      var descDiv = document.createElement('div');
      descDiv.className = 'ex-view-section';
      descDiv.innerHTML = '<h3><i class="ph ph-text-t"></i> Описание</h3><p style="white-space:pre-wrap;margin:0;line-height:1.6">' + ex.description + '</p>';
      content.appendChild(descDiv);
    }

    // Изображение
    if (ex.imageUrl) {
      var imgDiv = document.createElement('div');
      imgDiv.className = 'ex-view-section';
      var imgTitle = document.createElement('h3');
      imgTitle.innerHTML = '<i class="ph ph-image"></i> Изображение';
      imgDiv.appendChild(imgTitle);
      
      var imgWrap = document.createElement('div');
      imgWrap.style.cssText = 'position:relative;border-radius:8px;overflow:hidden;background:#000;min-height:100px';
      
      var img = document.createElement('img');
      img.src = ex.imageUrl;
      img.alt = ex.name;
      img.style.cssText = 'width:100%;max-height:300px;object-fit:contain;display:block';
      img.onerror = function() {
        imgWrap.innerHTML = '<div style="padding:30px;text-align:center;opacity:0.6"><i class="ph ph-image-broken" style="font-size:2em;color:var(--accent-warning);display:block;margin-bottom:8px"></i><div style="font-size:0.9em">Не удалось загрузить изображение</div></div>';
      };
      imgWrap.appendChild(img);
      imgDiv.appendChild(imgWrap);
      content.appendChild(imgDiv);
    }

    // Видео
    if (ex.videoUrl) {
      var videoDiv = document.createElement('div');
      videoDiv.className = 'ex-view-section';
      var videoTitle = document.createElement('h3');
      videoTitle.innerHTML = '<i class="ph ph-video-camera"></i> Видео';
      videoDiv.appendChild(videoTitle);
      
      var videoInfo = this.parseVideoUrl(ex.videoUrl);
      if (videoInfo) {
        if (videoInfo.type === 'iframe') {
          var iframeWrap = document.createElement('div');
          iframeWrap.style.cssText = 'position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px;background:#000';
          var iframe = document.createElement('iframe');
          iframe.src = videoInfo.embedUrl;
          iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none';
          iframe.allowFullscreen = true;
          iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
          iframeWrap.appendChild(iframe);
          videoDiv.appendChild(iframeWrap);
        } else if (videoInfo.type === 'video') {
          var video = document.createElement('video');
          video.controls = true;
          video.style.cssText = 'width:100%;border-radius:8px;background:#000';
          var source = document.createElement('source');
          source.src = videoInfo.directUrl;
          video.appendChild(source);
          videoDiv.appendChild(video);
        }
      } else {
        var link = document.createElement('a');
        link.href = ex.videoUrl;
        link.target = '_blank';
        link.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;background:var(--bg-card);border-radius:8px;color:var(--accent-neon);text-decoration:none;border:1px solid var(--border-subtle)';
        link.innerHTML = '<i class="ph ph-external-link"></i> Открыть внешнее видео';
        videoDiv.appendChild(link);
      }
      content.appendChild(videoDiv);
    }

    // Заметки
    if (ex.notes) {
      var notesDiv = document.createElement('div');
      notesDiv.className = 'ex-view-section';
      notesDiv.style.cssText = 'border-left:3px solid var(--accent-gold)';
      notesDiv.innerHTML = '<h3><i class="ph ph-push-pin"></i> Заметки</h3><p style="white-space:pre-wrap;margin:0;line-height:1.6">' + ex.notes + '</p>';
      content.appendChild(notesDiv);
    }

    // Кнопки действий
    var actionsDiv = document.createElement('div');
    actionsDiv.className = 'ex-view-actions';
    
    var closeBtn2 = document.createElement('button');
    closeBtn2.className = 'btn btn-secondary';
    closeBtn2.innerHTML = '<i class="ph ph-x"></i> Закрыть';
    closeBtn2.onclick = function() { modal.remove(); };
    actionsDiv.appendChild(closeBtn2);

    var editBtn = document.createElement('button');
    editBtn.className = 'btn btn-primary';
    editBtn.innerHTML = '<i class="ph ph-pencil-simple"></i> Редактировать';
    editBtn.onclick = function() { modal.remove(); self.editExercise(ex.id); };
    actionsDiv.appendChild(editBtn);

    content.appendChild(actionsDiv);
    modal.appendChild(content);
    document.body.appendChild(modal);
  }
};

window.ExercisesModule = ExercisesModule;
module.exports = ExercisesModule;