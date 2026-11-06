// modules/achievements.js

const AchievementsModule = {
  _allCache: null,

  init: function() {
    if (typeof Logger !== 'undefined') Logger.log('Модуль достижений инициализирован', 'info');
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { AchievementsModule.setup(); });
    } else { this.setup(); }
  },

  setup: function() {
    this.createAchievementsScreen();
    if (typeof Core !== 'undefined') {
      Core.addNavButton('Достижения', 'achievements', '<i class="ph ph-trophy"></i>');
      Core.registerScreen('achievements', function() { AchievementsModule.createAchievementsScreen(); });
    }
  },

  getStats: function() {
    var defaults = {yes:0, later:0, no:0, xp:0, level:1, streak:0};
    if (typeof FTStorage !== 'undefined') {
      var s = FTStorage.get('stats') || {};
      for (var k in defaults) if (s[k] === undefined) s[k] = defaults[k];
      return s;
    }
    return defaults;
  },

  getHistory: function() { return (typeof FTStorage !== 'undefined' ? FTStorage.get('history') : null) || []; },
  getUnlockedAchievements: function() { return (typeof FTStorage !== 'undefined' ? FTStorage.get('unlocked_achievements') : null) || []; },
  saveUnlockedAchievements: function(a) { if (typeof FTStorage !== 'undefined') FTStorage.set('unlocked_achievements', a); },

  getAllAchievements: function() {
    if (this._allCache) return this._allCache;
    var achievements = [
      { id: 'first_workout', name: 'Первый шаг', description: 'Заверши первую тренировку', icon: 'ph-shoe-prints', condition: function(stats) { return stats.yes >= 1; } },
      { id: 'streak_3', name: 'Разогрев', description: 'Серия из 3 дней подряд', icon: 'ph-flame', condition: function(stats) { return stats.streak >= 3; } },
      { id: 'streak_7', name: 'Неделя силы', description: 'Серия из 7 дней подряд', icon: 'ph-fire', condition: function(stats) { return stats.streak >= 7; } },
      { id: 'streak_30', name: 'Месяц дисциплины', description: 'Серия из 30 дней подряд', icon: 'ph-calendar-check', condition: function(stats) { return stats.streak >= 30; } },
      { id: 'level_5', name: 'Продвинутый', description: 'Достигни 5 уровня', icon: 'ph-star', condition: function(stats) { return stats.level >= 5; } },
      { id: 'level_10', name: 'Эксперт', description: 'Достигни 10 уровня', icon: 'ph-star-four', condition: function(stats) { return stats.level >= 10; } },
      { id: 'level_20', name: 'Мастер', description: 'Достигни 20 уровня', icon: 'ph-crown', condition: function(stats) { return stats.level >= 20; } },
      { id: 'level_50', name: 'Легенда', description: 'Достигни 50 уровня', icon: 'ph-diamond', condition: function(stats) { return stats.level >= 50; } },
      { id: 'workouts_10', name: 'Десяточка', description: 'Заверши 10 тренировок', icon: 'ph-check-circle', condition: function(stats) { return stats.yes >= 10; } },
      { id: 'workouts_50', name: 'Полтинник', description: 'Заверши 50 тренировок', icon: 'ph-medal', condition: function(stats) { return stats.yes >= 50; } },
      { id: 'workouts_100', name: 'Сотня', description: 'Заверши 100 тренировок', icon: 'ph-trophy', condition: function(stats) { return stats.yes >= 100; } },
      { id: 'xp_1000', name: 'Тысячник', description: 'Набери 1000 XP всего', icon: 'ph-lightning', condition: function(stats) { return Core.utils.totalXp(stats) >= 1000; } },
      { id: 'exercises_added', name: 'Коллекционер', description: 'Добавь 5 упражнений в базу', icon: 'ph-books', condition: function(stats) {
        var db = (typeof FTStorage !== 'undefined' ? FTStorage.get('db') : null) || [];
        return db.length >= 5;
      }},
      { id: 'plan_filled', name: 'Планомерный', description: 'Заполни план на 5 дней', icon: 'ph-calendar', condition: function(stats) {
        var plan = (typeof FTStorage !== 'undefined' ? FTStorage.get('plan') : null) || [];
        var filled = 0;
        for (var i = 0; i < plan.length; i++) {
          if (plan[i].exercises && plan[i].exercises.length > 0) filled++;
        }
        return filled >= 5;
      }},
      { id: 'survey_completed', name: 'Аналитик', description: 'Пройди опрос после тренировки', icon: 'ph-clipboard-text', condition: function(stats, history) {
        for (var i = 0; i < history.length; i++) {
          if (history[i].survey && Object.keys(history[i].survey).length > 0) return true;
        }
        return false;
      }}
    ];
    this._allCache = achievements;
    return achievements;
  },

  checkAchievements: function() {
    var stats = this.getStats();
    var history = this.getHistory();
    var unlocked = this.getUnlockedAchievements();
    var all = this.getAllAchievements();
    var newUnlocked = [];

    for (var i = 0; i < all.length; i++) {
      var ach = all[i];
      if (unlocked.indexOf(ach.id) === -1 && ach.condition(stats, history)) {
        unlocked.push(ach.id);
        newUnlocked.push(ach);
      }
    }

    if (newUnlocked.length > 0) {
      this.saveUnlockedAchievements(unlocked);
      for (var i = 0; i < newUnlocked.length; i++) {
        var ach = newUnlocked[i];
        if (typeof Logger !== 'undefined') Logger.log('🏆 Достижение разблокировано: ' + ach.name, 'info');
        if (typeof showAchievementToast === 'function') {
          (function(a) {
            setTimeout(function() {
              showAchievementToast(a.name, a.description, a.icon);
            }, 200 + i * 300);
          })(ach);
        }
      }
    }

    return newUnlocked;
  },

  createAchievementsScreen: function() {
    var esc = Core.utils.escapeHtml;
    var screen = document.getElementById('screen-achievements');
    if (!screen) {
      screen = document.createElement('div');
      screen.id = 'screen-achievements';
      screen.className = 'screen';
      document.getElementById('userInterface').appendChild(screen);
    }

    var unlocked = this.getUnlockedAchievements();
    var all = this.getAllAchievements();

    var css = '<style>' +
      '.ach-card { background:var(--bg-card); border-radius:14px; padding:18px; margin-bottom:12px; border:1px solid var(--border-subtle); transition:all 0.2s; display:flex; align-items:center; gap:16px; }' +
      '.ach-card.unlocked { border-color:var(--border-gold); background:var(--accent-gold-dim); }' +
      '.ach-card.locked { opacity:0.5; }' +
      '.ach-icon { width:56px; height:56px; border-radius:50%; background:var(--bg-primary); border:2px solid var(--border-subtle); display:flex; align-items:center; justify-content:center; font-size:1.8em; color:var(--text-muted); flex-shrink:0; }' +
      '.ach-card.unlocked .ach-icon { border-color:var(--accent-gold); color:var(--accent-gold); background:rgba(212,175,55,0.1); }' +
      '.ach-info { flex:1; min-width:0; }' +
      '.ach-name { font-weight:700; font-size:1.05em; color:var(--text-primary); margin-bottom:4px; }' +
      '.ach-desc { font-size:0.85em; color:var(--text-secondary); }' +
      '.ach-status { font-size:0.75em; margin-top:4px; }' +
      '.ach-status.unlocked { color:var(--accent-gold); font-weight:600; }' +
      '.ach-status.locked { color:var(--text-muted); }' +
      '.progress-bar { height:6px; background:var(--bg-primary); border-radius:3px; overflow:hidden; margin-top:8px; border:1px solid var(--border-subtle); }' +
      '.progress-fill { height:100%; background:linear-gradient(90deg, var(--accent-gold), var(--accent-gold-light)); border-radius:3px; transition:width 0.5s; }' +
      '@media (prefers-reduced-motion: reduce) { .ach-card, .progress-fill { transition: none !important; } }' +
    '</style>';

    var html = css + '<div style="padding:16px;max-width:700px;margin:0 auto">';
    html += '<h2 style="font-family:var(--font-display);font-size:2em;margin-bottom:10px;color:var(--accent-gold);display:flex;align-items:center;gap:12px"><i class="ph ph-trophy"></i> Достижения</h2>';
    html += '<div style="background:var(--accent-gold-dim);border:1px solid var(--border-gold);border-radius:10px;padding:12px 16px;margin-bottom:18px;font-size:0.9em;display:flex;align-items:center;gap:10px">';
    html += '<i class="ph ph-medal" style="color:var(--accent-gold);font-size:1.3em"></i>';
    html += '<div><strong style="color:var(--accent-gold)">' + unlocked.length + ' из ' + all.length + '</strong> достижений разблокировано</div>';
    html += '</div>';

    var progressPercent = all.length > 0 ? Math.round((unlocked.length / all.length) * 100) : 0;
    html += '<div style="margin-bottom:20px">';
    html += '<div style="display:flex;justify-content:space-between;font-size:0.85em;margin-bottom:6px"><span style="color:var(--text-secondary)">Общий прогресс</span><span style="color:var(--accent-gold);font-weight:600">' + progressPercent + '%</span></div>';
    html += '<div class="progress-bar"><div class="progress-fill" style="width:' + progressPercent + '%"></div></div>';
    html += '</div>';

    var sorted = all.slice().sort(function(a, b) {
      var aU = unlocked.indexOf(a.id) !== -1;
      var bU = unlocked.indexOf(b.id) !== -1;
      if (aU && !bU) return -1;
      if (!aU && bU) return 1;
      return 0;
    });

    for (var i = 0; i < sorted.length; i++) {
      var ach = sorted[i];
      var isUnlocked = unlocked.indexOf(ach.id) !== -1;
      html += '<div class="ach-card ' + (isUnlocked ? 'unlocked' : 'locked') + '">';
      html += '<div class="ach-icon"><i class="ph ' + (isUnlocked ? 'ph-fill ' : '') + esc(ach.icon) + '"></i></div>';
      html += '<div class="ach-info">';
      html += '<div class="ach-name">' + esc(ach.name) + '</div>';
      html += '<div class="ach-desc">' + esc(ach.description) + '</div>';
      html += '<div class="ach-status ' + (isUnlocked ? 'unlocked' : 'locked') + '">' + (isUnlocked ? '✓ Разблокировано' : '🔒 Заблокировано') + '</div>';
      html += '</div></div>';
    }

    html += '</div>';
    screen.innerHTML = html;
  }
};

window.AchievementsModule = AchievementsModule;
module.exports = AchievementsModule;