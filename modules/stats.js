// modules/stats.js

const StatsModule = {
  init: function() {
    console.log('📊 Stats module initialized');
    if (typeof Logger !== 'undefined') Logger.log('Модуль статистики инициализирован', 'info');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { StatsModule.setup(); });
    } else {
      this.setup();
    }
  },

  setup: function() {
    this.createStatsScreen();
    
    if (typeof Core !== 'undefined') {
      Core.addNavButton('Статистика', 'stats', '📊');
    }
  },

  getStats: function() {
    if (typeof FTStorage !== 'undefined') return FTStorage.get('stats') || {yes:0, later:0, no:0, xp:0, level:1, streak:0, bestStreak:0};
    return {yes:0, later:0, no:0, xp:0, level:1, streak:0, bestStreak:0};
  },

  getHistory: function() {
    if (typeof FTStorage !== 'undefined') return FTStorage.get('history') || [];
    return [];
  },

  createStatsScreen: function() {
    var screen = document.getElementById('screen-stats');
    if (!screen) {
      screen = document.createElement('div');
      screen.id = 'screen-stats';
      screen.className = 'screen';
      document.getElementById('userInterface').appendChild(screen);
    }

    var stats = this.getStats();
    var history = this.getHistory();
    var todayIdx = (new Date().getDay() + 6) % 7;
    var todayStr = new Date().toISOString().slice(0, 10);

    // Подсчёт лучшего стрика
    var bestStreak = 0;
    var currentStreak = 0;
    var tempStreak = 0;
    var sortedHistory = history.slice().sort(function(a, b) {
      return new Date(a.date) - new Date(b.date);
    });
    
    for (var i = 0; i < sortedHistory.length; i++) {
      if (!sortedHistory[i].skipped && sortedHistory[i].exercises.length > 0) {
        tempStreak++;
        if (tempStreak > bestStreak) bestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }
    
    // Текущий стрик (с конца)
    for (var i = sortedHistory.length - 1; i >= 0; i--) {
      if (!sortedHistory[i].skipped && sortedHistory[i].exercises.length > 0) {
        currentStreak++;
      } else {
        break;
      }
    }

    var css = '<style>' +
      '.stat-card { background:var(--card); border-radius:10px; padding:15px; margin-bottom:15px; border:1px solid var(--brd); }' +
      '.stat-metric { text-align:center; }' +
      '.stat-metric-value { font-size:2em; font-weight:bold; color:var(--acc); line-height:1; }' +
      '.stat-metric-label { font-size:0.8em; opacity:0.7; margin-top:5px; }' +
      '.heatmap-cell { width:12px; height:12px; border-radius:2px; cursor:pointer; transition:all 0.2s; }' +
      '.heatmap-cell:hover { transform:scale(1.3); }' +
      '.hint { font-size:0.75em; opacity:0.6; margin-top:3px; }' +
      '.chart-container { position:relative; height:200px; margin:15px 0; }' +
    '</style>';

    // Ключевые метрики
    var metricsHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:15px">';
    metricsHtml += '<div class="stat-card stat-metric"><div class="stat-metric-value">' + stats.level + '</div><div class="stat-metric-label">⭐ Уровень</div></div>';
    metricsHtml += '<div class="stat-card stat-metric"><div class="stat-metric-value" style="color:#FFB347">' + currentStreak + '</div><div class="stat-metric-label">🔥 Текущий стрик</div></div>';
    metricsHtml += '<div class="stat-card stat-metric"><div class="stat-metric-value" style="color:#FFB347">' + bestStreak + '</div><div class="stat-metric-label">🏆 Лучший стрик</div></div>';
    metricsHtml += '<div class="stat-card stat-metric"><div class="stat-metric-value" style="color:#90EE90">' + stats.yes + '</div><div class="stat-metric-label">✅ Тренировок</div></div>';
    metricsHtml += '<div class="stat-card stat-metric"><div class="stat-metric-value" style="color:var(--acc)">' + stats.xp + '</div><div class="stat-metric-label">⚡ XP</div></div>';
    metricsHtml += '</div>';

    // График за последние 30 дней
    var chartHtml = '<div class="stat-card">';
    chartHtml += '<h3 style="color:var(--acc);margin:0 0 10px 0">📈 Активность за 30 дней</h3>';
    chartHtml += '<div class="hint" style="margin-bottom:10px">💡 Количество упражнений за каждый день</div>';
    chartHtml += '<div class="chart-container"><canvas id="activityChart" width="600" height="200"></canvas></div>';
    chartHtml += '</div>';

    // Тепловая карта за 90 дней
    var heatmapHtml = '<div class="stat-card">';
    heatmapHtml += '<h3 style="color:var(--acc);margin:0 0 10px 0">🗓️ Тепловая карта активности</h3>';
    heatmapHtml += '<div class="hint" style="margin-bottom:10px">💡 Цвет показывает интенсивность тренировок</div>';
    heatmapHtml += '<div id="heatmap" style="display:grid;grid-template-columns:repeat(13,1fr);gap:3px;max-width:400px;margin:0 auto"></div>';
    heatmapHtml += '<div style="display:flex;justify-content:space-between;margin-top:10px;font-size:0.75em;opacity:0.7">';
    heatmapHtml += '<span>Меньше</span>';
    heatmapHtml += '<div style="display:flex;gap:3px">';
    heatmapHtml += '<div style="width:12px;height:12px;background:var(--bg);border-radius:2px"></div>';
    heatmapHtml += '<div style="width:12px;height:12px;background:#2d5016;border-radius:2px"></div>';
    heatmapHtml += '<div style="width:12px;height:12px;background:#3f7a21;border-radius:2px"></div>';
    heatmapHtml += '<div style="width:12px;height:12px;background:#52a32d;border-radius:2px"></div>';
    heatmapHtml += '<div style="width:12px;height:12px;background:#6fcd3e;border-radius:2px"></div>';
    heatmapHtml += '</div>';
    heatmapHtml += '<span>Больше</span>';
    heatmapHtml += '</div>';
    heatmapHtml += '</div>';

    // Стрики (последние 14 дней)
    var streakHtml = '<div class="stat-card">';
    streakHtml += '<h3 style="color:var(--acc);margin:0 0 10px 0">🔥 Последние 14 дней</h3>';
    streakHtml += '<div class="hint" style="margin-bottom:10px">💡 Зелёный = тренировка, красный = пропуск</div>';
    streakHtml += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px">';
    
    for (var i = 13; i >= 0; i--) {
      var date = new Date();
      date.setDate(date.getDate() - i);
      var dateStr = date.toISOString().slice(0, 10);
      var dayRecord = null;
      for (var j = 0; j < history.length; j++) {
        if (history[j].date === dateStr) { dayRecord = history[j]; break; }
      }
      
      var color = 'var(--bg)';
      var icon = '·';
      if (dayRecord) {
        if (dayRecord.skipped) {
          color = '#e74c3c';
          icon = '✗';
        } else if (dayRecord.exercises.length > 0) {
          color = '#90EE90';
          icon = '✓';
        }
      }
      
      var dayName = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][date.getDay()];
      streakHtml += '<div style="background:' + color + ';border-radius:6px;padding:8px 4px;text-align:center;color:#fff;font-weight:bold;cursor:pointer" title="' + dateStr + '">';
      streakHtml += '<div style="font-size:0.7em;opacity:0.8">' + dayName + '</div>';
      streakHtml += '<div style="font-size:1.2em">' + icon + '</div>';
      streakHtml += '</div>';
    }
    
    streakHtml += '</div>';
    streakHtml += '</div>';

    screen.innerHTML = css +
      '<div style="padding:15px;max-width:700px;margin:0 auto">' +
        '<h2 style="color:var(--acc);margin-top:0">📊 Статистика</h2>' +
        metricsHtml +
        chartHtml +
        heatmapHtml +
        streakHtml +
      '</div>';

    // Отрисовка графика после рендера
    var self = this;
    setTimeout(function() { self.drawChart(history); }, 100);
    
    // Отрисовка тепловой карты
    setTimeout(function() { self.drawHeatmap(history); }, 200);
  },

  drawChart: function(history) {
    var canvas = document.getElementById('activityChart');
    if (!canvas) return;
    
    var ctx = canvas.getContext('2d');
    var width = canvas.width;
    var height = canvas.height;
    
    // Очистка
    ctx.clearRect(0, 0, width, height);
    
    // Данные за последние 30 дней
    var data = [];
    var labels = [];
    for (var i = 29; i >= 0; i--) {
      var date = new Date();
      date.setDate(date.getDate() - i);
      var dateStr = date.toISOString().slice(0, 10);
      
      var count = 0;
      for (var j = 0; j < history.length; j++) {
        if (history[j].date === dateStr && !history[j].skipped) {
          count = history[j].exercises.length;
          break;
        }
      }
      
      data.push(count);
      labels.push(date.getDate() + '.' + (date.getMonth() + 1));
    }
    
    var maxVal = Math.max.apply(null, data.concat([10]));
    var padding = 30;
    var chartWidth = width - padding * 2;
    var chartHeight = height - padding * 2;
    
    // Оси
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    // Линия графика
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (var i = 0; i < data.length; i++) {
      var x = padding + (i / (data.length - 1)) * chartWidth;
      var y = height - padding - (data[i] / maxVal) * chartHeight;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    
    // Точки
    ctx.fillStyle = '#FFD700';
    for (var i = 0; i < data.length; i++) {
      var x = padding + (i / (data.length - 1)) * chartWidth;
      var y = height - padding - (data[i] / maxVal) * chartHeight;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Подписи оси X (каждые 5 дней)
    ctx.fillStyle = '#888';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    for (var i = 0; i < data.length; i += 5) {
      var x = padding + (i / (data.length - 1)) * chartWidth;
      ctx.fillText(labels[i], x, height - padding + 15);
    }
  },

  drawHeatmap: function(history) {
    var container = document.getElementById('heatmap');
    if (!container) return;
    
    container.innerHTML = '';
    
    // 90 дней (13 недель × 7 дней)
    for (var i = 89; i >= 0; i--) {
      var date = new Date();
      date.setDate(date.getDate() - i);
      var dateStr = date.toISOString().slice(0, 10);
      
      var count = 0;
      for (var j = 0; j < history.length; j++) {
        if (history[j].date === dateStr && !history[j].skipped) {
          count = history[j].exercises.length;
          break;
        }
      }
      
      var cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      cell.title = dateStr + ': ' + count + ' упражнений';
      
      if (count === 0) {
        cell.style.background = 'var(--bg)';
      } else if (count <= 3) {
        cell.style.background = '#2d5016';
      } else if (count <= 6) {
        cell.style.background = '#3f7a21';
      } else if (count <= 9) {
        cell.style.background = '#52a32d';
      } else {
        cell.style.background = '#6fcd3e';
      }
      
      container.appendChild(cell);
    }
  }
};

window.StatsModule = StatsModule;
module.exports = StatsModule;