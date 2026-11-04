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

  createExercisesScreen: function() {
    var screen = document.getElementById('screen-exercises');
    if (!screen) {
      screen = document.createElement('div');
      screen.id = 'screen-exercises';
      screen.className = 'screen';
      document.getElementById('userInterface').appendChild(screen);
    }

    var db = this.getDB();
    var groups = [];
    for (var i = 0; i < db.length; i++) {
      if (db[i].muscleGroup && groups.indexOf(db[i].muscleGroup) === -1) {
        groups.push(db[i].muscleGroup);
      }
    }

    var filtered = db;
    if (this.currentFilter !== 'all') {
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
    '</style>';

    var filterHtml = '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:15px">';
    filterHtml += '<button class="btn" style="padding:6px 12px;font-size:0.85em;background:' + (this.currentFilter === 'all' ? 'var(--acc)' : 'var(--brd)') + ';color:' + (this.currentFilter === 'all' ? '#2c3e50' : 'var(--text)') + ';border:none;border-radius:6px;cursor:pointer" onclick="ExercisesModule.setFilter(\'all\')">Все</button>';
    for (var i = 0; i < groups.length; i++) {
      var isActive = this.currentFilter === groups[i];
      filterHtml += '<button class="btn" style="padding:6px 12px;font-size:0.85em;background:' + (isActive ? 'var(--acc)' : 'var(--brd)') + ';color:' + (isActive ? '#2c3e50' : 'var(--text)') + ';border:none;border-radius:6px;cursor:pointer" onclick="ExercisesModule.setFilter(\'' + groups[i].replace(/'/g, "\\'") + '\')">' + groups[i] + '</button>';
    }
    filterHtml += '</div>';

    var listHtml = '';
    if (filtered.length === 0) {
      listHtml = '<div style="text-align:center;padding:30px;opacity:0.6"><div style="font-size:3em;margin-bottom:10px">📚</div><p>База пуста. Добавь первое упражнение!</p></div>';
    } else {
      for (var i = 0; i < filtered.length; i++) {
        var ex = filtered[i];
        listHtml += '<div class="ex-card" onclick="ExercisesModule.viewExercise(\'' + ex.id + '\')">' +
          '<div style="display:flex;justify-content:space-between;align-items:start">' +
            '<div style="flex:1">' +
              '<h4 style="margin:0 0 5px 0;color:var(--acc)">' + ex.name + (ex.videoUrl ? ' 📺' : '') + '</h4>' +
              '<div style="font-size:0.8em;opacity:0.7;margin-bottom:5px">' + (ex.muscleGroup || '—') + '</div>' +
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
        filterHtml +
        listHtml +
      '</div>';
  },

  setFilter: function(filter) {
    this.currentFilter = filter;
    this.createExercisesScreen();
  },

  openExForm: function(id) {
    this.editingId = id || null;
    var db = this.getDB();
    var ex = null;
    for (var i = 0; i < db.length; i++) {
      if (db[i].id === id) { ex = db[i]; break; }
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
          '<input type="text" id="exMuscleGroup" value="' + (ex ? (ex.muscleGroup || '') : '') + '" placeholder="Например: Грудь, Спина, Ноги" style="width:100%;padding:8px;background:var(--inp);border:1px solid var(--brd);border-radius:6px;color:var(--text);font-size:1em">' +
          '<div class="hint">💡 Для фильтрации упражнений по категориям</div>' +
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
      muscleGroup: document.getElementById('exMuscleGroup').value.trim(),
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
        '<div style="font-size:0.9em;opacity:0.7;margin-bottom:15px">' + (ex.muscleGroup || '—') + '</div>' +
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