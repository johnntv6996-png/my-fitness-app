// modules/stats.js

const StatsModule = {
  chartScrollOffset: 0,
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
      '.stat-metric-label { font-size:0.8em; opacity:0.7; margin-top:6px; display:flex; align-items:center; justify-content:center; gap:4px; color:var(--text-secondary); }' +
      '.heatmap-cell { width:12px; height:12px; border-radius:2px; cursor:pointer; transition:all 0.2s; }' +
      '.heatmap-cell:hover { transform:scale(1.3); }' +
      '.hint { font-size:0.75em; opacity:0.6; margin-top:3px; color:var(--text-secondary); }' +
      '.chart-nav-btn { width:36px; height:36px; border-radius:50%; background:var(--bg-card); border:1px solid var(--border-gold); color:var(--accent-gold); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s; flex-shrink:0; }' +
      '.chart-nav-btn:hover { background:var(--accent-gold); color:#000; }' +
      '.chart-nav-btn:disabled { opacity:0.3; cursor:not-allowed; }' +
      '.chart-container { position:relative; overflow:hidden; border-radius:12px; background:var(--bg-primary); border:1px solid var(--border-subtle); }' +
      '.chart-scroll { overflow-x:auto; scroll-behavior:smooth; scrollbar-width:thin; scrollbar-color:var(--accent-gold) transparent; }' +
      '.chart-scroll::-webkit-scrollbar { height: 6px; }' +
      '.chart-scroll::-webkit-scrollbar-thumb { background:var(--accent-gold); border-radius:3px; }' +
      '@media (max-width: 600px) { .stat-metric-value { font-size:1.6em; } .stat-card { padding:14px; } }' +
    '</style>';

    var metricsHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(110px, 1fr));gap:10px;margin-bottom:20px">';
    metricsHtml += '<div class="stat-card stat-metric"><i class="ph ph-star w-icon" style="font-size:1.5em"></i><div class="stat-metric-value">' + stats.level + '</div><div class="stat-metric-label">Уровень</div></div>';
    metricsHtml += '<div class="stat-card stat-metric"><i class="ph ph-flame w-icon" style="font-size:1.5em"></i><div class="stat-metric-value">' + currentStreak + '</div><div class="stat-metric-label">Текущий стрик</div></div>';
    metricsHtml += '<div class="stat-card stat-metric"><i class="ph ph-trophy w-icon" style="font-size:1.5em"></i><div class="stat-metric-value">' + bestStreak + '</div><div class="stat-metric-label">Лучший стрик</div></div>';
    metricsHtml += '<div class="stat-card stat-metric"><i class="ph ph-check-circle w-icon" style="font-size:1.5em"></i><div class="stat-metric-value">' + stats.yes + '</div><div class="stat-metric-label">Тренировок</div></div>';
    metricsHtml += '<div class="stat-card stat-metric"><i class="ph ph-lightning w-icon" style="font-size:1.5em"></i><div class="stat-metric-value">' + stats.xp + '</div><div class="stat-metric-label">XP</div></div>';
    metricsHtml += '</div>';

    var chartHtml = '<div class="stat-card"><h3 style="font-family:var(--font-display);color:var(--accent-gold);margin:0 0 10px 0;display:flex;align-items:center;gap:10px"><i class="ph ph-chart-line-up"></i> Активность за 30 дней</h3>';
    chartHtml += '<div class="hint" style="display:flex;align-items:center;gap:4px;margin-bottom:12px"><i class="ph ph-info"></i> Количество упражнений за каждый день. Листай для навигации.</div>';
    chartHtml += '<div class="chart-container">';
    chartHtml += '<div style="display:flex;align-items:center;gap:8px;padding:10px">';
    chartHtml += '<button class="chart-nav-btn" id="chartPrevBtn" onclick="StatsModule.scrollChart(-100)"><i class="ph ph-caret-left"></i></button>';
    chartHtml += '<div class="chart-scroll" id="chartScroll" style="flex:1">';
    chartHtml += '<canvas id="activityChart" width="800" height="220" style="display:block;min-width:600px"></canvas>';
    chartHtml += '</div>';
    chartHtml += '<button class="chart-nav-btn" id="chartNextBtn" onclick="StatsModule.scrollChart(100)"><i class="ph ph-caret-right"></i></button>';
    chartHtml += '</div></div></div>';

    var heatmapHtml = '<div class="stat-card"><h3 style="font-family:var(--font-display);color:var(--accent-gold);margin:0 0 10px 0;display:flex;align-items:center;gap:10px"><i class="ph ph-calendar-blank"></i> Тепловая карта (90 дней)</h3>';
    heatmapHtml += '<div class="hint" style="display:flex;align-items:center;gap:4px;margin-bottom:12px"><i class="ph ph-info"></i> Цвет показывает интенсивность</div>';
    heatmapHtml += '<div id="heatmap" style="display:grid;grid-template-columns:repeat(13,1fr);gap:3px;max-width:400px;margin:0 auto"></div>';
    heatmapHtml += '<div style="display:flex;justify-content:space-between;margin-top:12px;font-size:0.75em;opacity:0.7;align-items:center"><span>Меньше</span><div style="display:flex;gap:3px"><div style="width:12px;height:12px;background:var(--bg-primary);border-radius:2px;border:1px solid var(--border-subtle)"></div><div style="width:12px;height:12px;background:rgba(212,175,55,0.2);border-radius:2px"></div><div style="width:12px;height:12px;background:rgba(212,175,55,0.4);border-radius:2px"></div><div style="width:12px;height:12px;background:rgba(212,175,55,0.7);border-radius:2px"></div><div style="width:12px;height:12px;background:var(--accent-gold);border-radius:2px"></div></div><span>Больше</span></div></div>';

    var streakHtml = '<div class="stat-card"><h3 style="font-family:var(--font-display);color:var(--accent-gold);margin:0 0 10px 0;display:flex;align-items:center;gap:10px"><i class="ph ph-flame"></i> Последние 14 дней</h3>';
    streakHtml += '<div class="hint" style="display:flex;align-items:center;gap:4px;margin-bottom:12px"><i class="ph ph-info"></i> Зелёный = тренировка, красный = пропуск</div>';
    streakHtml += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">';
    for (var i = 13; i >= 0; i--) {
      var date = new Date(); date.setDate(date.getDate() - i);
      var dateStr = date.toISOString().slice(0, 10);
      var dayRecord = null;
      for (var j = 0; j < history.length; j++) if (history[j].date === dateStr) { dayRecord = history[j]; break; }
      var bgColor = 'var(--bg-primary)', iconClass = 'ph-circle', iconColor = 'var(--text-muted)';
      if (dayRecord) {
        if (dayRecord.skipped) { bgColor = 'rgba(248,113,113,0.15)'; iconClass = 'ph-x'; iconColor = 'var(--accent-error)'; }
        else if (dayRecord.exercises && dayRecord.exercises.length > 0) { bgColor = 'rgba(74,222,128,0.15)'; iconClass = 'ph-check'; iconColor = 'var(--accent-success)'; }
      }
      var dayName = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][date.getDay()];
      streakHtml += '<div style="background:' + bgColor + ';border-radius:8px;padding:10px 4px;text-align:center;cursor:pointer;border:1px solid ' + (bgColor === 'var(--bg-primary)' ? 'var(--border-subtle)' : 'transparent') + '" title="' + dateStr + '"><div style="font-size:0.7em;opacity:0.8;margin-bottom:2px;color:var(--text-secondary)">' + dayName + '</div><i class="ph ' + iconClass + '" style="font-size:1.2em;color:' + iconColor + '"></i></div>';
    }
    streakHtml += '</div></div>';

    screen.innerHTML = css + '<div style="padding:16px;max-width:700px;margin:0 auto"><h2 style="font-family:var(--font-display);font-size:2em;margin-bottom:20px;color:var(--accent-gold);display:flex;align-items:center;gap:12px"><i class="ph ph-chart-line-up"></i> Статистика</h2>' + metricsHtml + chartHtml + heatmapHtml + streakHtml + '</div>';

    var self = this;
    setTimeout(function() { self.drawChart(history); }, 100);
    setTimeout(function() { self.drawHeatmap(history); }, 200);
    setTimeout(function() { self.updateChartButtons(); }, 300);
  },

  scrollChart: function(delta) {
    var container = document.getElementById('chartScroll');
    if (container) {
      container.scrollBy({ left: delta, behavior: 'smooth' });
      setTimeout(function() { StatsModule.updateChartButtons(); }, 350);
    }
  },

  updateChartButtons: function() {
    var container = document.getElementById('chartScroll');
    if (!container) return;
    var prevBtn = document.getElementById('chartPrevBtn');
    var nextBtn = document.getElementById('chartNextBtn');
    if (prevBtn) prevBtn.disabled = container.scrollLeft <= 5;
    if (nextBtn) nextBtn.disabled = container.scrollLeft >= container.scrollWidth - container.clientWidth - 5;
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
    var padding = 40, chartWidth = width - padding * 2, chartHeight = height - padding * 2;
    // Сетка
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (var i = 0; i <= 4; i++) {
      var y = padding + (i / 4) * chartHeight;
      ctx.beginPath(); ctx.moveTo(padding, y); ctx.lineTo(width - padding, y); ctx.stroke();
    }
    // Оси
    ctx.strokeStyle = 'rgba(212,175,55,0.3)';
    ctx.beginPath(); ctx.moveTo(padding, padding); ctx.lineTo(padding, height - padding); ctx.lineTo(width - padding, height - padding); ctx.stroke();
    // Линия графика
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (var i = 0; i < data.length; i++) {
      var x = padding + (i / (data.length - 1)) * chartWidth;
      var y = height - padding - (data[i] / maxVal) * chartHeight;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Градиент под линией
    var gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
    gradient.addColorStop(0, 'rgba(212,175,55,0.3)');
    gradient.addColorStop(1, 'rgba(212,175,55,0)');
    ctx.lineTo(padding + chartWidth, height - padding);
    ctx.lineTo(padding, height - padding);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    // Точки
    for (var i = 0; i < data.length; i++) {
      var x = padding + (i / (data.length - 1)) * chartWidth;
      var y = height - padding - (data[i] / maxVal) * chartHeight;
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#d4af37'; ctx.fill();
      ctx.strokeStyle = '#0a0a0f'; ctx.lineWidth = 2; ctx.stroke();
    }
    // Подписи оси X
    ctx.fillStyle = '#a0a0b0';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    for (var i = 0; i < data.length; i += 3) {
      var x = padding + (i / (data.length - 1)) * chartWidth;
      ctx.fillText(labels[i], x, height - padding + 18);
    }
    // Подписи оси Y
    ctx.textAlign = 'right';
    for (var i = 0; i <= 4; i++) {
      var y = padding + (i / 4) * chartHeight;
      var val = Math.round(maxVal - (i / 4) * maxVal);
      ctx.fillText(val, padding - 8, y + 4);
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
      else if (count <= 3) cell.style.background = 'rgba(212,175,55,0.2)';
      else if (count <= 6) cell.style.background = 'rgba(212,175,55,0.4)';
      else if (count <= 9) cell.style.background = 'rgba(212,175,55,0.7)';
      else cell.style.background = 'var(--accent-gold)';
      container.appendChild(cell);
    }
  }
};

window.StatsModule = StatsModule;
module.exports = StatsModule;