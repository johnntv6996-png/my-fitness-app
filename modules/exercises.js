// modules/exercises.js

const ExercisesModule = {
  editingId: null,
  currentFilter: 'all',

  init: function() {
    console.log('📚 Exercises module initialized');
    if (typeof Logger !== 'undefined') Logger.log('Модуль базы упражнений инициализирован', 'info');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { ExercisesModule.setup(); });
    } else {
      this.setup();
    }
  },

  setup: function() {
    this.createExercisesScreen();
    
    if (typeof Core !== 'undefined') {
      Core.addNavButton('База', 'exercises', '📚');
    }
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

  saveCategories: function(categories) {
    if (typeof FTStorage !== 'undefined') FTStorage.set('categories', categories);
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
      for (var i = 0; i < db.length; i++) {
        if (!db[i].muscleGroup || db[i].muscleGroup === '') filtered.push(db[i]);
      }
    } else if (this.currentFilter !== 'all') {
      filtered = [];
      for (var i = 0; i < db.length; i++) {
        if (db[i].muscleGroup === this.currentFilter) filtered.push(db[i]);
      }
    }

    var css = '<style>' +
      '.ex-card { background:var(--card); border-radius:8px; padding:12px; margin-bottom:10px; border-left:3px solid var(--acc); cursor:pointer; transition:all 0.2s; }' +
      '.ex-card:hover { transform:translateY(-2px); box-shadow:0 4px 12px rgba(0,0,0,0.3); }' +
      '.ex-modal { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:1000; display:flex; justify-content:center; align-items:center; padding:15px; }' +
      '.ex-modal-content { background:var(--card); padding:20px; border-radius:12px; width:100%; max-width:600px; max-height:90vh; overflow-y:auto; }' +
      '.hint { font-size:0.75em; opacity:0.6; margin-top:3px; }' +
      '.cat-btn { padding:6px 12px; font-size:0.85em; border:none; border-radius:6px; cursor:pointer; transition:all 0.2s; }' +
      '.cat-btn:hover { transform:translateY(-1px); }' +
      '.cat-btn.active { background:var(--acc); color:#2c3e50; font-weight:700; }' +
      '.cat-btn:not(.active) { background:var(--brd); color:var(--text); }' +
      '.cat-edit-btn { padding:4px 8px; font-size:0.75em; background:transparent; border:1px solid var(--brd); border-radius:4px; cursor:pointer; color:var(--text); margin-left:4px; }' +
      '.cat-edit-btn:hover { background:var(--brd); }' +
      '.cat-delete-btn { padding:4px 8px; font-size:0.75em; background:transparent; border:1px solid #e74c3c; border-radius:4px; cursor:pointer; color:#e74c3c; margin-left:4px; }' +
      '.cat-delete-btn:hover { background:#e74c3c; color:#fff; }' +
    '</style>';

    // Тулбар категорий
    var toolbarHtml = '<div style="background:var(--card);border-radius:8px;padding:10px;margin-bottom:15px;border:1px solid var(--brd)">';
    toolbarHtml += '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">';
    
    // Левая часть: кнопки фильтрации
    toolbarHtml += '<div style="display:flex;gap:5px;flex-wrap:wrap;flex:1">';
    
    // Кнопка "Все"
    var isAll = this.currentFilter === 'all';
    toolbarHtml += '<button class="cat-btn ' + (isAll ? 'active' : '') + '" onclick="ExercisesModule.setFilter(\'all\')">Все</button>';
    
    // Кнопка "Без категории"
    var isUncat = this.currentFilter === 'uncategorized';
    toolbarHtml += '<button class="cat-btn ' + (isUncat ? 'active' : '') + '" onclick="ExercisesModule.setFilter(\'uncategorized\')">❓ Без категории</button>';
    
    // Кнопки категорий (только для фильтрации, без кнопок действий)
    for (var i = 0; i < categories.length; i++) {
      var isActive = this.currentFilter === categories[i];
      toolbarHtml += '<button class="cat-btn ' + (isActive ? 'active' : '') + '" onclick="ExercisesModule.setFilter(\'' + categories[i].replace(/'/g, "\\'") + '\')" title="Фильтр: ' + categories[i] + '">' + categories[i] + '</button>';
    }
    
    toolbarHtml += '</div>';
    
    // Правая часть: действия
    toolbarHtml += '<div style="display:flex;gap:5px;align-items:center">';
    
    // Кнопки редактирования и удаления (только если выбрана обычная категория)
    var isRegularCategory = this.currentFilter !== 'all' && this.currentFilter !== 'uncategorized';
    if (isRegularCategory) {
      toolbarHtml += '<button class="btn" style="padding:6px 10px;font-size:0.8em;background:var(--brd);color:var(--text);border:none;border-radius:6px;cursor:pointer" onclick="ExercisesModule.openCategoryForm(\'' + this.currentFilter.replace(/'/g, "\\'") + '\')" title="Редактировать: ' + this.currentFilter + '">✏️</button>';
      toolbarHtml += '<button class="btn" style="padding:6px 10px;font-size:0.8em;background:#e74c3c;color:#fff;border:none;border-radius:6px;cursor:pointer" onclick="ExercisesModule.deleteCategory(\'' + this.currentFilter.replace(/'/g, "\\'") + '\')" title="Удалить: ' + this.currentFilter + '">🗑️</button>';
    } else {
      toolbarHtml += '<span style="font-size:0.75em;opacity:0.5;margin-right:5px">Выбери категорию</span>';
    }
    
    // Кнопка добавления новой категории
    toolbarHtml += '<button class="btn" style="padding:6px 12px;font-size:0.8em;background:var(--acc);color:#2c3e50;border:none;border-radius:6px;cursor:pointer;font-weight:700" onclick="ExercisesModule.openCategoryForm()">➕ Добавить</button>';
    toolbarHtml += '</div>';
    
    toolbarHtml += '</div>';
    toolbarHtml += '<div class="hint" style="margin-top:6px">💡 Кликни на категорию для фильтрации. Выбрав её, справа появятся кнопки ✏️ и 🗑️. ➕ — создать новую категорию.</div>';
    toolbarHtml += '</div>';

    // Список упражнений
    var listHtml = '';
    if (filtered.length === 0) {
      if (this.currentFilter === 'uncategorized') {
        listHtml = '<div style="text-align:center;padding:30px;opacity:0.6"><div style="font-size:3em;margin-bottom:10px">❓</div><p>Нет упражнений без категории</p></div>';
      } else if (this.currentFilter !== 'all') {
        listHtml = '<div style="text-align:center;padding:30px;opacity:0.6"><div style="font-size:3em;margin-bottom:10px">📂</div><p>В этой категории пока нет упражнений</p></div>';
      } else {
        listHtml = '<div style="text-align:center;padding:30px;opacity:0.6"><div style="font-size:3em;margin-bottom:10px">📚</div><p>База пуста. Добавь первое упражнение!</p></div>';
      }
    } else {
      for (var i = 0; i < filtered.length; i++) {
        var ex = filtered[i];
        listHtml += '<div class="ex-card" onclick="ExercisesModule.viewExercise(\'' + ex.id + '\')">' +
          '<div style="display:flex;justify-content:space-between;align-items:start">' +
            '<div style="flex:1">' +
              '<h4 style="margin:0 0 5px 0;color:var(--acc)">' + ex.name + (ex.videoUrl ? ' 📺' : '') + '</h4>' +
              '<div style="font-size:0.8em;opacity:0.7;margin-bottom:5px">' + (ex.muscleGroup || '❓ Без категории') + '</div>' +
              (ex.description ? '<div style="font-size:0.85em;opacity:0.85">' + ex.description.substring(0, 100) + (ex.description.length > 100 ? '...' : '') + '</div>' : '') +
            '</div>' +
            '<div style="display:flex;gap:5px;margin-left:10px">' +
              '<button class="btn" style="padding:4px 8px;font-size:0.8em;background:var(--brd);color:var(--text);border:none;border-radius:4px;cursor:pointer" onclick="event.stopPropagation();ExercisesModule.editExercise(\'' + ex.id + '\')">✏️</button>' +
              '<button class="btn" style="padding:4px 8px;font-size:0.8em;background:#e74c3c;color:#fff;border:none;border-radius:4px;cursor:pointer" onclick="event.stopPropagation();ExercisesModule.deleteExercise(\'' + ex.id + '\')">🗑️</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }
    }

    screen.innerHTML = css +
      '<div style="padding:15px;max-width:600px;margin:0 auto">' +
        '<h2 style="color:var(--acc);margin-top:0">📚 База упражнений</h2>' +
        '<button class="btn" style="width:100%;padding:12px;font-size:1em;font-weight:700;background:linear-gradient(135deg, var(--acc) 0%, #FFF8DC 100%);color:#3a2a0a;border:1px solid var(--acc);border-radius:8px;cursor:pointer;margin-bottom:15px" onclick="ExercisesModule.openExForm()">➕ Добавить упражнение</button>' +
        toolbarHtml +
        listHtml +
      '</div>';
  },

  setFilter: function(filter) {
    this.currentFilter = filter;
    this.createExercisesScreen();
  },

  // === УПРАВЛЕНИЕ КАТЕГОРИЯМИ ===
  
  openCategoryForm: function(oldName) {
    var categories = this.getCategories();
    var isEdit = oldName ? true : false;
    
    var modal = document.createElement('div');
    modal.className = 'ex-modal';
    modal.id = 'catFormModal';
    modal.innerHTML =
      '<div class="ex-modal-content" style="max-width:400px">' +
        '<button style="float:right;background:transparent;border:none;color:var(--text);font-size:1.5em;cursor:pointer" onclick="document.getElementById(\'catFormModal\').remove()">×</button>' +
        '<h2 style="color:var(--acc);margin-top:0">' + (isEdit ? '✏️ Редактировать категорию' : '➕ Новая категория') + '</h2>' +
        '<div style="margin-bottom:12px">' +
          '<label style="display:block;margin-bottom:5px;font-weight:600">Название категории:</label>' +
          '<input type="text" id="catName" value="' + (isEdit ? oldName : '') + '" placeholder="Например: Грудь, Спина, Ноги..." style="width:100%;padding:8px;background:var(--inp);border:1px solid var(--brd);border-radius:6px;color:var(--text);font-size:1em">' +
          '<div class="hint">💡 Короткое название группы мышц или типа тренировки</div>' +
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
    
    // Проверка на дубликат
    for (var i = 0; i < categories.length; i++) {
      if (categories[i] === newName && categories[i] !== oldName) {
        alert('⚠️ Такая категория уже существует');
        return;
      }
    }
    
    if (oldName) {
      // Редактирование: переименовать
      for (var i = 0; i < categories.length; i++) {
        if (categories[i] === oldName) {
          categories[i] = newName;
          break;
        }
      }
      // Обновить все упражнения с этой категорией
      var db = this.getDB();
      for (var i = 0; i < db.length; i++) {
        if (db[i].muscleGroup === oldName) {
          db[i].muscleGroup = newName;
        }
      }
      this.saveDB(db);
      
      // Если сейчас фильтруем по старой категории, переключить на новую
      if (this.currentFilter === oldName) {
        this.currentFilter = newName;
      }
    } else {
      // Добавление новой
      categories.push(newName);
    }
    
    this.saveCategories(categories);
    document.getElementById('catFormModal').remove();
    this.createExercisesScreen();
  },

  deleteCategory: function(name) {
    if (!confirm('🗑️ Удалить категорию "' + name + '"?\n\nУпражнения из этой категории станут "Без категории".')) return;
    
    var categories = this.getCategories();
    var newCategories = [];
    for (var i = 0; i < categories.length; i++) {
      if (categories[i] !== name) newCategories.push(categories[i]);
    }
    this.saveCategories(newCategories);
    
    // Убрать категорию у всех упражнений
    var db = this.getDB();
    for (var i = 0; i < db.length; i++) {
      if (db[i].muscleGroup === name) {
        db[i].muscleGroup = '';
      }
    }
    this.saveDB(db);
    
    if (this.currentFilter === name) {
      this.currentFilter = 'all';
    }
    
    this.createExercisesScreen();
  },

  // === УПРАВЛЕНИЕ УПРАЖНЕНИЯМИ ===

  openExForm: function(id) {
    this.editingId = id || null;
    var db = this.getDB();
    var categories = this.getCategories();
    var ex = null;
    for (var i = 0; i < db.length; i++) {
      if (db[i].id === id) { ex = db[i]; break; }
    }

    // Строим options для combobox
    var optionsHtml = '<option value="">❓ Без категории</option>';
    for (var i = 0; i < categories.length; i++) {
      var selected = (ex && ex.muscleGroup === categories[i]) ? 'selected' : '';
      optionsHtml += '<option value="' + categories[i] + '" ' + selected + '>' + categories[i] + '</option>';
    }

    var modal = document.createElement('div');
    modal.className = 'ex-modal';
    modal.id = 'exFormModal';
    modal.innerHTML =
      '<div class="ex-modal-content">' +
        '<button style="float:right;background:transparent;border:none;color:var(--text);font-size:1.5em;cursor:pointer" onclick="document.getElementById(\'exFormModal\').remove()">×</button>' +
        '<h2 style="color:var(--acc);margin-top:0">' + (id ? '✏️ Редактирование' : '➕ Новое упражнение') + '</h2>' +
        
        '<div style="margin-bottom:12px">' +
          '<label style="display:block;margin-bottom:5px;font-weight:600">Название: <span style="color:#e74c3c">*</span></label>' +
          '<input type="text" id="exName" value="' + (ex ? ex.name : '') + '" placeholder="Например: Отжимания от пола" style="width:100%;padding:8px;background:var(--inp);border:1px solid var(--brd);border-radius:6px;color:var(--text);font-size:1em">' +
          '<div class="hint">💡 Короткое и понятное название упражнения</div>' +
        '</div>' +
        
        '<div style="margin-bottom:12px">' +
          '<label style="display:block;margin-bottom:5px;font-weight:600">Категория:</label>' +
          '<select id="exMuscleGroup" style="width:100%;padding:8px;background:var(--inp);border:1px solid var(--brd);border-radius:6px;color:var(--text);font-size:1em">' +
            optionsHtml +
          '</select>' +
          '<div class="hint">💡 Выбери категорию или оставь "Без категории". Категории управляются в тулбаре выше.</div>' +
        '</div>' +
        
        '<div style="margin-bottom:12px">' +
          '<label style="display:block;margin-bottom:5px;font-weight:600">Описание / техника:</label>' +
          '<textarea id="exDescription" rows="3" placeholder="Опиши правильное выполнение, на что обратить внимание..." style="width:100%;padding:8px;background:var(--inp);border:1px solid var(--brd);border-radius:6px;color:var(--text);font-size:1em;resize:vertical">' + (ex ? (ex.description || '') : '') + '</textarea>' +
          '<div class="hint">💡 Пошаговая инструкция или ключевые моменты</div>' +
        '</div>' +
        
        '<div style="margin-bottom:12px">' +
          '<label style="display:block;margin-bottom:5px;font-weight:600">Ссылка на видео:</label>' +
          '<input type="text" id="exVideo" value="' + (ex ? (ex.videoUrl || '') : '') + '" placeholder="https://youtube.com/watch?v=... или https://vk.com/video..." style="width:100%;padding:8px;background:var(--inp);border:1px solid var(--brd);border-radius:6px;color:var(--text);font-size:1em">' +
          '<div class="hint">💡 YouTube, VK Видео, Rutube, Vimeo или прямая ссылка на mp4</div>' +
        '</div>' +
        
        '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">' +
          '<button class="btn" style="padding:10px 20px;background:var(--brd);color:var(--text);border:none;border-radius:6px;cursor:pointer" onclick="document.getElementById(\'exFormModal\').remove()">Отмена</button>' +
          '<button class="btn" style="padding:10px 20px;background:var(--ok);color:#2c3e50;border:none;border-radius:6px;cursor:pointer;font-weight:700" onclick="ExercisesModule.saveExercise()">💾 Сохранить</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
  },

  saveExercise: function() {
    var name = document.getElementById('exName').value.trim();
    if (!name) { alert('⚠️ Укажи название упражнения'); return; }

    var db = this.getDB();
    var exData = {
      name: name,
      muscleGroup: document.getElementById('exMuscleGroup').value,
      description: document.getElementById('exDescription').value.trim(),
      videoUrl: document.getElementById('exVideo').value.trim(),
      updatedAt: Date.now()
    };

    if (this.editingId) {
      for (var i = 0; i < db.length; i++) {
        if (db[i].id === this.editingId) {
          db[i] = Object.assign({}, db[i], exData);
          break;
        }
      }
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

  editExercise: function(id) {
    this.openExForm(id);
  },

  deleteExercise: function(id) {
    if (!confirm('🗑️ Удалить упражнение? Это действие нельзя отменить.')) return;
    var db = this.getDB();
    var newDb = [];
    for (var i = 0; i < db.length; i++) {
      if (db[i].id !== id) newDb.push(db[i]);
    }
    this.saveDB(newDb);
    this.createExercisesScreen();
  },

  viewExercise: function(id) {
    var db = this.getDB();
    var ex = null;
    for (var i = 0; i < db.length; i++) {
      if (db[i].id === id) { ex = db[i]; break; }
    }
    if (!ex) return;

    var videoHtml = '';
    if (ex.videoUrl) {
      videoHtml = '<div style="background:var(--inp);padding:12px;border-radius:8px;margin:10px 0">' +
        '<h3 style="color:var(--acc);margin:0 0 10px 0">📺 Видео</h3>' +
        '<div style="aspect-ratio:16/9;background:#000;border-radius:6px;overflow:hidden">' +
          '<a href="' + ex.videoUrl + '" target="_blank" style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--lnk);text-decoration:none">▶️ Открыть видео</a>' +
        '</div>' +
      '</div>';
    }

    var modal = document.createElement('div');
    modal.className = 'ex-modal';
    modal.id = 'exViewModal';
    modal.innerHTML =
      '<div class="ex-modal-content">' +
        '<button style="float:right;background:transparent;border:none;color:var(--text);font-size:1.5em;cursor:pointer" onclick="document.getElementById(\'exViewModal\').remove()">×</button>' +
        '<h2 style="color:var(--acc);margin-top:0">' + ex.name + '</h2>' +
        '<div style="font-size:0.9em;opacity:0.7;margin-bottom:15px">' + (ex.muscleGroup || '❓ Без категории') + '</div>' +
        (ex.description ? '<div style="background:var(--inp);padding:12px;border-radius:8px;margin:10px 0"><h3 style="color:var(--acc);margin:0 0 10px 0">📝 Описание</h3><p style="white-space:pre-wrap;margin:0">' + ex.description + '</p></div>' : '<div style="opacity:0.6;font-style:italic">Описание не добавлено</div>') +
        videoHtml +
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