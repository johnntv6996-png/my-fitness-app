// modules/plan.js

const PlanModule = {
  pickingForDay: null,

  init: function() {
    console.log('📝 Plan module initialized');
    if (typeof Logger !== 'undefined') Logger.log('Модуль плана инициализирован', 'info');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { PlanModule.setup(); });
    } else {
      this.setup();
    }
  },

  setup: function() {
    this.createPlanScreen();
    
    if (typeof Core !== 'undefined') {
      Core.addNavButton('План', 'plan', '📝');
    }
  },

  getPlan: function() {
    if (typeof FTStorage !== 'undefined') return FTStorage.get('plan') || [];
    return [];
  },

  savePlan: function(plan) {
    if (typeof FTStorage !== 'undefined') FTStorage.set('plan', plan);
  },

  createPlanScreen: function() {
    var screen = document.getElementById('screen-plan');
    if (!screen) {
      screen = document.createElement('div');
      screen.id = 'screen-plan';
      screen.className = 'screen';
      document.getElementById('userInterface').appendChild(screen);
    }

    var plan = this.getPlan();
    var DAYS = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];
    var db = typeof ExercisesModule !== 'undefined' ? ExercisesModule.getDB() : [];

    if (plan.length === 0) {
      plan = [];
      for (var i = 0; i < 7; i++) {
        plan.push({ dayName: DAYS[i], muscleGroup: '', exercises: [] });
      }
      this.savePlan(plan);
    }

    var css = '<style>' +
      '.plan-day { background:var(--card); border-radius:10px; padding:15px; margin-bottom:12px; border-left:4px solid var(--acc); }' +
      '.plan-ex { background:var(--inp); padding:8px 12px; border-radius:6px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; }' +
    '</style>';

    var html = css +
      '<div style="padding:15px;max-width:600px;margin:0 auto">' +
        '<h2 style="color:var(--acc);margin-top:0">📝 План тренировок</h2>' +
        '<button class="btn" style="width:100%;padding:12px;font-size:1em;font-weight:700;background:linear-gradient(135deg, var(--ok) 0%, #7FDD7F 100%);color:#1a3a1a;border:1px solid var(--ok);border-radius:8px;cursor:pointer;margin-bottom:15px" onclick="PlanModule.savePlanData()">💾 Сохранить план</button>';

    for (var dayIdx = 0; dayIdx < 7; dayIdx++) {
      var day = plan[dayIdx];
      html += '<div class="plan-day">';
      html += '<h3 style="color:var(--acc);margin:0 0 10px 0">' + day.dayName + '</h3>';
      html += '<div style="margin-bottom:12px">';
      html += '<label style="display:block;margin-bottom:5px;font-weight:600;font-size:0.9em">Группа мышц:</label>';
      html += '<input type="text" value="' + (day.muscleGroup || '') + '" placeholder="Например: Грудь" style="width:100%;padding:8px;background:var(--inp);border:1px solid var(--brd);border-radius:6px;color:var(--text);font-size:0.9em" oninput="PlanModule.updateMuscleGroup(' + dayIdx + ',this.value)">';
      html += '</div>';
      html += '<div>';
      html += '<label style="display:block;margin-bottom:8px;font-weight:600;font-size:0.9em">Упражнения:</label>';
      html += '<ul style="list-style:none;padding:0;margin:0 0 10px 0">';

      if (day.exercises.length === 0) {
        html += '<li style="padding:8px;font-size:0.85em;opacity:0.6">Нет упражнений</li>';
      } else {
        for (var exIdx = 0; exIdx < day.exercises.length; exIdx++) {
          var exRef = day.exercises[exIdx];
          var ex = null;
          for (var i = 0; i < db.length; i++) {
            if (db[i].id === exRef.id) { ex = db[i]; break; }
          }
          var name = ex ? ex.name : '(удалено)';
          html += '<li class="plan-ex">';
          html += '<div style="flex:1;min-width:150px">';
          html += '<div style="font-weight:500;font-size:0.9em">' + (exIdx + 1) + '. ' + name + '</div>';
          html += '<input type="text" value="' + (exRef.sets || '') + '" placeholder="3×10" style="width:100%;padding:4px;margin-top:4px;background:var(--bg);border:1px solid var(--brd);border-radius:4px;color:var(--text);font-size:0.8em" oninput="PlanModule.updateSets(' + dayIdx + ',' + exIdx + ',this.value)">';
          html += '</div>';
          html += '<div style="display:flex;gap:5px">';
          html += '<button class="btn" style="padding:4px 8px;font-size:0.8em;background:var(--brd);color:var(--text);border:none;border-radius:4px;cursor:pointer" ' + (exIdx === 0 ? 'disabled style="opacity:0.3"' : '') + ' onclick="PlanModule.movePlanEx(' + dayIdx + ',' + exIdx + ',-1)">↑</button>';
          html += '<button class="btn" style="padding:4px 8px;font-size:0.8em;background:var(--brd);color:var(--text);border:none;border-radius:4px;cursor:pointer" ' + (exIdx === day.exercises.length - 1 ? 'disabled style="opacity:0.3"' : '') + ' onclick="PlanModule.movePlanEx(' + dayIdx + ',' + exIdx + ',1)">↓</button>';
          html += '<button class="btn" style="padding:4px 8px;font-size:0.8em;background:#e74c3c;color:#fff;border:none;border-radius:4px;cursor:pointer" onclick="PlanModule.removePlanEx(' + dayIdx + ',' + exIdx + ')">🗑️</button>';
          html += '</div>';
          html += '</li>';
        }
      }

      html += '</ul>';
      html += '<button class="btn" style="padding:8px 12px;font-size:0.85em;background:var(--lnk);color:#2c3e50;border:none;border-radius:6px;cursor:pointer" onclick="PlanModule.openPickEx(' + dayIdx + ')">➕ Добавить из базы</button>';
      html += '</div>';
      html += '</div>';
    }

    html += '</div>';
    screen.innerHTML = html;
  },

  updateSets: function(dayIdx, exIdx, value) {
    var plan = this.getPlan();
    if (plan[dayIdx] && plan[dayIdx].exercises[exIdx]) {
      plan[dayIdx].exercises[exIdx].sets = value;
      this.savePlan(plan);
    }
  },

  updateMuscleGroup: function(dayIdx, value) {
    var plan = this.getPlan();
    if (plan[dayIdx]) {
      plan[dayIdx].muscleGroup = value;
      this.savePlan(plan);
    }
  },

  movePlanEx: function(dayIdx, exIdx, dir) {
    var plan = this.getPlan();
    var arr = plan[dayIdx].exercises;
    var newIdx = exIdx + dir;
    if (newIdx < 0 || newIdx >= arr.length) return;
    var temp = arr[exIdx];
    arr[exIdx] = arr[newIdx];
    arr[newIdx] = temp;
    this.savePlan(plan);
    this.createPlanScreen();
  },

  removePlanEx: function(dayIdx, exIdx) {
    var plan = this.getPlan();
    plan[dayIdx].exercises.splice(exIdx, 1);
    this.savePlan(plan);
    this.createPlanScreen();
  },

  savePlanData: function() {
    alert('✅ План сохранён!');
    if (typeof Core !== 'undefined') Core.navigate('welcome');
  },

  openPickEx: function(dayIdx) {
    this.pickingForDay = dayIdx;
    var db = typeof ExercisesModule !== 'undefined' ? ExercisesModule.getDB() : [];

    var modal = document.createElement('div');
    modal.className = 'ex-modal';
    modal.id = 'pickExModal';
    modal.innerHTML =
      '<div class="ex-modal-content">' +
        '<button style="float:right;background:transparent;border:none;color:var(--text);font-size:1.5em;cursor:pointer" onclick="document.getElementById(\'pickExModal\').remove()">×</button>' +
        '<h2 style="color:var(--acc);margin-top:0">Выбери упражнение</h2>' +
        '<input type="text" id="pickSearch" placeholder="🔍 Поиск..." oninput="PlanModule.renderPickList()" style="width:100%;padding:8px;background:var(--inp);border:1px solid var(--brd);border-radius:6px;color:var(--text);margin-bottom:10px;font-size:1em">' +
        '<div id="pickList" style="max-height:400px;overflow-y:auto"></div>' +
      '</div>';
    document.body.appendChild(modal);
    this.renderPickList();
  },

  renderPickList: function() {
    var search = document.getElementById('pickSearch') ? document.getElementById('pickSearch').value.toLowerCase() : '';
    var db = typeof ExercisesModule !== 'undefined' ? ExercisesModule.getDB() : [];
    
    var filtered = [];
    for (var i = 0; i < db.length; i++) {
      if (db[i].name.toLowerCase().indexOf(search) !== -1 || (db[i].muscleGroup || '').toLowerCase().indexOf(search) !== -1) {
        filtered.push(db[i]);
      }
    }

    var list = document.getElementById('pickList');
    if (!list) return;

    if (filtered.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:30px;opacity:0.6">Ничего не найдено</div>';
    } else {
      var html = '';
      for (var i = 0; i < filtered.length; i++) {
        var ex = filtered[i];
        html += '<div class="ex-card" onclick="PlanModule.addExToPlan(\'' + ex.id + '\')" style="background:var(--card);border-radius:8px;padding:12px;margin-bottom:10px;border-left:3px solid var(--acc);cursor:pointer">' +
          '<h4 style="margin:0 0 5px 0;color:var(--acc)">' + ex.name + '</h4>' +
          '<div style="font-size:0.85em;opacity:0.7">' + (ex.muscleGroup || '—') + '</div>' +
        '</div>';
      }
      list.innerHTML = html;
    }
  },

  addExToPlan: function(exId) {
    if (this.pickingForDay === null) return;
    var plan = this.getPlan();
    plan[this.pickingForDay].exercises.push({ id: exId, sets: '' });
    this.savePlan(plan);
    document.getElementById('pickExModal').remove();
    this.createPlanScreen();
  }
};

window.PlanModule = PlanModule;
module.exports = PlanModule;