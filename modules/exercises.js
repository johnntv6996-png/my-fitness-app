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
    if (typeof Core !== 'undefined') Core.addNavButton('База', 'exercises', '<i class="ph ph-books"></i>');
  },

  getDB: function() {
    if (typeof FTStorage !== 'undefined') return FTStorage.get('db') || [];
    return [];
  },
  saveDB: function(db) { if (typeof FTStorage !== 'undefined') FTStorage.set('db', db); },
  getCategories: function() {
    if (typeof FTStorage !== 'undefined') return FTStorage.get('categories') || [];
    return [];
  },
  saveCategories: function(c) { if (typeof FTStorage !== 'undefined') FTStorage.set('categories', c); },

  getDefaultExercise: function() {
    return { name: '', muscleGroup: '', description: '', videoUrl: '', imageUrl: '', notes: '', inventory: '', difficulty: 3, effectiveness: 3 };
  },

  renderStars: function(count) {
    var s = '';
    for (var i = 1; i <= 5; i++) s += i <= count ? '<i class="ph-fill ph-star" style="color:var(--accent-gold)"></i>' : '<i class="ph ph-star" style="color:var(--text-muted)"></i>';
    return s;
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
    var filtered = db;
    if (this.currentFilter === 'uncategorized') {
      filtered = [];
      for (var i = 0; i < db.length; i++) if (!db[i].muscleGroup || db[i].muscleGroup === '') filtered.push(db[i]);
    } else if (this.currentFilter !== 'all') {
      filtered = [];
      for (var i = 0; i < db.length; i++) if (db[i].muscleGroup === this.currentFilter) filtered.push(db[i]);
    }

    var css = '<style>' +
      '.ex-card { background:var(--bg-card); border-radius:12px; padding:16px; margin-bottom:12px; border:1px solid var(--border-subtle); cursor:pointer; transition:all 0.2s; }' +
      '.ex-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,0.3); border-color:var(--border-gold); }' +
      '.ex-modal { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); backdrop-filter:blur(15px); z-index:1000; display:flex; justify-content:center; align-items:center; padding:15px; }' +
      '.ex-modal-content { background:var(--bg-secondary); padding:28px; border-radius:24px; width:100%; max-width:600px; max-height:90vh; overflow-y:auto; border:1px solid var(--border-gold); box-shadow:0 0 40px rgba(212,175,55,0.2); }' +
      '.hint { font-size:0.75em; opacity:0.6; margin-top:3px; }' +
      '.cat-btn { padding:8px 14px; font-size:0.85em; border:1px solid var(--border-subtle); border-radius:8px; cursor:pointer; transition:all 0.2s; background:var(--bg-card); color:var(--text-secondary); display:inline-flex; align-items:center; gap:6px; }' +
      '.cat-btn.active { background:linear-gradient(135deg, var(--accent-gold), var(--accent-gold-light)); color:#000; border-color:var(--accent-gold); font-weight:600; }' +
      '.cat-btn:not(.active):hover { background:rgba(255,255,255,0.08); color:var(--text-primary); }' +
      '.stars { color:var(--accent-gold); letter-spacing:2px; }' +
    '</style>';

    var toolbarHtml = '<div style="background:var(--bg-card);border-radius:12px;padding:14px;margin-bottom:16px;border:1px solid var(--border-subtle)">';
    toolbarHtml += '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px">';
    toolbarHtml += '<div style="font-weight:600;font-size:0.95em;display:flex;align-items:center;gap:8px"><i class="ph ph-folder" style="color:var(--accent-gold)"></i> Категории</div>';
    toolbarHtml += '<button class="btn btn-primary" style="padding:8px 16px;font-size:0.85em" onclick="ExercisesModule.openCategoryForm()"><i class="ph ph-plus"></i> Добавить</button>';
    toolbarHtml += '</div>';
    toolbarHtml += '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">';
    toolbarHtml += '<button class="cat-btn ' + (this.currentFilter === 'all' ? 'active' : '') + '" onclick="ExercisesModule.setFilter(\'all\')"><i class="ph ph-squares-four"></i> Все</button>';
    toolbarHtml += '<button class="cat-btn ' + (this.currentFilter === 'uncategorized' ? 'active' : '') + '" onclick="ExercisesModule.setFilter(\'uncategorized\')"><i class="ph ph-question"></i> Без категории</button>';
    for (var i = 0; i < categories.length; i++) {
      toolbarHtml += '<button class="cat-btn ' + (this.currentFilter === categories[i] ? 'active' : '') + '" onclick="ExercisesModule.setFilter(\'' + categories[i].replace(/'/g, "\\'") + '\')" title="Фильтр: ' + categories[i] + '"><i class="ph ph-tag"></i> ' + categories[i] + '</button>';
    }
    toolbarHtml += '</div>';
    toolbarHtml += '<div class="hint" style="margin-top:8px;display:flex;align-items:center;gap:6px"><i class="ph ph-info"></i> Кликни на категорию для фильтрации. Выбрав её, справа появятся кнопки редактирования и удаления.</div>';
    toolbarHtml += '</div>';

    var isRegular = this.currentFilter !== 'all' && this.currentFilter !== 'uncategorized';
    if (isRegular) {
      toolbarHtml = toolbarHtml.replace('</div></div>', '<div style="display:flex;gap:6px;margin-top:10px"><button class="btn btn-secondary" style="padding:6px 12px;font-size:0.8em" onclick="ExercisesModule.openCategoryForm(\'' + this.currentFilter.replace(/'/g, "\\'") + '\')"><i class="ph ph-pencil-simple"></i> Редактировать</button><button class="btn btn-danger" style="padding:6px 12px;font-size:0.8em" onclick="ExercisesModule.deleteCategory(\'' + this.currentFilter.replace(/'/g, "\\'") + '\')"><i class="ph ph-trash"></i> Удалить</button></div></div></div>');
    }

    var listHtml = '';
    if (filtered.length === 0) {
      listHtml = '<div style="text-align:center;padding:40px;opacity:0.6"><i class="ph ph-books" style="font-size:3em;color:var(--accent-gold);margin-bottom:10px;display:block"></i><p>База пуста. Добавь первое упражнение!</p></div>';
    } else {
      for (var i = 0; i < filtered.length; i++) {
        var ex = filtered[i];
        var diff = ex.difficulty || 3;
        var eff = ex.effectiveness || 3;
        listHtml += '<div class="ex-card" onclick="ExercisesModule.viewExercise(\'' + ex.id + '\')">';
        listHtml += '<div style="display:flex;justify-content:space-between;align-items:start">';
        listHtml += '<div style="flex:1">';
        listHtml += '<h4 style="margin:0 0 6px 0;color:var(--accent-gold);font-size:1.05em;display:flex;align-items:center;gap:8px">' + ex.name;
        if (ex.videoUrl) listHtml += '<i class="ph ph-video-camera" style="color:var(--accent-neon)"></i>';
        if (ex.imageUrl) listHtml += '<i class="ph ph-image" style="color:var(--accent-neon)"></i>';
        listHtml += '</h4>';
        listHtml += '<div style="font-size:0.85em;opacity:0.7;margin-bottom:6px;display:flex;align-items:center;gap:6px"><i class="ph ph-tag" style="font-size:0.9em"></i> ' + (ex.muscleGroup || 'Без категории') + '</div>';
        listHtml += '<div style="font-size:0.8em;opacity:0.7;display:flex;gap:16px;flex-wrap:wrap">';
        listHtml += '<span style="display:flex;align-items:center;gap:4px"><i class="ph ph-fire" style="color:var(--accent-warning)"></i> Сложность: ' + this.renderStars(diff) + '</span>';
        listHtml += '<span style="display:flex;align-items:center;gap:4px"><i class="ph ph-target" style="color:var(--accent-success)"></i> Эффективность: ' + this.renderStars(eff) + '</span>';
        listHtml += '</div>';
        listHtml += '</div>';
        listHtml += '<div style="display:flex;gap:6px;margin-left:10px">';
        listHtml += '<button class="btn btn-secondary" style="padding:6px 10px;font-size:0.85em" onclick="event.stopPropagation();ExercisesModule.editExercise(\'' + ex.id + '\')"><i class="ph ph-pencil-simple"></i></button>';
        listHtml += '<button class="btn btn-danger" style="padding:6px 10px;font-size:0.85em" onclick="event.stopPropagation();ExercisesModule.deleteExercise(\'' + ex.id + '\')"><i class="ph ph-trash"></i></button>';
        listHtml += '</div></div></div>';
      }
    }

    screen.innerHTML = css +
      '<div style="padding:16px;max-width:700px;margin:0 auto">' +
        '<h2 style="font-family:var(--font-display);font-size:2em;margin-bottom:20px;color:var(--accent-gold);display:flex;align-items:center;gap:12px"><i class="ph ph-books"></i> База упражнений</h2>' +
        '<button class="btn btn-primary" style="width:100%;padding:14px;font-size:1em;font-weight:600;margin-bottom:20px" onclick="ExercisesModule.openExForm()"><i class="ph ph-plus-circle"></i> Добавить упражнение</button>' +
        toolbarHtml + listHtml +
      '</div>';
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
        '<h2 style="font-family:var(--font-display);color:var(--accent-gold);margin-top:0;display:flex;align-items:center;gap:10px">' + (isEdit ? '<i class="ph ph-pencil-simple"></i> Редактировать категорию' : '<i class="ph ph-plus-circle"></i> Новая категория') + '</h2>' +
        '<div style="margin-bottom:16px">' +
          '<label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.9em">Название:</label>' +
          '<input type="text" id="catName" value="' + (isEdit ? oldName : '') + '" placeholder="Например: Грудь, Спина" style="width:100%;padding:10px;background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary);font-size:1em">' +
          '<div class="hint" style="display:flex;align-items:center;gap:4px;margin-top:4px"><i class="ph ph-info"></i> Короткое название группы мышц</div>' +
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
    if (!newName) { alert('Введи название категории'); return; }
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
    } else {
      categories.push(newName);
    }
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

  openExForm: function(id) {
    this.editingId = id || null;
    var db = this.getDB();
    var categories = this.getCategories();
    var ex = null;
    for (var i = 0; i < db.length; i++) if (db[i].id === id) { ex = db[i]; break; }
    if (!ex) ex = this.getDefaultExercise();

    var optionsHtml = '<option value="">Без категории</option>';
    for (var i = 0; i < categories.length; i++) {
      optionsHtml += '<option value="' + categories[i] + '" ' + (ex.muscleGroup === categories[i] ? 'selected' : '') + '>' + categories[i] + '</option>';
    }

    var modal = document.createElement('div');
    modal.className = 'ex-modal';
    modal.id = 'exFormModal';
    modal.innerHTML =
      '<div class="ex-modal-content">' +
        '<button style="float:right;background:transparent;border:none;color:var(--text-secondary);font-size:1.5em;cursor:pointer" onclick="document.getElementById(\'exFormModal\').remove()"><i class="ph ph-x"></i></button>' +
        '<h2 style="font-family:var(--font-display);color:var(--accent-gold);margin-top:0;display:flex;align-items:center;gap:10px">' + (id ? '<i class="ph ph-pencil-simple"></i> Редактирование' : '<i class="ph ph-plus-circle"></i> Новое упражнение') + '</h2>' +
        '<div style="margin-bottom:14px"><label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.9em">Название: <span style="color:var(--accent-error)">*</span></label>' +
          '<input type="text" id="exName" value="' + ex.name + '" placeholder="Например: Отжимания от пола" style="width:100%;padding:10px;background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary);font-size:1em"></div>' +
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
          '<input type="text" id="exImage" value="' + ex.imageUrl + '" placeholder="https://example.com/image.jpg" style="width:100%;padding:10px;background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary);font-size:1em">' +
          '<div class="hint" style="display:flex;align-items:center;gap:4px;margin-top:4px"><i class="ph ph-info"></i> Прямая ссылка на изображение</div></div>' +
        '<div style="margin-bottom:14px"><label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.9em"><i class="ph ph-video-camera"></i> Видео (URL):</label>' +
          '<input type="text" id="exVideo" value="' + ex.videoUrl + '" placeholder="YouTube, VK, Rutube..." style="width:100%;padding:10px;background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary);font-size:1em"></div>' +
        '<div style="margin-bottom:14px"><label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.9em"><i class="ph ph-backpack"></i> Инвентарь:</label>' +
          '<input type="text" id="exInventory" value="' + ex.inventory + '" placeholder="гантели 10кг, коврик..." style="width:100%;padding:10px;background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary);font-size:1em">' +
          '<div class="hint" style="display:flex;align-items:center;gap:4px;margin-top:4px"><i class="ph ph-info"></i> Что понадобится</div></div>' +
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
      for (var i = 0; i < db.length; i++) if (db[i].id === this.editingId) { db[i] = Object.assign({}, db[i], exData); break; }
    } else {
      exData.id = 'ex_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      exData.createdAt = Date.now();
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

  viewExercise: function(id) {
    var db = this.getDB();
    var ex = null;
    for (var i = 0; i < db.length; i++) if (db[i].id === id) { ex = db[i]; break; }
    if (!ex) return;

    var imageHtml = '';
    if (ex.imageUrl) {
      imageHtml = '<div style="background:var(--bg-primary);padding:14px;border-radius:12px;margin:12px 0"><h3 style="color:var(--accent-gold);margin:0 0 10px 0;display:flex;align-items:center;gap:8px"><i class="ph ph-image"></i> Изображение</h3>' +
        '<img src="' + ex.imageUrl + '" alt="' + ex.name + '" style="width:100%;border-radius:8px;max-height:300px;object-fit:cover" onerror="this.parentElement.innerHTML=\'<em style="opacity:0.6">Не удалось загрузить изображение</em>\'"></div>';
    }
    var videoHtml = '';
    if (ex.videoUrl) {
      videoHtml = '<div style="background:var(--bg-primary);padding:14px;border-radius:12px;margin:12px 0"><h3 style="color:var(--accent-gold);margin:0 0 10px 0;display:flex;align-items:center;gap:8px"><i class="ph ph-video-camera"></i> Видео</h3>' +
        '<a href="' + ex.videoUrl + '" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;background:var(--bg-card);border-radius:8px;color:var(--accent-neon);text-decoration:none;font-weight:500"><i class="ph ph-play-circle" style="font-size:1.2em"></i> Открыть видео</a></div>';
    }

    var modal = document.createElement('div');
    modal.className = 'ex-modal';
    modal.id = 'exViewModal';
    modal.innerHTML =
      '<div class="ex-modal-content">' +
        '<button style="float:right;background:transparent;border:none;color:var(--text-secondary);font-size:1.5em;cursor:pointer" onclick="document.getElementById(\'exViewModal\').remove()"><i class="ph ph-x"></i></button>' +
        '<h2 style="font-family:var(--font-display);color:var(--accent-gold);margin-top:0">' + ex.name + '</h2>' +
        '<div style="font-size:0.9em;opacity:0.7;margin-bottom:12px;display:flex;align-items:center;gap:6px"><i class="ph ph-tag"></i> ' + (ex.muscleGroup || 'Без категории') + '</div>' +
        '<div style="display:flex;gap:20px;margin-bottom:16px;font-size:0.9em;flex-wrap:wrap">' +
          '<div style="display:flex;align-items:center;gap:6px"><i class="ph ph-fire" style="color:var(--accent-warning)"></i> Сложность: ' + this.renderStars(ex.difficulty || 3) + '</div>' +
          '<div style="display:flex;align-items:center;gap:6px"><i class="ph ph-target" style="color:var(--accent-success)"></i> Эффективность: ' + this.renderStars(ex.effectiveness || 3) + '</div>' +
        '</div>' +
        (ex.inventory ? '<div style="background:var(--bg-primary);padding:12px;border-radius:10px;margin:12px 0;display:flex;align-items:start;gap:8px"><i class="ph ph-backpack" style="color:var(--accent-gold);font-size:1.1em;margin-top:2px"></i><div><strong>Инвентарь:</strong> ' + ex.inventory + '</div></div>' : '') +
        (ex.description ? '<div style="background:var(--bg-primary);padding:14px;border-radius:10px;margin:12px 0"><h3 style="color:var(--accent-gold);margin:0 0 10px 0;display:flex;align-items:center;gap:8px"><i class="ph ph-text-t"></i> Описание</h3><p style="white-space:pre-wrap;margin:0;line-height:1.6">' + ex.description + '</p></div>' : '') +
        imageHtml + videoHtml +
        (ex.notes ? '<div style="background:var(--bg-primary);padding:14px;border-radius:10px;margin:12px 0;border-left:3px solid var(--accent-gold)"><h3 style="color:var(--accent-gold);margin:0 0 10px 0;display:flex;align-items:center;gap:8px"><i class="ph ph-push-pin"></i> Заметки</h3><p style="white-space:pre-wrap;margin:0;line-height:1.6">' + ex.notes + '</p></div>' : '') +
        '<div style="display:flex;gap:10px;margin-top:20px">' +
          '<button class="btn btn-secondary" onclick="document.getElementById(\'exViewModal\').remove()">Закрыть</button>' +
          '<button class="btn btn-primary" onclick="document.getElementById(\'exViewModal\').remove();ExercisesModule.editExercise(\'' + ex.id + '\')"><i class="ph ph-pencil-simple"></i> Редактировать</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
  }
};

window.ExercisesModule = ExercisesModule;
module.exports = ExercisesModule;