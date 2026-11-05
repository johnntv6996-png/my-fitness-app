// modules/stats.js

const StatsModule = {
  // Состояние зума
  zoom: {
    xMin: 0, xMax: 29, // индексы дней (0 = 30 дней назад, 29 = сегодня)
    yMin: 0, yMax: 10,
    xMinLimit: 0, xMaxLimit: 29,
    yMinLimit: 0, yMaxLimit: 100
  },
  isPanning: false,
  panStart: { x: 0, y: 0 },
  panStartZoom: { xMin: 0, xMax: 29, yMin: 0, yMax: 10 },
  activeMetrics: {},
  allMetrics: {},

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
  getSurveyConfig: function() {
    if (typeof FTStorage !== 'undefined') return FTStorage.get('survey_config') || null;
    return null;
  },

  // Собираем все метрики из опросов + стандартные
  buildMetrics: function() {
    var metrics = {};
    // Стандартные метрики из history
    metrics['exercises'] = { id: 'exercises', label: 'Упражнения', color: '#d4af37', key: 'exCount', enabled: true, source: 'system' };
    metrics['weight'] = { id: 'weight', label: 'Вес (кг)', color: '#4ade80', key: 'weight', enabled: false, source: 'system' };
    metrics['mood'] = { id: 'mood', label: 'Самочувствие', color: '#60a5fa', key: 'mood', enabled: false, source: 'system' };

    // Метрики из опросов
    var config = this.getSurveyConfig();
    if (config && config.questions) {
      for (var i = 0; i < config.questions.length; i++) {
        var q = config.questions[i];
        if (q.type === 'rating') {
          var id = 'survey_' + q.id;
          metrics[id] = {
            id: id,
            label: q.text.length > 20 ? q.text.substring(0, 20) + '...' : q.text,
            color: this.getMetricColor(i + 3),
            key: 'survey_' + q.id,
            enabled: false,
            source: 'survey',
            questionId: q.id,
            min: q.min || 1,
            max: q.max || 10
          };
        }
      }
    }
    this.allMetrics = metrics;
    // Восстановить активные из памяти
    if (Object.keys(this.activeMetrics).length === 0) {
      for (var key in metrics) {
        this.activeMetrics[key] = metrics[key].enabled;
      }
    }
  },

  getMetricColor: function(index) {
    var colors = ['#d4af37', '#4ade80', '#60a5fa', '#f472b6', '#a78bfa', '#fb923c', '#2dd4bf', '#f87171', '#e879f9', '#38bdf8'];
    return colors[index % colors.length];
  },

  createStatsScreen: function() {
    var screen = document.getElementById('screen-stats');
    if (!screen) {
      screen = document.createElement('div');
      screen.id = 'screen-stats';
      screen.className = 'screen';
      document.getElementById('userInterface').appendChild(screen);
    }
    this.buildMetrics();

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
      '.chart-container { position:relative; border-radius:12px; background:var(--bg-primary); border:1px solid var(--border-subtle); overflow:hidden; }' +
      '.chart-canvas-wrap { position:relative; width:100%; height:400px; cursor:crosshair; }' +
      '.chart-canvas-wrap canvas { display:block; width:100%; height:100%; }' +
      '.chart-nav-btn { position:absolute; top:50%; transform:translateY(-50%); width:36px; height:36px; border-radius:50%; background:rgba(212,175,55,0.15); backdrop-filter:blur(8px); border:1px solid rgba(212,175,55,0.3); color:var(--accent-gold); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s; z-index:10; }' +
      '.chart-nav-btn:hover { background:rgba(212,175,55,0.3); }' +
      '.chart-nav-btn:disabled { opacity:0.3; cursor:not-allowed; }' +
      '.chart-nav-btn.prev { left:12px; }' +
      '.chart-nav-btn.next { right:12px; }' +
      '.metrics-strip { display:flex; gap:6px; overflow-x:auto; padding:10px 4px; scrollbar-width:thin; scrollbar-color:var(--accent-gold) transparent; border-top:1px solid var(--border-subtle); }' +
      '.metrics-strip::-webkit-scrollbar { height: 4px; }' +
      '.metrics-strip::-webkit-scrollbar-thumb { background:var(--accent-gold); border-radius:2px; }' +
      '.metric-chip { display:flex; align-items:center; gap:6px; padding:6px 10px; background:var(--bg-secondary); border:1px solid var(--border-subtle); border-radius:16px; cursor:pointer; transition:all 0.2s; user-select:none; white-space:nowrap; flex-shrink:0; font-size:0.85em; }' +
      '.metric-chip:hover { border-color:var(--border-gold); }' +
      '.metric-chip.active { border-color:var(--accent-gold); background:var(--accent-gold-dim); }' +
      '.metric-chip input { display:none; }' +
      '.metric-chip .dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }' +
      '.metric-chip .check { font-size:0.9em; opacity:0; transition:opacity 0.2s; }' +
      '.metric-chip.active .check { opacity:1; }' +
      '.chart-zoom-info { position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.6); padding:6px 10px; border-radius:6px; font-size:0.75em; color:var(--text-secondary); z-index:5; pointer-events:none; }' +
      '.chart-reset-btn { position:absolute; top:10px; left:10px; background:rgba(212,175,55,0.2); border:1px solid var(--border-gold); color:var(--accent-gold); padding:6px 10px; border-radius:6px; font-size:0.75em; cursor:pointer; z-index:5; display:flex; align-items:center; gap:4px; }' +
      '.chart-reset-btn:hover { background:rgba(212,175,55,0.3); }' +
      '.tooltip { position:absolute; background:var(--bg-secondary); border:1px solid var(--border-gold); border-radius:8px; padding:8px 12px; font-size:0.8em; pointer-events:none; z-index:20; box-shadow:0 4px 12px rgba(0,0,0,0.5); }' +
      '@media (max-width: 600px) { .stat-metric-value { font-size:1.6em; } .stat-card { padding:14px; } .chart-canvas-wrap { height:300px; } }' +
    '</style>';

    var metricsHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(110px, 1fr));gap:10px;margin-bottom:20px">';
    metricsHtml += '<div class="stat-card stat-metric"><i class="ph ph-star" style="font-size:1.5em;color:var(--accent-gold)"></i><div class="stat-metric-value">' + stats.level + '</div><div class="stat-metric-label">Уровень</div></div>';
    metricsHtml += '<div class="stat-card stat-metric"><i class="ph ph-flame" style="font-size:1.5em;color:var(--accent-gold)"></i><div class="stat-metric-value">' + currentStreak + '</div><div class="stat-metric-label">Текущий стрик</div></div>';
    metricsHtml += '<div class="stat-card stat-metric"><i class="ph ph-trophy" style="font-size:1.5em;color:var(--accent-gold)"></i><div class="stat-metric-value">' + bestStreak + '</div><div class="stat-metric-label">Лучший стрик</div></div>';
    metricsHtml += '<div class="stat-card stat-metric"><i class="ph ph-check-circle" style="font-size:1.5em;color:var(--accent-gold)"></i><div class="stat-metric-value">' + stats.yes + '</div><div class="stat-metric-label">Тренировок</div></div>';
    metricsHtml += '<div class="stat-card stat-metric"><i class="ph ph-lightning" style="font-size:1.5em;color:var(--accent-gold)"></i><div class="stat-metric-value">' + stats.xp + '</div><div class="stat-metric-label">XP</div></div>';
    metricsHtml += '</div>';

    var chartHtml = '<div class="stat-card" style="padding:0;overflow:hidden">';
    chartHtml += '<div style="padding:18px 18px 10px"><h3 style="font-family:var(--font-display);color:var(--accent-gold);margin:0 0 6px 0;display:flex;align-items:center;gap:10px"><i class="ph ph-chart-line-up"></i> Активность за 30 дней</h3>';
    chartHtml += '<div class="hint" style="display:flex;align-items:center;gap:4px"><i class="ph ph-info"></i> Скролл колёсиком для зума. Перетаскивай для панорамирования. Кликни на метрику ниже.</div></div>';
    chartHtml += '<div class="chart-container" style="margin:0 18px 18px">';
    chartHtml += '<div class="chart-canvas-wrap" id="chartWrap">';
    chartHtml += '<canvas id="activityChart"></canvas>';
    chartHtml += '<button class="chart-reset-btn" onclick="StatsModule.resetZoom()"><i class="ph ph-arrows-counter-clockwise"></i> Сбросить</button>';
    chartHtml += '<div class="chart-zoom-info" id="zoomInfo">100%</div>';
    chartHtml += '<button class="chart-nav-btn prev" onclick="StatsModule.panChart(-3)"><i class="ph ph-caret-left"></i></button>';
    chartHtml += '<button class="chart-nav-btn next" onclick="StatsModule.panChart(3)"><i class="ph ph-caret-right"></i></button>';
    chartHtml += '<div class="tooltip" id="chartTooltip" style="display:none"></div>';
    chartHtml += '</div>';
    // Чекбоксы-чипы под графиком
    chartHtml += '<div class="metrics-strip" id="metricsStrip"></div>';
    chartHtml += '</div></div>';

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

    screen.innerHTML = css + '<div style="padding:16px;max-width:900px;margin:0 auto"><h2 style="font-family:var(--font-display);font-size:2em;margin-bottom:20px;color:var(--accent-gold);display:flex;align-items:center;gap:12px"><i class="ph ph-chart-line-up"></i> Статистика</h2>' + metricsHtml + chartHtml + heatmapHtml + streakHtml + '</div>';

    this.renderMetricChips();
    var self = this;
    setTimeout(function() { self.setupChartInteractions(); self.drawChart(); }, 100);
    setTimeout(function() { self.drawHeatmap(); }, 200);
  },

  renderMetricChips: function() {
    var strip = document.getElementById('metricsStrip');
    if (!strip) return;
    var html = '';
    for (var key in this.allMetrics) {
      var m = this.allMetrics[key];
      var active = this.activeMetrics[key] ? 'active' : '';
      html += '<div class="metric-chip ' + active + '" onclick="StatsModule.toggleMetricChip(\'' + key + '\')">';
      html += '<input type="checkbox" ' + (this.activeMetrics[key] ? 'checked' : '') + '>';
      html += '<span class="check">✓</span>';
      html += '<div class="dot" style="background:' + m.color + '"></div>';
      html += '<span>' + m.label + '</span>';
      html += '</div>';
    }
    strip.innerHTML = html;
  },

  toggleMetricChip: function(key) {
    this.activeMetrics[key] = !this.activeMetrics[key];
    this.renderMetricChips();
    this.drawChart();
  },

  setupChartInteractions: function() {
    var wrap = document.getElementById('chartWrap');
    if (!wrap) return;
    var canvas = document.getElementById('activityChart');
    var self = this;

    // Зум колёсиком
    wrap.addEventListener('wheel', function(e) {
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      var mouseX = e.clientX - rect.left;
      var mouseY = e.clientY - rect.top;
      var zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      self.zoomAtPoint(mouseX, mouseY, rect.width, rect.height, zoomFactor, zoomFactor);
    }, { passive: false });

    // Панорамирование мышью
    wrap.addEventListener('mousedown', function(e) {
      if (e.button !== 0) return;
      self.isPanning = true;
      self.panStart = { x: e.clientX, y: e.clientY };
      self.panStartZoom = { xMin: self.zoom.xMin, xMax: self.zoom.xMax, yMin: self.zoom.yMin, yMax: self.zoom.yMax };
      wrap.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', function(e) {
      if (!self.isPanning) {
        // Tooltip при наведении
        self.handleTooltip(e);
        return;
      }
      var rect = canvas.getBoundingClientRect();
      var dx = e.clientX - self.panStart.x;
      var dy = e.clientY - self.panStart.y;
      var xRange = self.panStartZoom.xMax - self.panStartZoom.xMin;
      var yRange = self.panStartZoom.yMax - self.panStartZoom.yMin;
      var xShift = -(dx / rect.width) * xRange;
      var yShift = (dy / rect.height) * yRange;
      self.zoom.xMin = self.panStartZoom.xMin + xShift;
      self.zoom.xMax = self.panStartZoom.xMax + xShift;
      self.zoom.yMin = self.panStartZoom.yMin + yShift;
      self.zoom.yMax = self.panStartZoom.yMax + yShift;
      self.clampZoom();
      self.drawChart();
    });

    document.addEventListener('mouseup', function() {
      if (self.isPanning) {
        self.isPanning = false;
        wrap.style.cursor = 'crosshair';
      }
    });

    // Touch зум и пан
    var touchStartDist = 0;
    var touchStartZoom = null;
    var touchStartPos = null;

    wrap.addEventListener('touchstart', function(e) {
      if (e.touches.length === 1) {
        self.isPanning = true;
        self.panStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        self.panStartZoom = { xMin: self.zoom.xMin, xMax: self.zoom.xMax, yMin: self.zoom.yMin, yMax: self.zoom.yMax };
      } else if (e.touches.length === 2) {
        self.isPanning = false;
        touchStartDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        touchStartZoom = { xMin: self.zoom.xMin, xMax: self.zoom.xMax, yMin: self.zoom.yMin, yMax: self.zoom.yMax };
      }
    }, { passive: true });

    wrap.addEventListener('touchmove', function(e) {
      if (e.touches.length === 1 && self.isPanning) {
        var rect = canvas.getBoundingClientRect();
        var dx = e.touches[0].clientX - self.panStart.x;
        var dy = e.touches[0].clientY - self.panStart.y;
        var xRange = self.panStartZoom.xMax - self.panStartZoom.xMin;
        var yRange = self.panStartZoom.yMax - self.panStartZoom.yMin;
        self.zoom.xMin = self.panStartZoom.xMin - (dx / rect.width) * xRange;
        self.zoom.xMax = self.panStartZoom.xMax - (dx / rect.width) * xRange;
        self.zoom.yMin = self.panStartZoom.yMin + (dy / rect.height) * yRange;
        self.zoom.yMax = self.panStartZoom.yMax + (dy / rect.height) * yRange;
        self.clampZoom();
        self.drawChart();
      } else if (e.touches.length === 2 && touchStartZoom) {
        var dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        var scale = touchStartDist / dist;
        var cx = (self.zoom.xMin + self.zoom.xMax) / 2;
        var cy = (self.zoom.yMin + self.zoom.yMax) / 2;
        var xRange = (self.panStartZoom.xMax - self.panStartZoom.xMin) * scale;
        var yRange = (self.panStartZoom.yMax - self.panStartZoom.yMin) * scale;
        self.zoom.xMin = cx - xRange / 2;
        self.zoom.xMax = cx + xRange / 2;
        self.zoom.yMin = cy - yRange / 2;
        self.zoom.yMax = cy + yRange / 2;
        self.clampZoom();
        self.drawChart();
      }
    }, { passive: true });

    wrap.addEventListener('touchend', function() {
      self.isPanning = false;
      touchStartZoom = null;
    });

    // Клик по точке
    canvas.addEventListener('click', function(e) {
      self.handlePointClick(e);
    });
  },

  handleTooltip: function(e) {
    var canvas = document.getElementById('activityChart');
    var tooltip = document.getElementById('chartTooltip');
    if (!canvas || !tooltip) return;
    var rect = canvas.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    var history = this.getHistory();
    var data = this.buildChartData(history);
    var padding = 40;
    var chartWidth = canvas.width - padding * 2;
    var chartHeight = canvas.height - padding * 2;
    var xRange = this.zoom.xMax - this.zoom.xMin;
    var yRange = this.zoom.yMax - this.zoom.yMin;
    var dayIdx = Math.round(this.zoom.xMin + (x - padding) / chartWidth * xRange);
    if (dayIdx < 0 || dayIdx >= 30) { tooltip.style.display = 'none'; return; }
    var date = new Date(); date.setDate(date.getDate() - (29 - dayIdx));
    var dateStr = date.toISOString().slice(0, 10);
    var dayRecord = null;
    for (var i = 0; i < history.length; i++) if (history[i].date === dateStr) { dayRecord = history[i]; break; }
    if (!dayRecord) { tooltip.style.display = 'none'; return; }
    var html = '<div style="font-weight:600;margin-bottom:4px;color:var(--accent-gold)">' + dateStr + '</div>';
    if (dayRecord.exercises) html += '<div>Упражнений: ' + dayRecord.exercises.length + '</div>';
    if (dayRecord.weight) html += '<div>Вес: ' + dayRecord.weight + ' кг</div>';
    if (dayRecord.mood) html += '<div>Самочувствие: ' + dayRecord.mood + '/10</div>';
    if (dayRecord.survey) {
      var config = this.getSurveyConfig();
      if (config && config.questions) {
        for (var i = 0; i < config.questions.length; i++) {
          var q = config.questions[i];
          var val = dayRecord.survey[q.id];
          if (val !== undefined && val !== null) {
            html += '<div>' + q.text.substring(0, 25) + ': <strong>' + val + '</strong></div>';
          }
        }
      }
    }
    tooltip.innerHTML = html;
    tooltip.style.display = 'block';
    tooltip.style.left = (x + 15) + 'px';
    tooltip.style.top = (y - 10) + 'px';
    if (x + 200 > rect.width) tooltip.style.left = (x - 200) + 'px';
  },

  handlePointClick: function(e) {
    var canvas = document.getElementById('activityChart');
    var rect = canvas.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var padding = 40;
    var chartWidth = canvas.width - padding * 2;
    var xRange = this.zoom.xMax - this.zoom.xMin;
    var dayIdx = Math.round(this.zoom.xMin + (x - padding) / chartWidth * xRange);
    if (dayIdx < 0 || dayIdx >= 30) return;
    var date = new Date(); date.setDate(date.getDate() - (29 - dayIdx));
    var dateStr = date.toISOString().slice(0, 10);
    var history = this.getHistory();
    var dayRecord = null;
    for (var i = 0; i < history.length; i++) if (history[i].date === dateStr) { dayRecord = history[i]; break; }
    if (dayRecord) {
      var info = '📅 ' + dateStr + '\n';
      if (dayRecord.exercises) info += 'Упражнений: ' + dayRecord.exercises.length + '\n';
      if (dayRecord.weight) info += 'Вес: ' + dayRecord.weight + ' кг\n';
      if (dayRecord.mood) info += 'Самочувствие: ' + dayRecord.mood + '/10\n';
      if (dayRecord.survey) {
        var config = this.getSurveyConfig();
        if (config && config.questions) {
          for (var i = 0; i < config.questions.length; i++) {
            var q = config.questions[i];
            var val = dayRecord.survey[q.id];
            if (val !== undefined && val !== null) info += q.text + ': ' + val + '\n';
          }
        }
      }
      alert(info);
    }
  },

  zoomAtPoint: function(mouseX, mouseY, canvasWidth, canvasHeight, zoomX, zoomY) {
    var padding = 40;
    var chartWidth = canvasWidth - padding * 2;
    var chartHeight = canvasHeight - padding * 2;
    var xRatio = (mouseX - padding) / chartWidth;
    var yRatio = (mouseY - padding) / chartHeight;
    var xRange = this.zoom.xMax - this.zoom.xMin;
    var yRange = this.zoom.yMax - this.zoom.yMin;
    var newXRange = xRange * zoomX;
    var newYRange = yRange * zoomY;
    var xCenter = this.zoom.xMin + xRatio * xRange;
    var yCenter = this.zoom.yMin + (1 - yRatio) * yRange;
    this.zoom.xMin = xCenter - xRatio * newXRange;
    this.zoom.xMax = xCenter + (1 - xRatio) * newXRange;
    this.zoom.yMin = yCenter - (1 - yRatio) * newYRange;
    this.zoom.yMax = yCenter + yRatio * newYRange;
    this.clampZoom();
    this.drawChart();
  },

  clampZoom: function() {
    var xRange = this.zoom.xMax - this.zoom.xMin;
    var yRange = this.zoom.yMax - this.zoom.yMin;
    // Ограничения зума
    if (xRange < 3) { var cx = (this.zoom.xMin + this.zoom.xMax) / 2; this.zoom.xMin = cx - 1.5; this.zoom.xMax = cx + 1.5; }
    if (xRange > 30) { this.zoom.xMin = 0; this.zoom.xMax = 29; }
    if (yRange < 1) { var cy = (this.zoom.yMin + this.zoom.yMax) / 2; this.zoom.yMin = cy - 0.5; this.zoom.yMax = cy + 0.5; }
    if (yRange > 100) { this.zoom.yMin = 0; this.zoom.yMax = 100; }
    // Границы данных
    if (this.zoom.xMin < this.zoom.xMinLimit) { this.zoom.xMax += this.zoom.xMinLimit - this.zoom.xMin; this.zoom.xMin = this.zoom.xMinLimit; }
    if (this.zoom.xMax > this.zoom.xMaxLimit) { this.zoom.xMin -= this.zoom.xMax - this.zoom.xMaxLimit; this.zoom.xMax = this.zoom.xMaxLimit; }
    if (this.zoom.yMin < this.zoom.yMinLimit) { this.zoom.yMax += this.zoom.yMinLimit - this.zoom.yMin; this.zoom.yMin = this.zoom.yMinLimit; }
    if (this.zoom.yMax > this.zoom.yMaxLimit) { this.zoom.yMin -= this.zoom.yMax - this.zoom.yMaxLimit; this.zoom.yMax = this.zoom.yMaxLimit; }
    // Обновить info
    var info = document.getElementById('zoomInfo');
    if (info) {
      var xZoom = Math.round(30 / (this.zoom.xMax - this.zoom.xMin) * 100);
      info.textContent = xZoom + '%';
    }
  },

  panChart: function(delta) {
    var range = this.zoom.xMax - this.zoom.xMin;
    this.zoom.xMin += delta;
    this.zoom.xMax += delta;
    this.clampZoom();
    this.drawChart();
  },

  resetZoom: function() {
    this.zoom.xMin = 0;
    this.zoom.xMax = 29;
    this.zoom.yMin = 0;
    this.zoom.yMax = 10;
    this.clampZoom();
    this.drawChart();
  },

  buildChartData: function(history) {
    var data = { exercises: [], weight: [], mood: [] };
    var labels = [];
    // Собираем вопросы опросов
    var config = this.getSurveyConfig();
    var surveyKeys = [];
    if (config && config.questions) {
      for (var i = 0; i < config.questions.length; i++) {
        if (config.questions[i].type === 'rating') {
          var key = 'survey_' + config.questions[i].id;
          data[key] = [];
          surveyKeys.push(key);
        }
      }
    }
    for (var i = 29; i >= 0; i--) {
      var date = new Date(); date.setDate(date.getDate() - i);
      var dateStr = date.toISOString().slice(0, 10);
      var dayRecord = null;
      for (var j = 0; j < history.length; j++) if (history[j].date === dateStr) { dayRecord = history[j]; break; }
      var exCount = 0;
      if (dayRecord && !dayRecord.skipped && dayRecord.exercises) exCount = dayRecord.exercises.length;
      data.exercises.push(exCount);
      data.weight.push(dayRecord && dayRecord.weight ? dayRecord.weight : null);
      data.mood.push(dayRecord && dayRecord.mood ? dayRecord.mood : null);
      for (var k = 0; k < surveyKeys.length; k++) {
        var qId = surveyKeys[k].replace('survey_', '');
        data[surveyKeys[k]].push(dayRecord && dayRecord.survey && dayRecord.survey[qId] !== undefined ? dayRecord.survey[qId] : null);
      }
      labels.push(date.getDate() + '.' + (date.getMonth() + 1));
    }
    return { data: data, labels: labels };
  },

  drawChart: function() {
    var canvas = document.getElementById('activityChart');
    if (!canvas) return;
    var wrap = document.getElementById('chartWrap');
    if (wrap) {
      canvas.width = wrap.clientWidth;
      canvas.height = wrap.clientHeight;
    }
    var ctx = canvas.getContext('2d');
    var width = canvas.width, height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    var history = this.getHistory();
    var chartData = this.buildChartData(history);
    var data = chartData.data;
    var labels = chartData.labels;

    // Определяем границы по данным
    var firstTraining = 29, lastTraining = 0;
    for (var i = 0; i < 30; i++) {
      var dayRecord = null;
      var date = new Date(); date.setDate(date.getDate() - (29 - i));
      var dateStr = date.toISOString().slice(0, 10);
      for (var j = 0; j < history.length; j++) if (history[j].date === dateStr) { dayRecord = history[j]; break; }
      if (dayRecord && !dayRecord.skipped) {
        if (firstTraining === 29) firstTraining = i;
        lastTraining = i;
      }
    }
    this.zoom.xMinLimit = Math.max(0, firstTraining - 2);
    this.zoom.xMaxLimit = Math.min(29, lastTraining + 2);

    var padding = 40;
    var chartWidth = width - padding * 2;
    var chartHeight = height - padding * 2;
    var xRange = this.zoom.xMax - this.zoom.xMin;
    var yRange = this.zoom.yMax - this.zoom.yMin;

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

    // Рисуем каждую включённую метрику
    var metrics = this.allMetrics;
    for (var key in metrics) {
      var m = metrics[key];
      if (!this.activeMetrics[key]) continue;
      var series = data[key];
      if (!series) continue;
      var maxVal = m.max || 10;
      var minVal = m.min || 0;
      var valRange = maxVal - minVal;
      if (valRange === 0) valRange = 10;

      ctx.strokeStyle = m.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      var started = false;
      for (var i = 0; i < series.length; i++) {
        if (series[i] === null) continue;
        var x = padding + ((i - this.zoom.xMin) / xRange) * chartWidth;
        var y = height - padding - ((series[i] - this.zoom.yMin) / yRange) * chartHeight;
        if (x < padding || x > width - padding) continue;
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Точки
      for (var i = 0; i < series.length; i++) {
        if (series[i] === null) continue;
        var x = padding + ((i - this.zoom.xMin) / xRange) * chartWidth;
        var y = height - padding - ((series[i] - this.zoom.yMin) / yRange) * chartHeight;
        if (x < padding || x > width - padding) continue;
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = m.color; ctx.fill();
        ctx.strokeStyle = '#0a0a0f'; ctx.lineWidth = 2; ctx.stroke();
      }
    }

    // Подписи оси X
    ctx.fillStyle = '#a0a0b0';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    var step = Math.max(1, Math.ceil(xRange / 8));
    for (var i = Math.ceil(this.zoom.xMin); i <= Math.floor(this.zoom.xMax); i += step) {
      if (i >= 0 && i < labels.length) {
        var x = padding + ((i - this.zoom.xMin) / xRange) * chartWidth;
        ctx.fillText(labels[i], x, height - padding + 18);
      }
    }

    // Подписи оси Y
    ctx.textAlign = 'right';
    var yStep = Math.max(1, Math.ceil(yRange / 5));
    for (var v = Math.ceil(this.zoom.yMin); v <= Math.floor(this.zoom.yMax); v += yStep) {
      var y = height - padding - ((v - this.zoom.yMin) / yRange) * chartHeight;
      ctx.fillText(v, padding - 8, y + 4);
    }

    // Легенда
    var legendY = padding + 10;
    ctx.textAlign = 'left';
    ctx.font = '12px Inter, sans-serif';
    for (var key in metrics) {
      var m = metrics[key];
      if (!this.activeMetrics[key]) continue;
      ctx.fillStyle = m.color;
      ctx.fillRect(width - padding - 130, legendY, 12, 12);
      ctx.fillStyle = '#a0a0b0';
      ctx.fillText(m.label, width - padding - 114, legendY + 10);
      legendY += 18;
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