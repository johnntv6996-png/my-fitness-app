// modules/plan.js

const PlanModule = {
  pickingForDay: null,

  init() {
    console.log('📝 Plan module initialized');
    if (typeof Logger !== 'undefined') Logger.log('Модуль плана инициализирован', 'info');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  },

  setup() {
    this.createPlanScreen();
  },

  createPlanScreen() {
    let screen = document.getElementById('screen-plan');
    if (!screen) {
      screen = document.createElement('div');
      screen.id = 'screen-plan';
      screen.className = 'screen';
      document.getElementById('userInterface').appendChild(screen);
    }

    const plan = FTStorage.get('plan') || [];
    const DAYS = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];
    const db = FTStorage.get('db') || [];

    if (plan.length === 0) {
      // Инициализируем план
      for (let i = 0; i < 7; i++) {
        plan.push({ dayName: DAYS[i], muscleGroup: '', exercises: [] });
      }
      FTStorage.set('plan', plan);
    }

    let html = `<h2 style="color:var(--acc);margin-top:0">📝 План тренировок</h2><div id="planContainer"></div><button class="btn btn-primary" style="width:100%;margin-top:15px" onclick="PlanModule.savePlan()">💾 Сохранить план</button>`;
    screen.innerHTML = html;

    const container = document.getElementById('planContainer');
    plan.forEach((day, idx) => {
      const dayDiv = document.createElement('div');
      dayDiv.style.cssText = 'background:var(--card);border-radius:10px;padding:15px;margin-bottom:12px;border-left:4px solid var(--acc)';
      
      const exList = day.exercises.map((exRef, exIdx) => {
        const ex = db.find(e => e.id === exRef.id);
        const name = ex ? ex.name : '(удалено из базы)';
        return `
          <li style="background:var(--inp);padding:8px 12px;border-radius:6px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;list-style:none">
            <div style="flex:1;min-width:150px">
              <div style="font-weight:500">${exIdx+1}. ${FTUtils.escapeHtml(name)}</div>
              <input type="text" value="${FTUtils.escapeHtml(exRef.sets||'')}" placeholder="Например: 3 × 10" style="width:100%;padding:5px;margin-top:4px;background:var(--bg);border:1px solid var(--brd);border-radius:4px;color:var(--text);font-size:.85em" oninput="PlanModule.updateSets(${idx},${exIdx},this.value)">
            </div>
            <div style="display:flex;gap:5px">
              <button class="btn btn-secondary" style="padding:4px 8px;font-size:.85em" ${exIdx===0?'disabled':''} onclick="PlanModule.movePlanEx(${idx},${exIdx},-1)">↑</button>
              <button class="btn btn-secondary" style="padding:4px 8px;font-size:.85em" ${exIdx===day.exercises.length-1?'disabled':''} onclick="PlanModule.movePlanEx(${idx},${exIdx},1)">↓</button>
              <button class="btn btn-danger" style="padding:4px 8px;font-size:.85em" onclick="PlanModule.removePlanEx(${idx},${exIdx})">🗑️</button>
            </div>
          </li>
        `;
      }).join('');

      dayDiv.innerHTML = `
        <h4 style="margin:0 0 10px 0;color:var(--acc)">${day.dayName}</h4>
        <div style="margin-bottom:12px"><label style="display:block;margin-bottom:5px;font-weight:600">Группа мышц:</label><input type="text" value="${FTUtils.escapeHtml(day.muscleGroup||'')}" placeholder="Например: Грудь + Трицепс" style="width:100%;padding:8px;background:var(--inp);border:1px solid var(--brd);border-radius:6px;color:var(--text)" oninput="PlanModule.updateMuscleGroup(${idx},this.value)"></div>
        <div>
          <label style="font-weight:600">Упражнения:</label>
          <ul style="list-style:none;padding:0;margin:10px 0">${exList || '<li class="text-small" style="padding:8px">Нет упражнений</li>'}</ul>
          <button class="btn btn-secondary" style="padding:6px 12px;font-size:.85em" onclick="PlanModule.openPickEx(${idx})">+ Добавить из базы</button>
        </div>
      `;
      container.appendChild(dayDiv);
    });
  },

  updateSets(dayIdx, exIdx, value) {
    const plan = FTStorage.get('plan') || [];
    if (plan[dayIdx] && plan[dayIdx].exercises[exIdx]) {
      plan[dayIdx].exercises[exIdx].sets = value;
      FTStorage.set('plan', plan);
    }
  },

  updateMuscleGroup(dayIdx, value) {
    const plan = FTStorage.get('plan') || [];
    if (plan[dayIdx]) {
      plan[dayIdx].muscleGroup = value;
      FTStorage.set('plan', plan);
    }
  },

  movePlanEx(dayIdx, exIdx, dir) {
    const plan = FTStorage.get('plan') || [];
    const arr = plan[dayIdx].exercises;
    const newIdx = exIdx + dir;
    if (newIdx < 0 || newIdx >= arr.length) return;
    [arr[exIdx], arr[newIdx]] = [arr[newIdx], arr[exIdx]];
    FTStorage.set('plan', plan);
    this.createPlanScreen();
  },

  removePlanEx(dayIdx, exIdx) {
    const plan = FTStorage.get('plan') || [];
    plan[dayIdx].exercises.splice(exIdx, 1);
    FTStorage.set('plan', plan);
    this.createPlanScreen();
  },

  savePlan() {
    alert('✅ План сохранён!');
    Core.navigate('welcome');
  },

  openPickEx(dayIdx) {
    this.pickingForDay = dayIdx;
    const db = FTStorage.get('db') || [];
    
    let modal = document.getElementById('pickExModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'pickExModal';
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.85);z-index:1000;display:flex;justify-content:center;align-items:center;padding:15px';
      document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
      <div style="background:var(--card);padding:20px;border-radius:12px;width:100%;max-width:600px;max-height:90vh;overflow-y:auto">
        <button style="float:right;background:transparent;border:none;color:var(--text);font-size:1.5em;cursor:pointer" onclick="document.getElementById('pickExModal').remove()">×</button>
        <h2 style="color:var(--acc);margin-top:0">Выберите упражнение</h2>
        <input type="text" id="pickSearch" placeholder="🔍 Поиск..." oninput="PlanModule.renderPickList()" style="width:100%;padding:8px;background:var(--inp);border:1px solid var(--brd);border-radius:6px;color:var(--text);margin-bottom:10px">
        <div id="pickList" style="max-height:400px;overflow-y:auto">
          ${db.length === 0 ? '<div style="text-align:center;padding:30px;opacity:0.6">База пуста. Сначала добавьте упражнения.</div>' :
            db.map(ex => `
              <div style="background:var(--card);border-radius:8px;padding:12px;margin-bottom:10px;border-left:3px solid var(--acc);cursor:pointer" onclick="PlanModule.addExToPlan('${ex.id}')">
                <h4 style="margin:0 0 5px 0">${FTUtils.escapeHtml(ex.name)}</h4>
                <div class="text-small">${FTUtils.escapeHtml(ex.muscleGroup||'—')}</div>
              </div>
            `).join('')
          }
        </div>
      </div>
    `;
  },

  renderPickList() {
    const search = document.getElementById('pickSearch')?.value?.toLowerCase() || '';
    const db = FTStorage.get('db') || [];
    const filtered = db.filter(ex => ex.name.toLowerCase().includes(search) || (ex.muscleGroup||'').toLowerCase().includes(search));
    
    const list = document.getElementById('pickList');
    if (list) {
      list.innerHTML = filtered.length === 0 ? '<div style="text-align:center;padding:30px;opacity:0.6">Ничего не найдено</div>' :
        filtered.map(ex => `
          <div style="background:var(--card);border-radius:8px;padding:12px;margin-bottom:10px;border-left:3px solid var(--acc);cursor:pointer" onclick="PlanModule.addExToPlan('${ex.id}')">
            <h4 style="margin:0 0 5px 0">${FTUtils.escapeHtml(ex.name)}</h4>
            <div class="text-small">${FTUtils.escapeHtml(ex.muscleGroup||'—')}</div>
          </div>
        `).join('');
    }
  },

  addExToPlan(exId) {
    if (this.pickingForDay === null) return;
    const plan = FTStorage.get('plan') || [];
    plan[this.pickingForDay].exercises.push({ id: exId, sets: '' });
    FTStorage.set('plan', plan);
    document.getElementById('pickExModal').remove();
    this.createPlanScreen();
  }
};

module.exports = PlanModule;