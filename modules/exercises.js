// modules/exercises.js

const ExercisesModule = {
  editingExId: null,
  currentFilter: 'all',

  init() {
    console.log('📚 Exercises module initialized');
    if (typeof Logger !== 'undefined') Logger.log('Модуль базы упражнений инициализирован', 'info');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  },

  setup() {
    this.createExercisesScreen();
    
    if (typeof Core !== 'undefined') {
      Core.addNavButton('История', 'history', '📋');
    }
  },

  createExercisesScreen() {
    let screen = document.getElementById('screen-exercises');
    if (!screen) {
      screen = document.createElement('div');
      screen.id = 'screen-exercises';
      screen.className = 'screen';
      document.getElementById('userInterface').appendChild(screen);
    }

    const db = FTStorage.get('db') || [];
    const groups = [...new Set(db.map(e => e.muscleGroup).filter(Boolean))];
    
    let filtered = db;
    const searchInput = document.getElementById('exSearch')?.value?.toLowerCase() || '';
    if (searchInput) filtered = filtered.filter(e => e.name.toLowerCase().includes(searchInput) || (e.description||'').toLowerCase().includes(searchInput));
    if (this.currentFilter !== 'all') filtered = filtered.filter(e => e.muscleGroup === this.currentFilter);

    screen.innerHTML = `
      <h2 style="color:var(--acc);margin-top:0">📚 База упражнений</h2>
      <div style="display:flex;gap:10px;margin-bottom:15px;flex-wrap:wrap">
        <input type="text" id="exSearch" placeholder="🔍 Поиск..." oninput="ExercisesModule.renderDB()" style="flex:1;min-width:200px;padding:8px;background:var(--inp);border:1px solid var(--brd);border-radius:6px;color:var(--text)">
      </div>
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:15px">
        <button class="btn ${this.currentFilter==='all'?'btn-primary':'btn-secondary'}" onclick="ExercisesModule.setFilter('all')">Все</button>
        ${groups.map(g => `<button class="btn ${this.currentFilter===g?'btn-primary':'btn-secondary'}" onclick="ExercisesModule.setFilter('${FTUtils.escapeHtml(g)}')">${FTUtils.escapeHtml(g)}</button>`).join('')}
      </div>
      <button class="btn btn-primary" style="width:100%;margin-bottom:15px" onclick="ExercisesModule.openExForm()">+ Добавить упражнение</button>
      <div id="dbList">
        ${filtered.length === 0 ? '<div style="text-align:center;padding:30px;opacity:0.6">📚 База пуста. Добавьте первое упражнение!</div>' : 
          filtered.map(ex => `
            <div style="background:var(--card);border-radius:8px;padding:12px;margin-bottom:10px;border-left:3px solid var(--acc);cursor:pointer" onclick="ExercisesModule.viewExercise('${ex.id}')">
              <h4 style="margin:0 0 5px 0">${FTUtils.escapeHtml(ex.name)} ${ex.videoUrl?'📺':''}</h4>
              <div class="text-small">${FTUtils.escapeHtml(ex.muscleGroup||'—')}</div>
              ${ex.description ? `<div style="font-size:.9em;margin-top:5px;opacity:.85">${FTUtils.escapeHtml(ex.description.substring(0,120))}${ex.description.length>120?'...':''}</div>` : ''}
              <div style="display:flex;gap:5px;margin-top:8px">
                <button class="btn btn-secondary" style="padding:4px 8px;font-size:.85em" onclick="event.stopPropagation();ExercisesModule.editExercise('${ex.id}')">✏️</button>
                <button class="btn btn-danger" style="padding:4px 8px;font-size:.85em" onclick="event.stopPropagation();ExercisesModule.deleteExercise('${ex.id}')">🗑️</button>
              </div>
            </div>
          `).join('')
        }
      </div>
    `;
  },

  renderDB() {
    this.createExercisesScreen();
  },

  setFilter(f) {
    this.currentFilter = f;
    this.renderDB();
  },

  openExForm(id = null) {
    this.editingExId = id;
    const db = FTStorage.get('db') || [];
    
    let modal = document.getElementById('exFormModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'exFormModal';
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.85);z-index:1000;display:flex;justify-content:center;align-items:center;padding:15px';
      document.body.appendChild(modal);
    }
    
    const ex = id ? db.find(e => e.id === id) : null;
    
    modal.innerHTML = `
      <div style="background:var(--card);padding:20px;border-radius:12px;width:100%;max-width:600px;max-height:90vh;overflow-y:auto">
        <button style="float:right;background:transparent;border:none;color:var(--text);font-size:1.5em;cursor:pointer" onclick="document.getElementById('exFormModal').remove()">×</button>
        <h2 style="color:var(--acc);margin-top:0">${id ? 'Редактирование' : 'Новое упражнение'}</h2>
        <div style="margin-bottom:12px"><label style="display:block;margin-bottom:5px;font-weight:600">Название:</label><input type="text" id="exName" value="${ex ? FTUtils.escapeHtml(ex.name) : ''}" placeholder="Например: Отжимания от пола" style="width:100%;padding:8px;background:var(--inp);border:1px solid var(--brd);border-radius:6px;color:var(--text)"></div>
        <div style="margin-bottom:12px"><label style="display:block;margin-bottom:5px;font-weight:600">Описание:</label><textarea id="exDescription" rows="3" placeholder="Опишите правильное выполнение..." style="width:100%;padding:8px;background:var(--inp);border:1px solid var(--brd);border-radius:6px;color:var(--text);resize:vertical">${ex ? FTUtils.escapeHtml(ex.description || '') : ''}</textarea></div>
        <div style="margin-bottom:12px"><label style="display:block;margin-bottom:5px;font-weight:600">Ссылка на видео:</label><input type="text" id="exVideo" value="${ex ? FTUtils.escapeHtml(ex.videoUrl || '') : ''}" placeholder="YouTube, VK, Rutube..." style="width:100%;padding:8px;background:var(--inp);border:1px solid var(--brd);border-radius:6px;color:var(--text)"></div>
        <div style="margin-bottom:12px"><label style="display:block;margin-bottom:5px;font-weight:600">Группа мышц:</label><input type="text" id="exMuscleGroup" value="${ex ? FTUtils.escapeHtml(ex.muscleGroup || '') : ''}" placeholder="Например: Грудь" style="width:100%;padding:8px;background:var(--inp);border:1px solid var(--brd);border-radius:6px;color:var(--text)"></div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">
          <button class="btn btn-secondary" onclick="document.getElementById('exFormModal').remove()">Отмена</button>
          <button class="btn btn-primary" onclick="ExercisesModule.saveExercise()">💾 Сохранить</button>
        </div>
      </div>
    `;
  },

  saveExercise() {
    const name = document.getElementById('exName').value.trim();
    if (!name) { alert('Укажите название'); return; }
    
    const db = FTStorage.get('db') || [];
    const exData = {
      name: name,
      description: document.getElementById('exDescription').value.trim(),
      videoUrl: document.getElementById('exVideo').value.trim(),
      muscleGroup: document.getElementById('exMuscleGroup').value.trim(),
      updatedAt: Date.now()
    };
    
    if (this.editingExId) {
      const idx = db.findIndex(e => e.id === this.editingExId);
      if (idx !== -1) db[idx] = { ...db[idx], ...exData };
    } else {
      exData.id = 'ex_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      exData.createdAt = Date.now();
      db.push(exData);
    }
    
    FTStorage.set('db', db);
    document.getElementById('exFormModal').remove();
    this.editingExId = null;
    this.renderDB();
  },

  editExercise(id) {
    this.openExForm(id);
  },

  deleteExercise(id) {
    if (!confirm('Удалить упражнение?')) return;
    let db = FTStorage.get('db') || [];
    db = db.filter(e => e.id !== id);
    FTStorage.set('db', db);
    this.renderDB();
  },

  viewExercise(id) {
    const db = FTStorage.get('db') || [];
    const ex = db.find(e => e.id === id);
    if (!ex) return;
    
    let modal = document.getElementById('exViewModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'exViewModal';
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.85);z-index:1000;display:flex;justify-content:center;align-items:center;padding:15px';
      document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
      <div style="background:var(--card);padding:20px;border-radius:12px;width:100%;max-width:600px;max-height:90vh;overflow-y:auto">
        <button style="float:right;background:transparent;border:none;color:var(--text);font-size:1.5em;cursor:pointer" onclick="document.getElementById('exViewModal').remove()">×</button>
        <h2 style="color:var(--acc);margin-top:0">${FTUtils.escapeHtml(ex.name)}</h2>
        <p class="text-small" style="margin:5px 0">${FTUtils.escapeHtml(ex.muscleGroup||'—')}</p>
        ${ex.description ? `<div style="background:var(--inp);padding:12px;border-radius:6px;margin:10px 0"><h3 style="color:var(--acc);margin:0 0 10px 0">📝 Описание</h3><p style="white-space:pre-wrap;margin:0">${FTUtils.escapeHtml(ex.description)}</p></div>` : ''}
        ${ex.videoUrl ? `<div style="background:var(--inp);padding:12px;border-radius:6px;margin:10px 0"><h3 style="color:var(--acc);margin:0 0 10px 0">📺 Видео</h3><div style="aspect-ratio:16/9;background:#000;border-radius:6px;overflow:hidden"><iframe src="${FTUtils.escapeHtml(WorkoutsModule.parseVideoUrl(ex.videoUrl)?.embedUrl || '')}" style="width:100%;height:100%;border:none" allowfullscreen></iframe></div></div>` : ''}
        <div style="display:flex;gap:10px;margin-top:15px;flex-wrap:wrap">
          <button class="btn btn-secondary" onclick="document.getElementById('exViewModal').remove();ExercisesModule.editExercise('${ex.id}')">✏️ Редактировать</button>
          <button class="btn btn-primary" onclick="document.getElementById('exViewModal').remove()">Закрыть</button>
        </div>
      </div>
    `;
  }
};

module.exports = ExercisesModule;