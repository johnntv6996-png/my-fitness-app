// modules/exercises.js

const ExercisesModule = {
  editingId: null,
  currentFilter: 'all',

  init: function() {
    console.log('📚 Exercises module initialized');
    if (typeof Logger !== 'undefined') Logger.log('Модуль базы упражнений инициализирован', 'info');
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { ExercisesModule.setup(); });
    } else { this.setup(); }
  },

  setup: function() {
    this.createExercisesScreen();
    if (typeof Core !== 'undefined') Core.addNavButton('База', 'exercises', '📚');
  },

  getDB: function() {
    if (typeof FTStorage !== 'undefined') return FTStorage.get('db') || [];
    return [];
  },
  saveDB: function(db) {
    if (typeof FTStorage !== 'undefined') FTStorage.set('db', db);
  },
  getCategories: function() {
    if (typeof FTStorage !== 'undefined') return FTStorage.get('categories') || [];
    return [];
  },
  saveCategories: function(c) {
    if (typeof FTStorage !== 'undefined') FTStorage.set('categories', c);
  },

  getDefaultExercise: function() {
    return { name: '', muscleGroup: '', description: '', videoUrl: '', imageUrl: '', notes: '', inventory: '', difficulty: 3, effectiveness: 3 };
  },

  renderStars: function(count) {
    var s = '';
    for (var i = 1; i <= 5; i++) s += i <= count ? '★' : '☆';
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
      '.ex-card { background:var(--card); border-radius:8px; padding:12px; margin-bottom:10px; border-left:3px solid var(--acc); cursor:pointer; transition:all 0.2s; }' +
      '.ex-card:hover { transform:translateY(-2px); box-shadow:0 4px 12px rgba(0,0,0,0.3); }' +
      '.ex-modal { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:1000; display:flex; justify-content:center; align-items:center; padding:15px; }' +
      '.ex-modal-content { background:var(--card); padding:20px; border-radius:12px; width:100%; max-width:600px; max-height:90vh; overflow-y:auto; }' +
      '.hint { font-size:0.75em; opacity:0.6; margin-top:3px; }' +
      '.cat-btn { padding:6px 12px; font-size:0.85em; border:none; border-radius:6px; cursor:pointer; transition:all 0.2s; }' +
      '.cat-btn.active { background:var(--acc); color:#2c3e50; font-weight:700; }' +
      '.cat-btn:not(.active) { background:var(--brd); color:var(--text); }' +
      '.stars { color:var(--acc); letter-spacing:2px; }' +
    '</style>';

    // Тулбар
    var toolbarHtml = '<div style="background:var(--card);border-radius:8px;padding:10px;margin-bottom:15px;border:1px solid var(--brd)">';
    toolbarHtml += '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">';
    toolbarHtml += '<div style="display:flex;gap:5px;flex-wrap:wrap;flex:1">';
    toolbarHtml += '<button class="cat-btn ' + (this.currentFilter === 'all' ? 'active' : '') + '" onclick="ExercisesModule.setFilter(\'all\')">Все</button>';
    toolbarHtml += '<button class="cat-btn ' + (this.currentFilter === 'uncategorized' ? 'active' : '') + '" onclick="ExercisesModule.setFilter(\'uncategorized\')">❓ Без категории</button>';
    for (var i = 0; i < categories.length; i++) {
      toolbarHtml += '<button class="cat-btn ' + (this.currentFilter === categories[i] ? 'active' : '') + '" onclick="ExercisesModule.setFilter(\'' + categories[i].replace(/'/g, "\\'") + '\')" title="Фильтр: ' + categories[i] + '">' + categories[i] + '</button>';
    }
    toolbarHtml += '</div>';
    toolbarHtml += '<div style="display:flex;gap:5px;align-items:center">';
    var isRegular = this.currentFilter !== 'all' && this.currentFilter !== 'uncategorized';
    if (isRegular) {
      toolbarHtml += '<button class="btn" style="padding:6px 10px;font-size:0.8em;background:var(--brd);color:var(--text);border:none;border-radius:6px;cursor:pointer" onclick="ExercisesModule.openCategoryForm(\'' + this.currentFilter.replace(/'/g, "\\'") + '\')" title="Редактировать">✏️</button>';
      toolbarHtml += '<button class="btn" style="padding:6px 10px;font-size:0.8em;background:#e74c3c;color:#fff;border:none;border-radius:6px;cursor:pointer" onclick="ExercisesModule.deleteCategory(\'' + this.currentFilter.replace(/'/g, "\\'") + '\')" title="Удалить">🗑️</button>';
    } else {
      toolbarHtml += '<span style="font-size:0.75em;opacity:0.5;margin-right:5px">Выбери категорию</span>';
    }
    toolbarHtml += '<button class="btn" style="padding:6px 12px;font-size:0.8em;background:var(--acc);color:#2c3e50;border:none;border-radius:6px;cursor:pointer;font-weight:700" onclick="ExercisesModule.openCategoryForm()">➕ Добавить</button>';
    toolbarHtml += '</div></div>';
    toolbarHtml += '<div class="hint" style="margin-top:6px">💡 Кликни на категорию для фильтрации. Выбрав её, справа появятся ✏️ и 🗑️.</div>';
    toolbarHtml += '</div>';

    // Список
    var listHtml = '';
    if (filtered.length === 0) {
      listHtml = '<div style="text-align:center;padding:30px;opacity:0.6"><div style="font-size:3em;margin-bottom:10px">📚</div><p>База пуста. Добавь первое упражнение!</p></div>';
    } else {
      for (var i = 0; i < filtered.length; i++) {
        var ex = filtered[i];
        var diff = ex.difficulty || 3;
        var eff = ex.effectiveness || 3;
        listHtml += '<div class="ex-card" onclick="ExercisesModule.viewExercise(\'' + ex.id + '\')">';
        listHtml += '<div style="display:flex;justify-content:space-between;align-items:start">';
        listHtml += '<div style="flex:1">';
        listHtml += '<h4 style="margin:0 0 5px 0;color:var(--acc)">' + ex.name;
        if (ex.videoUrl) listHtml += ' 📺';
        if (ex.imageUrl) listHtml += ' 🖼️';
        listHtml += '</h4>';
        listHtml += '<div style="font-size:0.8em;opacity:0.7;margin-bottom:5px">' + (ex.muscleGroup || '❓ Без категории') + '</div>';
        listHtml += '<div style="font-size:0.75em;opacity:0.6">Сложность: <span class="stars">' + this.renderStars(diff) + '</span> · Эффективность: <span class="stars">' + this.renderStars(eff) + '</span></div>';
        listHtml += '</div>';
        listHtml += '<div style="display:flex;gap:5px;margin-left:10px">';
        listHtml += '<button class="btn" style="padding:4px 8px;font-size:0.8em;background:var(--brd);color:var(--text);border:none;border-radius:4px;cursor:pointer" onclick="event.stopPropagation();ExercisesModule.editExercise(\'' + ex.id + '\')">✏️</button>';
        listHtml += '<button class="btn" style="padding:4px 8px;font-size:0.8em;background:#e74c3c;color:#fff;border:none;border-radius:4px;cursor:pointer" onclick="event.stopPropagation();ExercisesModule.deleteExercise(\'' + ex.id + '\')">🗑️</button>';
        listHtml += '</div></div></div>';
      }
    }

    screen.innerHTML = css +
      '<div style="padding:15px;max-width:600px;margin:0 auto">' +
        '<h2 style="color:var(--acc);margin-top:0">📚 База упражнений</h2>' +
        '<button class="btn" style="width:100%;padding:12px;font-size:1em;font-weight:700;background:linear-gradient(135deg, var(--acc) 0%, #FFF8DC 100%);color:#3a2a0a;border:1px solid var(--acc);border-radius:8px;cursor:pointer;margin-bottom:15px" onclick="ExercisesModule.openExForm()">➕ Добавить упражнение</button>' +
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
        '<button style="float:right;background:transparent;border:none;color:var(--text);font-size:1.5em;cursor:pointer" onclick="document.getElementById(\'catFormModal\').remove()">×</button>' +
        '<h2 style="color:var(--acc);margin-top:0">' + (isEdit ? '✏️ Редактировать категорию' : '➕ Новая категория') + '</h2>' +
        '<div style="margin-bottom:12px">' +
          '<label style="display:block;margin-bottom:5px;font-weight:600">Название:</label>' +
          '<input type="text" id="catName" value="' + (isEdit ? oldName : '') + '" placeholder="Например: Грудь, Спина" style="width:100%;padding:8px;background:var(--inp);border:1px solid var(--brd);border-radius:6px;color:var(--text);font-size:1em">' +
          '<div class="hint">💡 Короткое название группы мышц</div>' +
        '</div>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">' +
          '<button class="btn" style="padding:10px 20px;background:var(--brd);color:var(--text);border:none;border-radius:6px;cursor:pointer" onclick="document.getElementById(\'catFormModal\').remove()">Отмена</button>' +
          '<button class="btn" style="padding:10px 20px;background:var(--ok);color:#2c3e50;border:none;border-radius:6px;cursor:pointer;font-weight:700" onclick="ExercisesModule.saveCategory(\'' + (isEdit ? oldName : '') + '\')">💾 Сохранить</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
  },

  saveCategory: function(oldName) {
    var newName = document.getElementById('catName').value.trim();
    if (!newName) { alert('⚠️ Введи название категории'); return; }
    var categories = this.getCategories();
    for (var i = 0; i < categories.length; i++) {
      if (categories[i] === newName && categories[i] !== oldName) { alert('⚠️ Такая категория уже существует'); return; }
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
    if (!confirm('🗑️ Удалить категорию "' + name + '"?\n\nУпражнения станут "Без категории".')) return;
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

    var optionsHtml = '<option value="">❓ Без категории</option>';
    for (var i = 0; i < categories.length; i++) {
      optionsHtml += '<option value="' + categories[i] + '" ' + (ex.muscleGroup === categories[i] ? 'selected' : '') + '>' + categories[i] + '</option>';
    }

    var modal = document.createElement('div');
    modal.className = 'ex-modal';
    modal.id = 'exFormModal';
    modal.innerHTML =
      '<div class="ex-modal-content">' +
        '<button style="float:right;background:transparent;border:none;color:var(--text);font-size:1.5em;cursor:pointer" onclick="document.getElementById(\'exFormModal\').remove()">×</button>' +
        '<h2 style="color:var(--acc);margin-top:0">' + (id ? '✏️ Редактирование' : '➕ Новое упражнение') + '</h2>' +
        '<div style="margin-bottom:12px"><label style="display:block;margin-bottom:5px;font-weight:600">Название: <span style="color:#e74c3c">*</span></label>' +
          '<input type="text" id="exName" value="' + ex.name + '" placeholder="Например: Отжимания от пола" style="width:100%;padding:8px;background:var(--inp);border:1px solid var(--brd);border-radius:6px;color:var(--text);font-size:1em"></div>' +
        '<div style="margin-bottom:12px"><label style="display:block;margin-bottom:5px;font-weight:600">Категория:</label>' +
          '<select id="exMuscleGroup" style="width:100%;padding:8px;background:var(--inp);border:1px solid var(--brd);border-radius:6px;color:var(--text);font-size:1em">' + optionsHtml + '</select></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">' +
          '<div><label style="display:block;margin-bottom:5px;font-weight:600">⭐ Сложность:</label>' +
            '<select id="exDifficulty" style="width:100%;padding:8px;background:var(--inp);border:1px solid var(--brd);border-radius:6px;color:var(--text);font-size:1em">' +
            '<option value="1" ' + (ex.difficulty==1?'selected':'') + '>1 — Очень легко</option>' +
            '<option value="2" ' + (ex.difficulty==2?'selected':'') + '>2 — Легко</option>' +
            '<option value="3" ' + (ex.difficulty==3?'selected':'') + '>3 — Средне</option>' +
            '<option value="4" ' + (ex.difficulty==4?'selected':'') + '>4 — Сложно</option>' +
            '<option value="5" ' + (ex.difficulty==5?'selected':'') + '>5 — Очень сложно</option></select></div>' +
          '<div><label style="display:block;margin-bottom:5px;font-weight:600">🎯 Эффективность:</label>' +
            '<select id="exEffectiveness" style="width:100%;padding:8px;background:var(--inp);border:1px solid var(--brd);border-radius:6px;color:var(--text);font-size:1em">' +
            '<option value="1" ' + (ex.effectiveness==1?'selected':'') + '>1 — Низкая</option>' +
            '<option value="2" ' + (ex.effectiveness==2?'selected':'') + '>2 — Ниже среднего</option>' +
            '<option value="3" ' + (ex.effectiveness==3?'selected':'') + '>3 — Средняя</option>' +
            '<option value="4" ' + (ex.effectiveness==4?'selected':'') + '>4 — Высокая</option>' +
            '<option value="5" ' + (ex.effectiveness==5?'selected':'') + '>5 — Максимальная</option></select></div>' +
        '</div>' +
        '<div style="margin-bottom:12px"><label style="display:block;margin-bottom:5px;font-weight:600">📝 Описание:</label>' +
          '<textarea id="exDescription" rows="3" placeholder="Техника выполнения..." style="width:100%;padding:8px;background:var(--inp);border:1px solid var(--brd);border-radius:6px;color:var(--text);font-size:1em;resize:vertical">' + ex.description + '</textarea></div>' +
        '<div style="margin-bottom:12px"><label style="display:block;margin-bottom:5px;font-weight:600">🖼️ Картинка (URL):</label>' +
          '<input type="text" id="exImage" value="' + ex.imageUrl + '" placeholder="https://example.com/image.jpg" style="width:100%;padding:8px;background:var(--inp);border:1px solid var(--brd);border-radius:6px;color:var(--text);font-size:1em">' +
          '<div class="hint">💡 Прямая ссылка на изображение</div></div>' +
        '<div style="margin-bottom:12px"><label style="display:block;margin-bottom:5px;font-weight:600">📺 Видео (URL):</label>' +
          '<input type="text" id="exVideo" value="' + ex.videoUrl + '" placeholder="YouTube, VK, Rutube..." style="width:100%;padding:8px;background:var(--inp);border:1px solid var(--brd);border-radius:6px;color:var(--text);font-size:1em"></div>' +
        '<div style="margin-bottom:12px"><label style="display:block;margin-bottom:5px;font-weight:600">🎒 Инвентарь:</label>' +
          '<input type="text" id="exInventory" value="' + ex.inventory + '" placeholder="гантели 10кг, коврик..." style="width:100%;padding:8px;background:var(--inp);border:1px solid var(--brd);border-radius:6px;color:var(--text);font-size:1em">' +
          '<div class="hint">💡 Что понадобится</div></div>' +
        '<div style="margin-bottom:12px"><label style="display:block;margin-bottom:5px;font-weight:600">📌 Заметки:</label>' +
          '<textarea id="exNotes" rows="2" placeholder="Личные заметки..." style="width:100%;padding:8px;background:var(--inp);border:1px solid var(--brd);border-radius:6px;color:var(--text);font-size:1em;resize:vertical">' + ex.notes + '</textarea></div>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">' +
          '<button class="btn" style="padding:10px 20px;background:var(--brd);color:var(--text);border:none;border-radius:6px;cursor:pointer" onclick="document.getElementById(\'exFormModal\').remove()">Отмена</button>' +
          '<button class="btn" style="padding:10px 20px;background:var(--ok);color:#2c3e50;border:none;border-radius:6px;cursor:pointer;font-weight:700" onclick="ExercisesModule.saveExercise()">💾 Сохранить</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
  },

  saveExercise: function() {
    var name = document.getElementById('exName').value.trim();
    if (!name) { alert('⚠️ Укажи название'); return; }
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
    if (!confirm('🗑️ Удалить упражнение?')) return;
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
      imageHtml = '<div style="background:var(--inp);padding:12px;border-radius:8px;margin:10px 0"><h3 style="color:var(--acc);margin:0 0 10px 0">🖼️ Изображение</h3>' +
        '<img src="' + ex.imageUrl + '" alt="' + ex.name + '" style="width:100%;border-radius:6px;max-height:300px;object-fit:cover" onerror="this.parentElement.innerHTML=\'<em>Не удалось загрузить изображение</em>\'"></div>';
    }
    var videoHtml = '';
    if (ex.videoUrl) {
      videoHtml = '<div style="background:var(--inp);padding:12px;border-radius:8px;margin:10px 0"><h3 style="color:var(--acc);margin:0 0 10px 0">📺 Видео</h3>' +
        '<a href="' + ex.videoUrl + '" target="_blank" style="display:block;padding:15px;background:var(--bg);border-radius:6px;color:var(--lnk);text-decoration:none;text-align:center">▶️ Открыть видео</a></div>';
    }

    var modal = document.createElement('div');
    modal.className = 'ex-modal';
    modal.id = 'exViewModal';
    modal.innerHTML =
      '<div class="ex-modal-content">' +
        '<button style="float:right;background:transparent;border:none;color:var(--text);font-size:1.5em;cursor:pointer" onclick="document.getElementById(\'exViewModal\').remove()">×</button>' +
        '<h2 style="color:var(--acc);margin-top:0">' + ex.name + '</h2>' +
        '<div style="font-size:0.9em;opacity:0.7;margin-bottom:10px">' + (ex.muscleGroup || '❓ Без категории') + '</div>' +
        '<div style="display:flex;gap:15px;margin-bottom:15px;font-size:0.9em">' +
          '<div>Сложность: <span class="stars">' + this.renderStars(ex.difficulty || 3) + '</span></div>' +
          '<div>Эффективность: <span class="stars">' + this.renderStars(ex.effectiveness || 3) + '</span></div>' +
        '</div>' +
        (ex.inventory ? '<div style="background:var(--inp);padding:10px;border-radius:8px;margin:10px 0"><strong>🎒 Инвентарь:</strong> ' + ex.inventory + '</div>' : '') +
        (ex.description ? '<div style="background:var(--inp);padding:12px;border-radius:8px;margin:10px 0"><h3 style="color:var(--acc);margin:0 0 10px 0">📝 Описание</h3><p style="white-space:pre-wrap;margin:0">' + ex.description + '</p></div>' : '') +
        imageHtml + videoHtml +
        (ex.notes ? '<div style="background:var(--inp);padding:12px;border-radius:8px;margin:10px 0"><h3 style="color:var(--acc);margin:0 0 10px 0">📌 Заметки</h3><p style="white-space:pre-wrap;margin:0">' + ex.notes + '</p></div>' : '') +
        '<div style="display:flex;gap:10px;margin-top:15px">' +
          '<button class="btn" style="padding:10px 20px;background:var(--brd);color:var(--text);border:none;border-radius:6px;cursor:pointer" onclick="document.getElementById(\'exViewModal\').remove()">Закрыть</button>' +
          '<button class="btn" style="padding:10px 20px;background:var(--acc);color:#2c3e50;border:none;border-radius:6px;cursor:pointer;font-weight:700" onclick="document.getElementById(\'exViewModal\').remove();ExercisesModule.editExercise(\'' + ex.id + '\')">✏️ Редактировать</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
  }
};

window.ExercisesModule = ExercisesModule;
module.exports = ExercisesModule;