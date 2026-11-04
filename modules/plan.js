// modules/plan.js

const PlanModule = {
  pickingForDay: null,
  expandedDay: null,

  init: function() {
    console.log('Plan module initialized');
    if (typeof Logger !== 'undefined') Logger.log('Модуль плана инициализирован', 'info');
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { PlanModule.setup(); });
    } else { this.setup(); }
  },

  setup: function() {
    this.createPlanScreen();
    if (typeof Core !== 'undefined') Core.addNavButton('План тренировок', 'plan', '<i class="ph ph-calendar"></i>');
  },

  getPlan: function() { if (typeof FTStorage !== 'undefined') return FTStorage.get('plan') || []; return []; },
  savePlan: function(p) { if (typeof FTStorage !== 'undefined') FTStorage.set('plan', p); },
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
      '.plan-day-card { background:var(--bg-card); border-radius:14px; margin-bottom:12px; border:1px solid var(--border-subtle); overflow:hidden; transition:all 0.3s; }' +
      '.plan-day-card:hover { border-color:var(--border-gold); }' +
      '.plan-day-card.today { border-color:var(--accent-gold); box-shadow:0 0 20px rgba(212,175,55,0.15); }' +
      '.plan-day-header { padding:16px 20px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; transition:all 0.2s; }' +
      '.plan-day-header:hover { background:rgba(255,255,255,0.03); }' +
      '.plan-day-header.active { background:rgba(212,175,55,0.08); border-bottom:1px solid var(--border-subtle); }' +
      '.plan-day-body { padding:20px; display:none; }' +
      '.plan-day-body.active { display:block; animation:fadeIn 0.3s ease-out; }' +
      '.plan-ex { background:var(--bg-primary); padding:12px 14px; border-radius:10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; border-left:3px solid var(--accent-gold); }' +
      '.day-badge { display:inline-flex; align-items:center; justify-content:center; min-width:24px; height:24px; padding:2px 8px; border-radius:12px; font-size:0.75em; font-weight:700; background:var(--accent-gold); color:#000; }' +
      '.today-dot { width:8px; height:8px; background:var(--accent-success); border-radius:50%; display:inline-block; margin-left:8px; box-shadow:0 0 8px var(--accent-success); }' +
      '.hint { font-size:0.75em; opacity:0.6; margin-top:3px; }' +
    '</style>';

    var html = css + '<div style="padding:8px;max-width:700px;margin:0 auto">';
    html += '<h2 style="font-family:var(--font-display);font-size:1.8em;margin-bottom:10px;color:var(--accent-gold);display:flex;align-items:center;gap:12px"><i class="ph ph-calendar"></i> План тренировок</h2>';
    html += '<div class="hint" style="margin-bottom:18px;display:flex;align-items:center;gap:6px"><i class="ph ph-info"></i> Нажми на день, чтобы раскрыть и настроить упражнения</div>';

    for (var dayIdx = 0; dayIdx < 7; dayIdx++) {
      var day = plan[dayIdx];
      var isToday = dayIdx === todayIdx;
      var isExpanded = this.expandedDay === dayIdx;
      var exCount = day.exercises.length;

      html += '<div class="plan-day-card ' + (isToday ? 'today' : '') + '">';
      html += '<div class="plan-day-header ' + (isExpanded ? 'active' : '') + '" onclick="PlanModule.toggleDay(' + dayIdx + ')">';
      html += '<div style="display:flex;align-items:center;gap:12px;flex:1">';
      html += '<div style="width:44px;height:44px;border-radius:10px;background:' + (isToday ? 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold-light))' : 'var(--bg-primary)') + ';color:' + (isToday ? '#000' : 'var(--accent-gold)') + ';display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.9em;border:1px solid ' + (isToday ? 'var(--accent-gold)' : 'var(--border-subtle)') + '">' + DAYS_SHORT[dayIdx] + '</div>';
      html += '<div style="flex:1">';
      html += '<div style="font-weight:600;font-size:1em;display:flex;align-items:center;gap:6px">' + day.dayName;
      if (isToday) html += '<span class="today-dot" title="Сегодня"></span>';
      html += '</div>';
      html += '<div style="font-size:0.8em;opacity:0.7;margin-top:2px;display:flex;align-items:center;gap:6px">';
      if (day.muscleGroup) html += '<i class="ph ph-tag"></i> ' + day.muscleGroup;
      if (exCount > 0) html += ' · <i class="ph ph-list-dashes"></i> ' + exCount + ' упр.';
      if (!day.muscleGroup && exCount === 0) html += '<i class="ph ph-info"></i> Не настроено';
      html += '</div>';
      html += '</div></div>';
      html += '<i class="ph ' + (isExpanded ? 'ph-caret-up' : 'ph-caret-down') + '" style="font-size:1.3em;color:var(--accent-gold)"></i>';
      html += '</div>';

      if (isExpanded) {
        html += '<div class="plan-day-body active">';
        html += '<div style="margin-bottom:16px">';
        html += '<label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.9em;display:flex;align-items:center;gap:6px"><i class="ph ph-target" style="color:var(--accent-gold)"></i> Группа мышц:</label>';
        html += '<input type="text" value="' + (day.muscleGroup || '') + '" placeholder="Например: Грудь + Трицепс" style="width:100%;padding:10px;background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary);font-size:0.95em" oninput="PlanModule.updateMuscleGroup(' + dayIdx + ',this.value)">';
        html += '<div class="hint" style="display:flex;align-items:center;gap:4px;margin-top:4px"><i class="ph ph-info"></i> Какая группа мышц тренируется</div>';
        html += '</div>';

        html += '<div><label style="display:block;margin-bottom:10px;font-weight:600;font-size:0.9em;display:flex;align-items:center;gap:6px"><i class="ph ph-barbell" style="color:var(--accent-gold)"></i> Упражнения:</label>';
        if (day.exercises.length === 0) {
          html += '<div style="text-align:center;padding:24px;opacity:0.6;font-style:italic;display:flex;flex-direction:column;align-items:center;gap:8px"><i class="ph ph-dumbbell" style="font-size:2em;color:var(--accent-gold)"></i>Нет упражнений. Добавь первое!</div>';
        } else {
          for (var exIdx = 0; exIdx < day.exercises.length; exIdx++) {
            var exRef = day.exercises[exIdx];
            var ex = null;
            for (var i = 0; i < db.length; i++) if (db[i].id === exRef.id) { ex = db[i]; break; }
            var name = ex ? ex.name : '(удалено из базы)';
            var category = ex && ex.muscleGroup ? ex.muscleGroup : 'Без категории';
            html += '<div class="plan-ex">';
            html += '<div style="flex:1;min-width:150px">';
            html += '<div style="font-weight:600;font-size:0.95em;margin-bottom:4px;display:flex;align-items:center;gap:6px"><span style="color:var(--accent-gold);font-weight:700">' + (exIdx + 1) + '.</span> ' + name + '</div>';
            html += '<div style="font-size:0.75em;opacity:0.6;margin-bottom:6px;display:flex;align-items:center;gap:4px"><i class="ph ph-tag"></i> ' + category + '</div>';
            html += '<input type="text" value="' + (exRef.sets || '') + '" placeholder="3×10 или 4×8" style="width:100%;padding:8px;background:var(--bg-secondary);border:1px solid var(--border-subtle);border-radius:6px;color:var(--text-primary);font-size:0.85em" oninput="PlanModule.updateSets(' + dayIdx + ',' + exIdx + ',this.value)">';
            html += '<div class="hint" style="display:flex;align-items:center;gap:4px;margin-top:4px"><i class="ph ph-info"></i> Подходы × Повторы</div>';
            html += '</div>';
            html += '<div style="display:flex;gap:6px">';
            html += '<button class="btn btn-secondary" style="padding:6px 10px;font-size:0.85em" ' + (exIdx === 0 ? 'disabled style="opacity:0.3"' : '') + ' onclick="PlanModule.movePlanEx(' + dayIdx + ',' + exIdx + ',-1)"><i class="ph ph-arrow-up"></i></button>';
            html += '<button class="btn btn-secondary" style="padding:6px 10px;font-size:0.85em" ' + (exIdx === day.exercises.length - 1 ? 'disabled style="opacity:0.3"' : '') + ' onclick="PlanModule.movePlanEx(' + dayIdx + ',' + exIdx + ',1)"><i class="ph ph-arrow-down"></i></button>';
            html += '<button class="btn btn-danger" style="padding:6px 10px;font-size:0.85em" onclick="PlanModule.removePlanEx(' + dayIdx + ',' + exIdx + ')"><i class="ph ph-trash"></i></button>';
            html += '</div></div>';
          }
        }
        html += '</div>';

        html += '<div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">';
        html += '<button class="btn btn-primary" style="flex:1;padding:12px;font-size:0.95em" onclick="PlanModule.openPickEx(' + dayIdx + ')"><i class="ph ph-plus-circle"></i> Добавить из базы</button>';
        if (day.exercises.length > 0) {
          html += '<button class="btn btn-secondary" style="padding:12px 16px;font-size:0.95em" onclick="PlanModule.clearDay(' + dayIdx + ')"><i class="ph ph-trash"></i> Очистить день</button>';
        }
        html += '</div></div>';
      }

      html += '</div>';
    }

    html += '<button class="btn btn-primary" style="width:100%;padding:14px;font-size:1em;font-weight:600;margin-top:16px" onclick="PlanModule.savePlanData()"><i class="ph ph-floppy-disk"></i> Сохранить план</button>';
    html += '</div>';

    screen.innerHTML = html;
  },

  toggleDay: function(dayIdx) {
    this.expandedDay = this.expandedDay === dayIdx ? null : dayIdx;
    this.createPlanScreen();
  },

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
    if (!confirm('Удалить все упражнения из этого дня?')) return;
    var p = this.getPlan(); p[d].exercises = []; p[d].muscleGroup = ''; this.savePlan(p); this.createPlanScreen();
  },
  savePlanData: function() {
    alert('План сохранён!');
    if (typeof Core !== 'undefined') Core.navigate('welcome');
  },

  openPickEx: function(dayIdx) {
    this.pickingForDay = dayIdx;
    var modal = document.createElement('div');
    modal.className = 'ex-modal';
    modal.id = 'pickExModal';
    modal.innerHTML =
      '<div class="ex-modal-content">' +
        '<button style="float:right;background:transparent;border:none;color:var(--text-secondary);font-size:1.5em;cursor:pointer" onclick="document.getElementById(\'pickExModal\').remove()"><i class="ph ph-x"></i></button>' +
        '<h2 style="font-family:var(--font-display);color:var(--accent-gold);margin-top:0;display:flex;align-items:center;gap:10px"><i class="ph ph-magnifying-glass"></i> Выбери упражнение</h2>' +
        '<div class="hint" style="margin-bottom:12px;display:flex;align-items:center;gap:6px"><i class="ph ph-info"></i> Начни вводить название или категорию</div>' +
        '<input type="text" id="pickSearch" placeholder="Поиск..." oninput="PlanModule.renderPickList()" style="width:100%;padding:10px;background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary);margin-bottom:12px;font-size:1em">' +
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
      list.innerHTML = '<div style="text-align:center;padding:30px;opacity:0.6"><i class="ph ph-magnifying-glass" style="font-size:2em;color:var(--accent-gold);margin-bottom:8px;display:block"></i>Ничего не найдено</div>';
    } else {
      var html = '';
      for (var i = 0; i < filtered.length; i++) {
        var ex = filtered[i];
        html += '<div onclick="PlanModule.addExToPlan(\'' + ex.id + '\')" style="background:var(--bg-card);border-radius:10px;padding:14px;margin-bottom:10px;border:1px solid var(--border-subtle);cursor:pointer;transition:all 0.2s" onmouseover="this.style.borderColor=\'var(--border-gold)\'" onmouseout="this.style.borderColor=\'var(--border-subtle)\'">' +
          '<h4 style="margin:0 0 6px 0;color:var(--accent-gold);display:flex;align-items:center;gap:8px"><i class="ph ph-barbell"></i> ' + ex.name + '</h4>' +
          '<div style="font-size:0.85em;opacity:0.7;display:flex;align-items:center;gap:4px"><i class="ph ph-tag"></i> ' + (ex.muscleGroup || 'Без категории') + '</div></div>';
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