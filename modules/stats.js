// modules/stats.js

const StatsModule = {
  init: function() {
    console.log('Stats module initialized');
    if (typeof Logger !== 'undefined') Logger.log('Модуль статистики инициализирован', 'info');
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { StatsModule.setup(); });
    } else { this.setup(); }
  },
  setup: function() {
    this.createStatsScreen();
    if (typeof Core !== 'undefined') Core.addNavButton('Статистика', 'stats', '<i class="ph ph-chart-line-up"></i>');
  },
  getStats: function() {
    if (typeof FTStorage !== 'undefined') return FTStorage.get('stats') || {yes:0, later:0, no:0, xp:0, level:1, streak:0};
    return {yes:0, later:0, no:0, xp:0, level:1, streak:0};
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
    var sortedHistory = history.slice().sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
    var bestStreak = 0, tempStreak = 0;
    for (var i = 0; i < sortedHistory.length; i++) {
      if (!sortedHistory[i].skipped && sortedHistory[i].exercises && sortedHistory[i].exercises.length > 0) { tempStreak++; if (tempStreak > bestStreak) bestStreak = tempStreak; }
      else tempStreak = 0;
    }
    var currentStreak = 0;
    for (var i = sortedHistory.length - 1; i >= 0; i--) {
      if (!sortedHistory[i].skipped && sortedHistory[i].exercises && sortedHistory[i].exercises.length > 0) currentStreak++;
      else break;
    }

    var css = '<style>' +
      '.stat-card { background:var(--bg-card); border-radius:14px; padding:18px; margin-bottom:16px; border:1px solid var(--border-subtle); transition:all 0.2s; }' +
      '.stat-card:hover { border-color:var(--border-gold); transform:translateY(-2px); }' +
      '.stat-metric { text-align:center; }' +
      '.stat-metric-value { font-size:2.2em; font-weight:bold; color:var(--accent-gold); line-height:1; }' +
      '.stat-metric-label { font-size:0.8em; opacity:0.7; margin-top:6px; display:flex; align-items:center; justify-content:center; gap:4px; }' +
      '.heatmap-cell { width:12px; height:12px; border-radius:2px; cursor:pointer; transition:all 0.2s; }' +
      '.heatmap-cell:hover { transform:scale(1.3); }' +
      '.hint { font-size:0.75em; opacity:0.6; margin-top:3px; }' +
    '</style>';

    var metricsHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:20px">';
    metricsHtml += '<div class="stat-card stat-metric"><i class="ph ph-star" style="font-size:1.5em;color:var(--accent-gold)"></i><div class="stat-metric-value">' + stats.level + '</div><div class="stat-metric-label">Уровень</div></div>';
    metricsHtml += '<div class="stat-card stat-metric"><i class="ph ph-flame" style="font-size:1.5em;color:#FFB347"></i><div class="stat-metric-value" style="color:#FFB347">' + currentStreak + '</div><div class="stat-metric-label">Текущий стрик</div></div>';
    metricsHtml += '<div class="stat-card stat-metric"><i class="ph ph-trophy" style="font-size:1.5em;color:#FFB347"></i><div class="stat-metric-value" style="color:#FFB347">' + bestStreak + '</div><div class="stat-metric-label">Лучший стрик</div></div>';
    metricsHtml += '<div class="stat-card stat-metric"><i class="ph ph-check-circle" style="font-size:1.5em;color:#00ff88"></i><div class="stat-metric-value" style="color:#00ff88">' + stats.yes + '</div><div class="stat-metric-label">Тренировок</div></div>';
    metricsHtml += '<div class="stat-card stat-metric"><i class="ph ph-lightning" style="font-size:1.5em;color:var(--accent-gold)"></i><div class="stat-metric-value" style="color:var(--accent-gold)">' + stats.xp + '</div><div class="stat-metric-label">XP</div></div>';
    metricsHtml += '</div>';

    var chartHtml = '<div class="stat-card"><h3 style="font-family:var(--font-display);color:var(--accent-gold);margin:0 0 10px 0;display:flex;align-items:center;gap:10px"><i class="ph ph-chart-line-up"></i> Активность за 30 дней</h3>';
    chartHtml += '<div class="hint" style="display:flex;align-items:center;gap:4px;margin-bottom:12px"><i class="ph ph-info"></i> Количество упражнений за каждый день</div>';
    chartHtml += '<div style="position:relative;height:200px;margin:15px 0"><canvas id="activityChart" width="600" height="200"></canvas></div></div>';

    var heatmapHtml = '<div class="stat-card"><h3 style="font-family:var(--font-display);color:var(--accent-gold);margin:0 0 10px 0;display:flex;align-items:center;gap:10px"><i class="ph ph-calendar-blank"></i> Тепловая карта (90 дней)</h3>';
    heatmapHtml += '<div class="hint" style="display:flex;align-items:center;gap:4px;margin-bottom:12px"><i class="ph ph-info"></i> Цвет показывает интенсивность</div>';
    heatmapHtml += '<div id="heatmap" style="display:grid;grid-template-columns:repeat(13,1fr);gap:3px;max-width:400px;margin:0 auto"></div>';
    heatmapHtml += '<div style="display:flex;justify-content:space-between;margin-top:12px;font-size:0.75em;opacity:0.7;align-items:center"><span>Меньше</span><div style="display:flex;gap:3px"><div style="width:12px;height:12px;background:var(--bg-primary);border-radius:2px;border:1px solid var(--border-subtle)"></div><div style="width:12px;height:12px;background:#2d5016;border-radius:2px"></div><div style="width:12px;height:12px;background:#3f7a21;border-radius:2px"></div><div style="width:12px;height:12px;background:#52a32d;border-radius:2px"></div><div style="width:12px;height:12px;background:#6fcd3e;border-radius:2px"></div></div><span>Больше</span></div></div>';

    var streakHtml = '<div class="stat-card"><h3 style="font-family:var(--font-display);color:var(--accent-gold);margin:0 0 10px 0;display:flex;align-items:center;gap:10px"><i class="ph ph-flame"></i> Последние 14 дней</h3>';
    streakHtml += '<div class="hint" style="display:flex;align-items:center;gap:4px;margin-bottom:12px"><i class="ph ph-info"></i> Зелёный = тренировка, красный = пропуск</div>';
    streakHtml += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">';
    for (var i = 13; i >= 0; i--) {
      var date = new Date(); date.setDate(date.getDate() - i);
      var dateStr = date.toISOString().slice(0, 10);
      var dayRecord = null;
      for (var j = 0; j < history.length; j++) if (history[j].date === dateStr) { dayRecord = history[j]; break; }
      var color = 'var(--bg-primary)', icon = 'ph-circle';
      if (dayRecord) {
        if (dayRecord.skipped) { color = '#ff3366'; icon = 'ph-x'; }
        else if (dayRecord.exercises && dayRecord.exercises.length > 0) { color = '#00ff88'; icon = 'ph-check'; }
      }
      var dayName = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][date.getDay()];
      streakHtml += '<div style="background:' + color + ';border-radius:8px;padding:10px 4px;text-align:center;color:#fff;font-weight:bold;cursor:pointer;border:1px solid ' + (color === 'var(--bg-primary)' ? 'var(--border-subtle)' : color) + '" title="' + dateStr + '"><div style="font-size:0.7em;opacity:0.8;margin-bottom:2px">' + dayName + '</div><i class="ph ' + icon + '" style="font-size:1.2em"></i></div>';
    }
    streakHtml += '</div></div>';

    screen.innerHTML = css + '<div style="padding:16px;max-width:700px;margin:0 auto"><h2 style="font-family:var(--font-display);font-size:2em;margin-bottom:20px;color:var(--accent-gold);display:flex;align-items:center;gap:12px"><i class="ph ph-chart-line-up"></i> Статистика</h2>' + metricsHtml + chartHtml + heatmapHtml + streakHtml + '</div>';

    var self = this;
    setTimeout(function() { self.drawChart(history); }, 100);
    setTimeout(function() { self.drawHeatmap(history); }, 200);
  },

  drawChart: function(history) {
    var canvas = document.getElementById('activityChart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var width = canvas.width, height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    var data = [], labels = [];
    for (var i = 29; i >= 0; i--) {
      var date = new Date(); date.setDate(date.getDate() - i);
      var dateStr = date.toISOString().slice(0, 10);
      var count = 0;
      for (var j = 0; j < history.length; j++) if (history[j].date === dateStr && !history[j].skipped) { count = history[j].exercises ? history[j].exercises.length : 0; break; }
      data.push(count);
      labels.push(date.getDate() + '.' + (date.getMonth() + 1));
    }
    var maxVal = Math.max.apply(null, data.concat([10]));
    var padding = 30, chartWidth = width - padding * 2, chartHeight = height - padding * 2;
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padding, padding); ctx.lineTo(padding, height - padding); ctx.lineTo(width - padding, height - padding); ctx.stroke();
    ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 2; ctx.beginPath();
    for (var i = 0; i < data.length; i++) {
      var x = padding + (i / (data.length - 1)) * chartWidth;
      var y = height - padding - (data[i] / maxVal) * chartHeight;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = '#d4af37';
    for (var i = 0; i < data.length; i++) {
      var x = padding + (i / (data.length - 1)) * chartWidth;
      var y = height - padding - (data[i] / maxVal) * chartHeight;
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#888'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
    for (var i = 0; i < data.length; i += 5) {
      var x = padding + (i / (data.length - 1)) * chartWidth;
      ctx.fillText(labels[i], x, height - padding + 15);
    }
  },

  drawHeatmap: function(history) {
    var container = document.getElementById('heatmap');
    if (!container) return;
    container.innerHTML = '';
    for (var i = 89; i >= 0; i--) {
      var date = new Date(); date.setDate(date.getDate() - i);
      var dateStr = date.toISOString().slice(0, 10);
      var count = 0;
      for (var j = 0; j < history.length; j++) if (history[j].date === dateStr && !history[j].skipped) { count = history[j].exercises ? history[j].exercises.length : 0; break; }
      var cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      cell.title = dateStr + ': ' + count + ' упражнений';
      if (count === 0) cell.style.background = 'var(--bg-primary)';
      else if (count <= 3) cell.style.background = '#2d5016';
      else if (count <= 6) cell.style.background = '#3f7a21';
      else if (count <= 9) cell.style.background = '#52a32d';
      else cell.style.background = '#6fcd3e';
      container.appendChild(cell);
    }
  }
};

window.StatsModule = StatsModule;
module.exports = StatsModule;