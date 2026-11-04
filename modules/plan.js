// modules/plan.js

const PlanModule = {
  pickingForDay: null,
  currentDay: 0,

  init: function() {
    console.log('📝 Plan module initialized');
    if (typeof Logger !== 'undefined') Logger.log('Модуль плана инициализирован', 'info');
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { PlanModule.setup(); });
    } else { this.setup(); }
  },

  setup: function() {
    this.createPlanScreen();
    if (typeof Core !== 'undefined') Core.addNavButton('План', 'plan', '📝');
  },

  getPlan: function() {
    if (typeof FTStorage !== 'undefined') return FTStorage.get('plan') || [];
    return [];
  },
  savePlan: function(p) {
    if (typeof FTStorage !== 'undefined') FTStorage.set('plan', p);
  },
  getTodayIndex: function() { return (new Date().getDay() + 6) % 7; },

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
    var DAYS_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
    var db = typeof ExercisesModule !== 'undefined' ? ExercisesModule.getDB() : [];
    var todayIdx = this.getTodayIndex();

    if (plan.length === 0) {
      plan = [];
      for (var i = 0; i < 7; i++) plan.push({ dayName: DAYS[i], muscleGroup: '', exercises: [] });
      this.savePlan(plan);
    }

    var css = '<style>' +
      '.plan-day-tab { padding:10px 14px; font-size:0.9em; border:none; border-radius:8px 8px 0 0; cursor:pointer; transition:all 0.2s; font-weight:600; }' +
      '.plan-day-tab.active { background:var(--card); color:var(--acc); border-bottom:2px solid var(--acc); }' +
      '.plan-day-tab:not(.active) { background:var(--brd); color:var(--text); opacity:0.7; }' +
      '.plan-day-tab:not(.active):hover { opacity:1; }' +
      '.plan-day-tab.today { position:relative; }' +
      '.plan-day-tab.today::after { content:""; position:absolute; top:4px; right:4px; width:6px; height:6px; background:var(--ok); border-radius:50%; }' +
      '.plan-ex { background:var(--inp); padding:10px 12px; border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; border-left:3px solid var(--acc); }' +
      '.hint { font-size:0.75em; opacity:0.6; margin-top:3px; }' +
      '.day-indicator { display:inline-block; padding:2px 8px; border-radius:10px; font-size:0.75em; font-weight:700; margin-left:8px; background:var(--acc); color:#2c3e50; }' +
    '</style>';

    var tabsHtml = '<div style="display:flex;gap:4px;margin-bottom:0;overflow-x:auto;padding-bottom:2px">';
    for (var i = 0; i < 7; i++) {
      var isActive = this.currentDay === i;
      var isToday = i === todayIdx;
      var exCount = plan[i] ? plan[i].exercises.length : 0;
      var indicator = exCount > 0 ? '<span class="day-indicator">' + exCount + '</span>' : '';
      tabsHtml += '<button class="plan-day-tab ' + (isActive ? 'active' : '') + (isToday ? ' today' : '') + '" onclick="PlanModule.switchDay(' + i + ')" title="' + DAYS[i] + (isToday ? ' (сегодня)' : '') + '">' + DAYS_SHORT[i] + indicator + '</button>';
    }
    tabsHtml += '</div>';

    var day = plan[this.currentDay];
    var isToday = this.currentDay === todayIdx;
    var dayLabel = isToday ? day.dayName + ' (сегодня)' : day.dayName;

    var contentHtml = '<div style="background:var(--card);border-radius:0 0 10px 10px;padding:15px;border:1px solid var(--brd);border-top:none">';
    contentHtml += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px">';
    contentHtml += '<h3 style="color:var(--acc);margin:0">' + dayLabel + '</h3>';
    contentHtml += '<div style="font-size:0.85em;opacity:0.7">' + day.exercises.length + ' упражнений</div>';
    contentHtml += '</div>';

    contentHtml += '<div style="margin-bottom:15px">';
    contentHtml += '<label style="display:block;margin-bottom:5px;font-weight:600;font-size:0.9em">🎯 Группа мышц:</label>';
    contentHtml += '<input type="text" value="' + (day.muscleGroup || '') + '" placeholder="Например: Грудь + Трицепс" style="width:100%;padding:8px;background:var(--inp);border:1px solid var(--brd);border-radius:6px;color:var(--text);font-size:0.9em" oninput="PlanModule.updateMuscleGroup(' + this.currentDay + ',this.value)">';
    contentHtml += '<div class="hint">💡 Какая группа мышц тренируется в этот день</div>';
    contentHtml += '</div>';

    contentHtml += '<div><label style="display:block;margin-bottom:10px;font-weight:600;font-size:0.9em">🏋️ Упражнения:</label>';
    if (day.exercises.length === 0) {
      contentHtml += '<div style="text-align:center;padding:20px;opacity:0.6;font-style:italic">Нет упражнений. Добавь первое! 👇</div>';
    } else {
      for (var exIdx = 0; exIdx < day.exercises.length; exIdx++) {
        var exRef = day.exercises[exIdx];
        var ex = null;
        for (var i = 0; i < db.length; i++) if (db[i].id === exRef.id) { ex = db[i]; break; }
        var name = ex ? ex.name : '(удалено из базы)';
        var category = ex && ex.muscleGroup ? ex.muscleGroup : '❓';
        contentHtml += '<div class="plan-ex">';
        contentHtml += '<div style="flex:1;min-width:150px">';
        contentHtml += '<div style="font-weight:600;font-size:0.95em;margin-bottom:4px">' + (exIdx + 1) + '. ' + name + '</div>';
        contentHtml += '<div style="font-size:0.75em;opacity:0.6;margin-bottom:6px">📂 ' + category + '</div>';
        contentHtml += '<input type="text" value="' + (exRef.sets || '') + '" placeholder="3×10 или 4×8" style="width:100%;padding:6px;background:var(--bg);border:1px solid var(--brd);border-radius:4px;color:var(--text);font-size:0.85em" oninput="PlanModule.updateSets(' + this.currentDay + ',' + exIdx + ',this.value)">';
        contentHtml += '<div class="hint">Подходы × Повторы</div>';
        contentHtml += '</div>';
        contentHtml += '<div style="display:flex;gap:5px">';
        contentHtml += '<button class="btn" style="padding:6px 10px;font-size:0.85em;background:var(--brd);color:var(--text);border:none;border-radius:4px;cursor:pointer" ' + (exIdx === 0 ? 'disabled style="opacity:0.3"' : '') + ' onclick="PlanModule.movePlanEx(' + this.currentDay + ',' + exIdx + ',-1)" title="Вверх">↑</button>';
        contentHtml += '<button class="btn" style="padding:6px 10px;font-size:0.85em;background:var(--brd);color:var(--text);border:none;border-radius:4px;cursor:pointer" ' + (exIdx === day.exercises.length - 1 ? 'disabled style="opacity:0.3"' : '') + ' onclick="PlanModule.movePlanEx(' + this.currentDay + ',' + exIdx + ',1)" title="Вниз">↓</button>';
        contentHtml += '<button class="btn" style="padding:6px 10px;font-size:0.85em;background:#e74c3c;color:#fff;border:none;border-radius:4px;cursor:pointer" onclick="PlanModule.removePlanEx(' + this.currentDay + ',' + exIdx + ')" title="Удалить">🗑️</button>';
        contentHtml += '</div></div>';
      }
    }
    contentHtml += '</div>';

    contentHtml += '<div style="display:flex;gap:10px;margin-top:15px;flex-wrap:wrap">';
    contentHtml += '<button class="btn" style="flex:1;padding:10px;font-size:0.9em;background:var(--lnk);color:#2c3e50;border:none;border-radius:6px;cursor:pointer;font-weight:600" onclick="PlanModule.openPickEx(' + this.currentDay + ')">➕ Добавить из базы</button>';
    if (day.exercises.length > 0) {
      contentHtml += '<button class="btn" style="padding:10px 14px;font-size:0.9em;background:var(--brd);color:var(--text);border:none;border-radius:6px;cursor:pointer" onclick="PlanModule.clearDay(' + this.currentDay + ')" title="Очистить день">🗑️ Очистить</button>';
    }
    contentHtml += '</div></div>';

    screen.innerHTML = css +
      '<div style="padding:15px;max-width:600px;margin:0 auto">' +
        '<h2 style="color:var(--acc);margin-top:0">📝 План тренировок</h2>' +
        '<div class="hint" style="margin-bottom:15px">💡 Настрой тренировки на каждый день. Зелёная точка = сегодня.</div>' +
        tabsHtml + contentHtml +
        '<button class="btn" style="width:100%;padding:12px;font-size:1em;font-weight:700;background:linear-gradient(135deg, var(--ok) 0%, #7FDD7F 100%);color:#1a3a1a;border:1px solid var(--ok);border-radius:8px;cursor:pointer;margin-top:15px" onclick="PlanModule.savePlanData()">💾 Сохранить план</button>' +
      '</div>';
  },

  switchDay: function(i) { this.currentDay = i; this.createPlanScreen(); },
  updateSets: function(d, e, v) { var p = this.getPlan(); if (p[d] && p[d].exercises[e]) { p[d].exercises[e].sets = v; this.savePlan(p); } },
  updateMuscleGroup: function(d, v) { var p = this.getPlan(); if (p[d]) { p[d].muscleGroup = v; this.savePlan(p); } },
  movePlanEx: function(d, e, dir) {
    var p = this.getPlan(); var a = p[d].exercises; var n = e + dir;
    if (n < 0 || n >= a.length) return;
    var t = a[e]; a[e] = a[n]; a[n] = t;
    this.savePlan(p); this.createPlanScreen();
  },
  removePlanEx: function(d, e) { var p = this.getPlan(); p[d].exercises.splice(e, 1); this.savePlan(p); this.createPlanScreen(); },
  clearDay: function(d) {
    if (!confirm('🗑️ Удалить все упражнения из этого дня?')) return;
    var p = this.getPlan(); p[d].exercises = []; p[d].muscleGroup = ''; this.savePlan(p); this.createPlanScreen();
  },
  savePlanData: function() {
    alert('✅ План сохранён!');
    if (typeof Core !== 'undefined') Core.navigate('welcome');
  },

  openPickEx: function(dayIdx) {
    this.pickingForDay = dayIdx;
    var modal = document.createElement('div');
    modal.className = 'ex-modal';
    modal.id = 'pickExModal';
    modal.innerHTML =
      '<div class="ex-modal-content">' +
        '<button style="float:right;background:transparent;border:none;color:var(--text);font-size:1.5em;cursor:pointer" onclick="document.getElementById(\'pickExModal\').remove()">×</button>' +
        '<h2 style="color:var(--acc);margin-top:0">Выбери упражнение</h2>' +
        '<div class="hint" style="margin-bottom:10px">💡 Начни вводить название или категорию</div>' +
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
      if (db[i].name.toLowerCase().indexOf(search) !== -1 || (db[i].muscleGroup || '').toLowerCase().indexOf(search) !== -1) filtered.push(db[i]);
    }
    var list = document.getElementById('pickList');
    if (!list) return;
    if (filtered.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:30px;opacity:0.6">Ничего не найдено</div>';
    } else {
      var html = '';
      for (var i = 0; i < filtered.length; i++) {
        var ex = filtered[i];
        html += '<div onclick="PlanModule.addExToPlan(\'' + ex.id + '\')" style="background:var(--card);border-radius:8px;padding:12px;margin-bottom:10px;border-left:3px solid var(--acc);cursor:pointer">' +
          '<h4 style="margin:0 0 5px 0;color:var(--acc)">' + ex.name + '</h4>' +
          '<div style="font-size:0.85em;opacity:0.7">📂 ' + (ex.muscleGroup || '❓') + '</div></div>';
      }
      list.innerHTML = html;
    }
  },

  addExToPlan: function(exId) {
    if (this.pickingForDay === null) return;
    var p = this.getPlan();
    p[this.pickingForDay].exercises.push({ id: exId, sets: '' });
    this.savePlan(p);
    document.getElementById('pickExModal').remove();
    this.createPlanScreen();
  }
};

window.PlanModule = PlanModule;
module.exports = PlanModule;