// modules/stats.js

const StatsModule = {
  zoom: { xMin: 0, xMax: 29, yMin: 0, yMax: 10 },
  isPanning: false,
  panStart: { x: 0, y: 0 },
  panStartZoom: null,
  activeMetrics: {},
  allMetrics: {},
  totalDays: 30,
  firstDayIndex: 0,
  calendarMonth: new Date().getMonth(),
  calendarYear: new Date().getFullYear(),
  lastMouseX: -1,
  lastMouseY: -1,

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

  buildMetrics: function() {
    var metrics = {};
    metrics['exercises'] = { id: 'exercises', label: 'Упражнения', color: '#d4af37', key: 'exCount', enabled: true, source: 'system', unit: '' };
    metrics['weight'] = { id: 'weight', label: 'Вес', color: '#4ade80', key: 'weight', enabled: false, source: 'system', unit: 'кг' };
    metrics['mood'] = { id: 'mood', label: 'Самочувствие', color: '#60a5fa', key: 'mood', enabled: false, source: 'system', unit: '/10' };

    var config = this.getSurveyConfig();
    if (config && config.questions) {
      for (var i = 0; i < config.questions.length; i++) {
        var q = config.questions[i];
        if (['rating', 'emoji', 'range', 'number'].indexOf(q.type) !== -1) {
          var id = 'survey_' + q.id;
          var shortLabel = q.text.length > 18 ? q.text.substring(0, 18) + '…' : q.text;
          metrics[id] = {
            id: id, label: shortLabel, color: this.getMetricColor(i + 3),
            key: 'survey_' + q.id, enabled: false, source: 'survey',
            questionId: q.id, questionType: q.type,
            min: q.min !== undefined ? q.min : 1,
            max: q.max !== undefined ? q.max : 10,
            unit: q.unit || '',
            emojiSet: q.emojiSet || null
          };
        }
      }
    }
    this.allMetrics = metrics;
    if (Object.keys(this.activeMetrics).length === 0) {
      for (var key in metrics) this.activeMetrics[key] = metrics[key].enabled;
    }
  },

  getMetricColor: function(index) {
    var colors = ['#d4af37', '#4ade80', '#60a5fa', '#f472b6', '#a78bfa', '#fb923c', '#2dd4bf', '#f87171', '#e879f9', '#38bdf8'];
    return colors[index % colors.length];
  },

  buildChartData: function() {
    var history = this.getHistory();
    if (history.length === 0) return { data: { exercises: [], weight: [], mood: [] }, labels: [], totalDays: 30 };

    var dates = history.map(function(h) { return h.date; }).sort();
    var firstDate = new Date(dates[0] + 'T00:00:00');
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var msPerDay = 1000 * 60 * 60 * 24;
    var totalDays = Math.floor((today - firstDate) / msPerDay) + 1;
    if (totalDays < 1) totalDays = 1;

    var data = { exercises: [], weight: [], mood: [] };
    var labels = [];
    var config = this.getSurveyConfig();
    var surveyKeys = [];
    if (config && config.questions) {
      for (var i = 0; i < config.questions.length; i++) {
        var q = config.questions[i];
        if (['rating', 'emoji', 'range', 'number'].indexOf(q.type) !== -1) {
          var key = 'survey_' + q.id;
          data[key] = [];
          surveyKeys.push(key);
        }
      }
    }

    for (var i = 0; i < totalDays; i++) {
      var date = new Date(firstDate);
      date.setDate(date.getDate() + i);
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

    this.totalDays = totalDays;
    this.zoom.xMax = totalDays - 1;
    this.zoom.xMaxLimit = totalDays - 1;
    this.zoom.xMinLimit = 0;

    if (this.zoom.xMax > totalDays - 1) this.zoom.xMax = totalDays - 1;
    if (this.zoom.xMin > this.zoom.xMax - 3) this.zoom.xMin = Math.max(0, this.zoom.xMax - 10);

    return { data: data, labels: labels, totalDays: totalDays };
  },

  findMaxY: function(data) {
    var maxVal = 10;
    var metrics = this.allMetrics;
    for (var key in metrics) {
      if (!this.activeMetrics[key]) continue;
      var series = data[key];
      if (!series) continue;
      for (var i = 0; i < series.length; i++) {
        if (series[i] !== null && series[i] > maxVal) maxVal = series[i];
      }
    }
    if (maxVal <= 10) maxVal = 10;
    else if (maxVal <= 20) maxVal = 20;
    else if (maxVal <= 50) maxVal = 50;
    else if (maxVal <= 100) maxVal = 100;
    else maxVal = Math.ceil(maxVal / 50) * 50;
    return maxVal;
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

    var hintsEnabled = typeof shouldShowHints === 'function' ? shouldShowHints() : true;
    var hintHtml = hintsEnabled ? '<div class="hint" style="display:flex;align-items:center;gap:4px"><i class="ph ph-info"></i> Скролл колёсиком для зума. Перетаскивай для панорамирования.</div>' : '';

    var css = '<style>' +
      '.stat-card { background:var(--bg-card); border-radius:14px; padding:18px; margin-bottom:16px; border:1px solid var(--border-subtle); transition:all 0.2s; }' +
      '.stat-card:hover { border-color:var(--border-gold); transform:translateY(-2px); }' +
      '.stat-metric { text-align:center; }' +
      '.stat-metric-value { font-size:2.2em; font-weight:bold; color:var(--accent-gold); line-height:1; }' +
      '.stat-metric-label { font-size:0.8em; opacity:0.7; margin-top:6px; display:flex; align-items:center; justify-content:center; gap:4px; color:var(--text-secondary); }' +
      '.hint { font-size:0.75em; opacity:0.6; margin-top:3px; color:var(--text-secondary); }' +
      '.chart-container { position:relative; border-radius:12px; background:var(--bg-primary); border:1px solid var(--border-subtle); overflow:hidden; }' +
      '.chart-canvas-wrap { position:relative; width:100%; height:420px; cursor:crosshair; }' +
      '.chart-canvas-wrap canvas { display:block; width:100%; height:100%; }' +
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
      '.tooltip { position:absolute; background:var(--bg-secondary); border:1px solid var(--border-gold); border-radius:8px; padding:10px 14px; font-size:0.8em; pointer-events:none; z-index:20; box-shadow:0 4px 12px rgba(0,0,0,0.5); max-width:250px; }' +
      '.tooltip-row { display:flex; align-items:center; gap:8px; margin-bottom:4px; }' +
      '.tooltip-row:last-child { margin-bottom:0; }' +
      '.tooltip-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }' +
      '.tooltip-label { opacity:0.7; flex:1; }' +
      '.tooltip-value { font-weight:600; color:var(--accent-gold); }' +
      '.tooltip-date { font-weight:600; color:var(--accent-gold); margin-bottom:6px; padding-bottom:6px; border-bottom:1px solid var(--border-subtle); }' +
      '.calendar-modal { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); backdrop-filter:blur(15px); z-index:2000; display:flex; justify-content:center; align-items:center; padding:20px; }' +
      '.calendar-content { background:var(--bg-secondary); padding:28px; border-radius:20px; width:100%; max-width:500px; max-height:90vh; overflow-y:auto; border:1px solid var(--border-gold); box-shadow:0 0 40px rgba(212,175,55,0.2); }' +
      '.calendar-day { aspect-ratio:1; border-radius:8px; display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:0.85em; cursor:pointer; transition:all 0.2s; border:1px solid var(--border-subtle); min-height:50px; }' +
      '.calendar-day:hover { transform:scale(1.1); }' +
      '.calendar-day.full { background:rgba(74,222,128,0.2); border-color:var(--accent-success); }' +
      '.calendar-day.partial { background:rgba(251,191,36,0.2); border-color:var(--accent-warning); }' +
      '.calendar-day.skipped { background:rgba(248,113,113,0.2); border-color:var(--accent-error); }' +
      '.calendar-day.empty { background:var(--bg-primary); opacity:0.5; }' +
      '.calendar-day .day-num { font-weight:600; font-size:1.1em; }' +
      '.calendar-day .day-icon { font-size:1.2em; margin-top:2px; }' +
      '.calendar-tooltip { position:fixed; background:var(--bg-secondary); border:1px solid var(--border-gold); border-radius:8px; padding:10px 14px; font-size:0.8em; pointer-events:none; z-index:3000; box-shadow:0 4px 12px rgba(0,0,0,0.5); max-width:280px; display:none; }' +
      '.calendar-tooltip .ct-date { font-weight:600; color:var(--accent-gold); margin-bottom:6px; padding-bottom:6px; border-bottom:1px solid var(--border-subtle); }' +
      '.calendar-tooltip .ct-row { display:flex; align-items:center; gap:8px; margin-bottom:4px; }' +
      '.calendar-tooltip .ct-row:last-child { margin-bottom:0; }' +
      '.calendar-tooltip .ct-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }' +
      '.calendar-tooltip .ct-label { opacity:0.7; flex:1; }' +
      '.calendar-tooltip .ct-value { font-weight:600; color:var(--accent-gold); }' +
      '@media (max-width: 600px) { .stat-metric-value { font-size:1.6em; } .stat-card { padding:14px; } .chart-canvas-wrap { height:320px; } }' +
    '</style>';

    var metricsHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(110px, 1fr));gap:10px;margin-bottom:20px">';
    metricsHtml += '<div class="stat-card stat-metric"><i class="ph ph-star" style="font-size:1.5em;color:var(--accent-gold)"></i><div class="stat-metric-value">' + stats.level + '</div><div class="stat-metric-label">Уровень</div></div>';
    metricsHtml += '<div class="stat-card stat-metric"><i class="ph ph-flame" style="font-size:1.5em;color:var(--accent-gold)"></i><div class="stat-metric-value">' + currentStreak + '</div><div class="stat-metric-label">Текущий стрик</div></div>';
    metricsHtml += '<div class="stat-card stat-metric"><i class="ph ph-trophy" style="font-size:1.5em;color:var(--accent-gold)"></i><div class="stat-metric-value">' + bestStreak + '</div><div class="stat-metric-label">Лучший стрик</div></div>';
    metricsHtml += '<div class="stat-card stat-metric"><i class="ph ph-check-circle" style="font-size:1.5em;color:var(--accent-gold)"></i><div class="stat-metric-value">' + stats.yes + '</div><div class="stat-metric-label">Тренировок</div></div>';
    metricsHtml += '<div class="stat-card stat-metric"><i class="ph ph-lightning" style="font-size:1.5em;color:var(--accent-gold)"></i><div class="stat-metric-value">' + stats.xp + '</div><div class="stat-metric-label">XP</div></div>';
    metricsHtml += '</div>';

    var chartHtml = '<div class="stat-card" style="padding:0;overflow:hidden">';
    chartHtml += '<div style="padding:18px 18px 10px"><h3 style="font-family:var(--font-display);color:var(--accent-gold);margin:0 0 6px 0;display:flex;align-items:center;gap:10px"><i class="ph ph-chart-line-up"></i> Активность за весь период</h3>';
    chartHtml += hintHtml;
    chartHtml += '</div>';
    chartHtml += '<div class="chart-container" style="margin:0 18px 18px">';
    chartHtml += '<div class="chart-canvas-wrap" id="chartWrap">';
    chartHtml += '<canvas id="activityChart"></canvas>';
    chartHtml += '<button class="chart-reset-btn" onclick="StatsModule.resetZoom()"><i class="ph ph-arrows-counter-clockwise"></i> Сбросить</button>';
    chartHtml += '<div class="chart-zoom-info" id="zoomInfo">100%</div>';
    chartHtml += '<div class="tooltip" id="chartTooltip" style="display:none"></div>';
    chartHtml += '</div>';
    chartHtml += '<div class="metrics-strip" id="metricsStrip"></div>';
    chartHtml += '</div></div>';

    var streakHtml = '<div class="stat-card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">';
    streakHtml += '<h3 style="font-family:var(--font-display);color:var(--accent-gold);margin:0;display:flex;align-items:center;gap:10px"><i class="ph ph-flame"></i> Последние 14 дней</h3>';
    streakHtml += '<button class="btn btn-secondary" style="padding:8px 12px;font-size:0.85em" onclick="StatsModule.openCalendar()"><i class="ph ph-calendar"></i> Календарь</button>';
    streakHtml += '</div>';
    if (hintsEnabled) streakHtml += '<div class="hint" style="display:flex;align-items:center;gap:4px;margin-bottom:12px"><i class="ph ph-info"></i> Зелёный = тренировка, красный = пропуск</div>';
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

    screen.innerHTML = css + '<div style="padding:16px;max-width:900px;margin:0 auto"><h2 style="font-family:var(--font-display);font-size:2em;margin-bottom:20px;color:var(--accent-gold);display:flex;align-items:center;gap:12px"><i class="ph ph-chart-line-up"></i> Статистика</h2>' + metricsHtml + chartHtml + streakHtml + '</div>';

    this.renderMetricChips();
    var self = this;
    setTimeout(function() { self.setupChartInteractions(); self.drawChart(); }, 100);
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

    wrap.addEventListener('wheel', function(e) {
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      var mouseX = e.clientX - rect.left;
      var mouseY = e.clientY - rect.top;
      var zoomFactor = e.deltaY > 0 ? 1.15 : 0.87;
      self.zoomAtPoint(mouseX, mouseY, rect.width, rect.height, zoomFactor);
    }, { passive: false });

    wrap.addEventListener('mousedown', function(e) {
      if (e.button !== 0) return;
      self.isPanning = true;
      self.panStart = { x: e.clientX, y: e.clientY };
      self.panStartZoom = { xMin: self.zoom.xMin, xMax: self.zoom.xMax, yMin: self.zoom.yMin, yMax: self.zoom.yMax };
      wrap.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', function(e) {
      if (!self.isPanning) {
        self.handleTooltip(e);
        return;
      }
      var rect = canvas.getBoundingClientRect();
      var dx = e.clientX - self.panStart.x;
      var dy = e.clientY - self.panStart.y;
      var xRange = self.panStartZoom.xMax - self.panStartZoom.xMin;
      var yRange = self.panStartZoom.yMax - self.panStartZoom.yMin;
      self.zoom.xMin = self.panStartZoom.xMin - (dx / rect.width) * xRange;
      self.zoom.xMax = self.panStartZoom.xMax - (dx / rect.width) * xRange;
      self.zoom.yMin = self.panStartZoom.yMin + (dy / rect.height) * yRange;
      self.zoom.yMax = self.panStartZoom.yMax + (dy / rect.height) * yRange;
      self.clampZoom();
      self.drawChart();
    });

    document.addEventListener('mouseup', function() {
      if (self.isPanning) { self.isPanning = false; wrap.style.cursor = 'crosshair'; }
    });

    // Отслеживаем уход мыши за пределы canvas
    canvas.addEventListener('mouseleave', function() {
      self.lastMouseX = -1;
      self.lastMouseY = -1;
      var tooltip = document.getElementById('chartTooltip');
      if (tooltip) tooltip.style.display = 'none';
    });

    var touchStartDist = 0;
    var touchStartZoom = null;

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

    wrap.addEventListener('touchend', function() { self.isPanning = false; touchStartZoom = null; });
    canvas.addEventListener('click', function(e) { self.handlePointClick(e); });
  },

  handleTooltip: function(e) {
    var canvas = document.getElementById('activityChart');
    var tooltip = document.getElementById('chartTooltip');
    if (!canvas || !tooltip) return;

    var rect = canvas.getBoundingClientRect();

    // ПРОВЕРКА: курсор должен быть внутри canvas
    if (e.clientX < rect.left || e.clientX > rect.right ||
        e.clientY < rect.top || e.clientY > rect.bottom) {
      tooltip.style.display = 'none';
      this.lastMouseX = -1;
      this.lastMouseY = -1;
      return;
    }

    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    var width = canvas.width, height = canvas.height;
    var padding = this.getPadding(width, height);
    var chartWidth = width - padding.left - padding.right;
    var xRange = this.zoom.xMax - this.zoom.xMin;
    var dayIdx = Math.round(this.zoom.xMin + (x - padding.left) / chartWidth * xRange);

    if (dayIdx < 0 || dayIdx >= this.totalDays) { tooltip.style.display = 'none'; return; }

    var history = this.getHistory();
    var chartData = this.buildChartData();
    var firstDate = new Date(history.length > 0 ? history[0].date + 'T00:00:00' : new Date());
    var date = new Date(firstDate);
    date.setDate(date.getDate() + dayIdx);
    var dateStr = date.toISOString().slice(0, 10);
    var dayRecord = null;
    for (var i = 0; i < history.length; i++) if (history[i].date === dateStr) { dayRecord = history[i]; break; }

    if (!dayRecord) { tooltip.style.display = 'none'; return; }

    var html = '<div class="tooltip-date">📅 ' + dateStr + '</div>';
    var metrics = this.allMetrics;
    for (var key in metrics) {
      var m = metrics[key];
      if (!this.activeMetrics[key]) continue;
      var val = this.getMetricValue(dayRecord, key, m);
      if (val === null || val === undefined) continue;
      html += '<div class="tooltip-row">';
      html += '<div class="tooltip-dot" style="background:' + m.color + '"></div>';
      html += '<div class="tooltip-label">' + m.label + '</div>';
      html += '<div class="tooltip-value">' + this.formatMetricValue(val, m) + '</div>';
      html += '</div>';
    }

    // Если содержимое не изменилось — не перерисовываем (оптимизация)
    if (html === tooltip.innerHTML && this.lastMouseX === x && this.lastMouseY === y) return;

    tooltip.innerHTML = html;
    tooltip.style.display = 'block';
    var tooltipX = x + 15;
    var tooltipY = y - 10;
    if (tooltipX + 250 > rect.width) tooltipX = x - 260;
    if (tooltipY < 0) tooltipY = 10;
    tooltip.style.left = tooltipX + 'px';
    tooltip.style.top = tooltipY + 'px';

    this.lastMouseX = x;
    this.lastMouseY = y;
  },

  getMetricValue: function(dayRecord, key, metric) {
    if (key === 'exercises') return dayRecord.exercises ? dayRecord.exercises.length : 0;
    if (key === 'weight') return dayRecord.weight || null;
    if (key === 'mood') return dayRecord.mood || null;
    if (key.indexOf('survey_') === 0) {
      var qId = key.replace('survey_', '');
      if (dayRecord.survey && dayRecord.survey[qId] !== undefined) return dayRecord.survey[qId];
    }
    return null;
  },

  formatMetricValue: function(val, metric) {
    if (val === null || val === undefined) return '—';
    if (metric.questionType === 'emoji' && metric.emojiSet && metric.emojiSet[val]) {
      return metric.emojiSet[val];
    }
    return val + (metric.unit ? ' ' + metric.unit : '');
  },

  handlePointClick: function(e) {
    var canvas = document.getElementById('activityChart');
    var rect = canvas.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var width = canvas.width;
    var padding = this.getPadding(width, canvas.height);
    var chartWidth = width - padding.left - padding.right;
    var xRange = this.zoom.xMax - this.zoom.xMin;
    var dayIdx = Math.round(this.zoom.xMin + (x - padding.left) / chartWidth * xRange);
    if (dayIdx < 0 || dayIdx >= this.totalDays) return;
    var history = this.getHistory();
    var chartData = this.buildChartData();
    var firstDate = new Date(history.length > 0 ? history[0].date + 'T00:00:00' : new Date());
    var date = new Date(firstDate);
    date.setDate(date.getDate() + dayIdx);
    var dateStr = date.toISOString().slice(0, 10);
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
            if (val !== undefined && val !== null) {
              var displayVal = val;
              if (q.type === 'emoji' && q.emojiSet && q.emojiSet[val]) displayVal = q.emojiSet[val];
              info += q.text + ': ' + displayVal + '\n';
            }
          }
        }
      }
      alert(info);
    }
  },

  getPadding: function(width, height) {
    return { left: 10, right: 20, top: 20, bottom: 30 };
  },

  zoomAtPoint: function(mouseX, mouseY, canvasWidth, canvasHeight, zoomFactor) {
    var padding = this.getPadding(canvasWidth, canvasHeight);
    var chartWidth = canvasWidth - padding.left - padding.right;
    var chartHeight = canvasHeight - padding.top - padding.bottom;
    var xRatio = Math.max(0, Math.min(1, (mouseX - padding.left) / chartWidth));
    var yRatio = Math.max(0, Math.min(1, (mouseY - padding.top) / chartHeight));
    var xRange = this.zoom.xMax - this.zoom.xMin;
    var yRange = this.zoom.yMax - this.zoom.yMin;
    var newXRange = xRange * zoomFactor;
    var newYRange = yRange * zoomFactor;
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
    if (xRange < 5) { var cx = (this.zoom.xMin + this.zoom.xMax) / 2; this.zoom.xMin = cx - 2.5; this.zoom.xMax = cx + 2.5; }
    if (xRange > this.totalDays) { this.zoom.xMin = 0; this.zoom.xMax = this.totalDays - 1; }
    if (yRange < 2) { var cy = (this.zoom.yMin + this.zoom.yMax) / 2; this.zoom.yMin = cy - 1; this.zoom.yMax = cy + 1; }
    if (this.zoom.xMin < 0) { this.zoom.xMax -= this.zoom.xMin; this.zoom.xMin = 0; }
    if (this.zoom.xMax > this.totalDays - 1) { this.zoom.xMin -= (this.zoom.xMax - this.totalDays + 1); this.zoom.xMax = this.totalDays - 1; }
    if (this.zoom.yMin < 0) { this.zoom.yMax -= this.zoom.yMin; this.zoom.yMin = 0; }
    var info = document.getElementById('zoomInfo');
    if (info) {
      var xZoom = Math.round(this.totalDays / (this.zoom.xMax - this.zoom.xMin) * 100);
      info.textContent = xZoom + '%';
    }
  },

  resetZoom: function() {
    this.zoom.xMin = 0;
    this.zoom.xMax = this.totalDays - 1;
    this.zoom.yMin = 0;
    var chartData = this.buildChartData();
    this.zoom.yMax = this.findMaxY(chartData.data);
    this.clampZoom();
    this.drawChart();
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

    var chartData = this.buildChartData();
    var data = chartData.data;
    var labels = chartData.labels;
    this.totalDays = chartData.totalDays;

    this.zoom.yMin = 0;
    this.zoom.yMax = this.findMaxY(data);
    if (this.zoom.yMax <= 0) this.zoom.yMax = 10;

    var padding = this.getPadding(width, height);
    var chartWidth = width - padding.left - padding.right;
    var chartHeight = height - padding.top - padding.bottom;
    var xRange = this.zoom.xMax - this.zoom.xMin;
    var yRange = this.zoom.yMax - this.zoom.yMin;
    if (yRange <= 0) yRange = 10;

    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (var i = 0; i <= 4; i++) {
      var y = padding.top + (i / 4) * chartHeight;
      ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(width - padding.right, y); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(212,175,55,0.3)';
    ctx.beginPath(); ctx.moveTo(padding.left, padding.top); ctx.lineTo(padding.left, height - padding.bottom); ctx.lineTo(width - padding.right, height - padding.bottom); ctx.stroke();

    var metrics = this.allMetrics;
    for (var key in metrics) {
      var m = metrics[key];
      if (!this.activeMetrics[key]) continue;
      var series = data[key];
      if (!series) continue;

      ctx.strokeStyle = m.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      var started = false;
      for (var i = 0; i < series.length; i++) {
        if (series[i] === null) continue;
        var x = padding.left + ((i - this.zoom.xMin) / xRange) * chartWidth;
        var y = height - padding.bottom - ((series[i] - this.zoom.yMin) / yRange) * chartHeight;
        if (x < padding.left - 5 || x > width - padding.right + 5) continue;
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      for (var i = 0; i < series.length; i++) {
        if (series[i] === null) continue;
        var x = padding.left + ((i - this.zoom.xMin) / xRange) * chartWidth;
        var y = height - padding.bottom - ((series[i] - this.zoom.yMin) / yRange) * chartHeight;
        if (x < padding.left - 5 || x > width - padding.right + 5) continue;
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = m.color; ctx.fill();
        ctx.strokeStyle = '#0a0a0f'; ctx.lineWidth = 2; ctx.stroke();
      }
    }

    ctx.fillStyle = '#a0a0b0';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    var step = Math.max(1, Math.ceil(xRange / 8));
    for (var i = Math.ceil(this.zoom.xMin); i <= Math.floor(this.zoom.xMax); i += step) {
      if (i >= 0 && i < labels.length) {
        var x = padding.left + ((i - this.zoom.xMin) / xRange) * chartWidth;
        ctx.fillText(labels[i], x, height - padding.bottom + 18);
      }
    }

    ctx.textAlign = 'right';
    var yStep = Math.max(1, Math.ceil(yRange / 5));
    for (var v = Math.ceil(this.zoom.yMin); v <= Math.floor(this.zoom.yMax); v += yStep) {
      var y = height - padding.bottom - ((v - this.zoom.yMin) / yRange) * chartHeight;
      ctx.fillText(v, padding.left - 4, y + 4);
    }

    var legendY = padding.top + 10;
    ctx.textAlign = 'left';
    ctx.font = '12px Inter, sans-serif';
    for (var key in metrics) {
      var m = metrics[key];
      if (!this.activeMetrics[key]) continue;
      ctx.fillStyle = m.color;
      ctx.fillRect(width - padding.right - 130, legendY, 12, 12);
      ctx.fillStyle = '#a0a0b0';
      ctx.fillText(m.label, width - padding.right - 114, legendY + 10);
      legendY += 18;
    }
  },

  openCalendar: function() {
    var oldTooltip = document.getElementById('calendarTooltip');
    if (oldTooltip) oldTooltip.remove();

    var modal = document.createElement('div');
    modal.className = 'calendar-modal';
    modal.id = 'calendarModal';

    var content = document.createElement('div');
    content.className = 'calendar-content';

    content.innerHTML =
      '<button style="float:right;background:transparent;border:none;color:var(--text-secondary);font-size:1.5em;cursor:pointer" onclick="document.getElementById(\'calendarModal\').remove()"><i class="ph ph-x"></i></button>' +
      '<h2 style="font-family:var(--font-display);color:var(--accent-gold);margin-top:0;display:flex;align-items:center;gap:10px"><i class="ph ph-calendar"></i> Календарь тренировок</h2>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin:16px 0">' +
        '<button class="btn btn-secondary" style="padding:8px 12px" onclick="StatsModule.changeMonth(-1)"><i class="ph ph-caret-left"></i></button>' +
        '<div id="calendarTitle" style="font-weight:600;font-size:1.1em;color:var(--accent-gold)"></div>' +
        '<button class="btn btn-secondary" style="padding:8px 12px" onclick="StatsModule.changeMonth(1)"><i class="ph ph-caret-right"></i></button>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:8px">' +
        '<div style="text-align:center;font-size:0.75em;opacity:0.6;padding:4px">Пн</div>' +
        '<div style="text-align:center;font-size:0.75em;opacity:0.6;padding:4px">Вт</div>' +
        '<div style="text-align:center;font-size:0.75em;opacity:0.6;padding:4px">Ср</div>' +
        '<div style="text-align:center;font-size:0.75em;opacity:0.6;padding:4px">Чт</div>' +
        '<div style="text-align:center;font-size:0.75em;opacity:0.6;padding:4px">Пт</div>' +
        '<div style="text-align:center;font-size:0.75em;opacity:0.6;padding:4px">Сб</div>' +
        '<div style="text-align:center;font-size:0.75em;opacity:0.6;padding:4px">Вс</div>' +
      '</div>' +
      '<div id="calendarGrid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px"></div>' +
      '<div style="margin-top:16px;display:flex;gap:12px;font-size:0.8em;flex-wrap:wrap;justify-content:center">' +
        '<div style="display:flex;align-items:center;gap:6px"><div style="width:12px;height:12px;background:rgba(74,222,128,0.3);border-radius:3px"></div> Полная</div>' +
        '<div style="display:flex;align-items:center;gap:6px"><div style="width:12px;height:12px;background:rgba(251,191,36,0.3);border-radius:3px"></div> Частичная</div>' +
        '<div style="display:flex;align-items:center;gap:6px"><div style="width:12px;height:12px;background:rgba(248,113,113,0.3);border-radius:3px"></div> Пропуск</div>' +
      '</div>';

    modal.appendChild(content);
    document.body.appendChild(modal);
    this.renderCalendar();
  },

  changeMonth: function(delta) {
    this.calendarMonth += delta;
    if (this.calendarMonth > 11) { this.calendarMonth = 0; this.calendarYear++; }
    if (this.calendarMonth < 0) { this.calendarMonth = 11; this.calendarYear--; }
    var now = new Date();
    if (this.calendarYear > now.getFullYear() || (this.calendarYear === now.getFullYear() && this.calendarMonth > now.getMonth())) {
      this.calendarMonth = now.getMonth();
      this.calendarYear = now.getFullYear();
    }
    this.renderCalendar();
  },

  renderCalendar: function() {
    var title = document.getElementById('calendarTitle');
    var grid = document.getElementById('calendarGrid');
    if (!title || !grid) return;

    var monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
    title.textContent = monthNames[this.calendarMonth] + ' ' + this.calendarYear;

    var history = this.getHistory();
    var firstDay = new Date(this.calendarYear, this.calendarMonth, 1);
    var lastDay = new Date(this.calendarYear, this.calendarMonth + 1, 0);
    var daysInMonth = lastDay.getDate();
    var startDay = (firstDay.getDay() + 6) % 7;

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var html = '';
    for (var i = 0; i < startDay; i++) html += '<div></div>';

    for (var d = 1; d <= daysInMonth; d++) {
      var date = new Date(this.calendarYear, this.calendarMonth, d);
      var dateStr = date.toISOString().slice(0, 10);
      var dayRecord = null;
      for (var j = 0; j < history.length; j++) if (history[j].date === dateStr) { dayRecord = history[j]; break; }

      var cls = 'empty';
      var icon = '';
      var statusText = '';
      if (date > today) {
        cls = 'empty';
        statusText = 'Будущий день';
      } else if (dayRecord) {
        if (dayRecord.skipped) {
          cls = 'skipped';
          icon = '<i class="ph ph-x" style="color:var(--accent-error)"></i>';
          statusText = 'Пропуск';
        } else if (dayRecord.exercises && dayRecord.exercises.length > 0) {
          var allDone = true;
          var anyDone = false;
          if (dayRecord.details) {
            for (var k = 0; k < dayRecord.details.length; k++) {
              var det = dayRecord.details[k];
              if (det.sets) {
                for (var s = 0; s < det.sets.length; s++) {
                  if (det.sets[s] === 'done') anyDone = true;
                  else if (det.sets[s] === 'partial') { allDone = false; anyDone = true; }
                  else if (det.sets[s] === 'missed') { allDone = false; }
                }
              }
            }
          }
          if (allDone && anyDone) {
            cls = 'full';
            icon = '<i class="ph ph-check" style="color:var(--accent-success)"></i>';
            statusText = 'Полная тренировка';
          } else if (anyDone) {
            cls = 'partial';
            icon = '<i class="ph ph-warning" style="color:var(--accent-warning)"></i>';
            statusText = 'Частичная тренировка';
          } else {
            cls = 'full';
            icon = '<i class="ph ph-check" style="color:var(--accent-success)"></i>';
            statusText = 'Тренировка';
          }
        } else {
          statusText = 'Нет данных';
        }
      } else {
        statusText = 'Нет данных';
      }

      var isToday = date.getTime() === today.getTime();
      var dataAttrs = 'data-date="' + dateStr + '" data-status="' + statusText + '"';
      if (dayRecord) {
        if (dayRecord.exercises) dataAttrs += ' data-exercises="' + dayRecord.exercises.length + '"';
        if (dayRecord.weight) dataAttrs += ' data-weight="' + dayRecord.weight + '"';
        if (dayRecord.mood) dataAttrs += ' data-mood="' + dayRecord.mood + '"';
        if (dayRecord.duration) dataAttrs += ' data-duration="' + dayRecord.duration + '"';
      }
      html += '<div class="calendar-day ' + cls + '" style="' + (isToday ? 'border:2px solid var(--accent-gold);' : '') + '" title="' + dateStr + '" ' + dataAttrs + '>';
      html += '<div class="day-num">' + d + '</div>';
      html += '<div class="day-icon">' + icon + '</div>';
      html += '</div>';
    }
    grid.innerHTML = html;

    this.setupCalendarTooltips();
  },

  setupCalendarTooltips: function() {
    var self = this;
    var tooltip = document.getElementById('calendarTooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'calendar-tooltip';
      tooltip.id = 'calendarTooltip';
      document.body.appendChild(tooltip);
    }

    var days = document.querySelectorAll('.calendar-day');
    days.forEach(function(dayEl) {
      dayEl.addEventListener('mouseenter', function(e) {
        var dateStr = dayEl.getAttribute('data-date');
        var status = dayEl.getAttribute('data-status');
        if (!dateStr) return;

        var html = '<div class="ct-date">📅 ' + dateStr + '</div>';
        html += '<div class="ct-row"><div class="ct-dot" style="background:var(--accent-gold)"></div><div class="ct-label">Статус:</div><div class="ct-value">' + status + '</div></div>';

        var exercises = dayEl.getAttribute('data-exercises');
        if (exercises) html += '<div class="ct-row"><div class="ct-dot" style="background:#d4af37"></div><div class="ct-label">Упражнений:</div><div class="ct-value">' + exercises + '</div></div>';

        var weight = dayEl.getAttribute('data-weight');
        if (weight) html += '<div class="ct-row"><div class="ct-dot" style="background:#4ade80"></div><div class="ct-label">Вес:</div><div class="ct-value">' + weight + ' кг</div></div>';

        var mood = dayEl.getAttribute('data-mood');
        if (mood) html += '<div class="ct-row"><div class="ct-dot" style="background:#60a5fa"></div><div class="ct-label">Самочувствие:</div><div class="ct-value">' + mood + '/10</div></div>';

        var duration = dayEl.getAttribute('data-duration');
        if (duration) html += '<div class="ct-row"><div class="ct-dot" style="background:#a78bfa"></div><div class="ct-label">Длительность:</div><div class="ct-value">' + duration + ' мин</div></div>';

        var history = self.getHistory();
        var dayRecord = null;
        for (var i = 0; i < history.length; i++) if (history[i].date === dateStr) { dayRecord = history[i]; break; }
        if (dayRecord && dayRecord.survey) {
          var config = self.getSurveyConfig();
          if (config && config.questions) {
            for (var i = 0; i < config.questions.length; i++) {
              var q = config.questions[i];
              var val = dayRecord.survey[q.id];
              if (val !== undefined && val !== null) {
                var displayVal = val;
                if (q.type === 'emoji' && q.emojiSet && q.emojiSet[val]) displayVal = q.emojiSet[val];
                var shortQ = q.text.length > 25 ? q.text.substring(0, 25) + '…' : q.text;
                html += '<div class="ct-row"><div class="ct-dot" style="background:#f472b6"></div><div class="ct-label">' + shortQ + ':</div><div class="ct-value">' + displayVal + '</div></div>';
              }
            }
          }
        }

        tooltip.innerHTML = html;
        tooltip.style.display = 'block';
      });

      dayEl.addEventListener('mousemove', function(e) {
        var x = e.clientX + 15;
        var y = e.clientY + 15;
        if (x + 280 > window.innerWidth) x = e.clientX - 290;
        if (y + 200 > window.innerHeight) y = e.clientY - 210;
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
      });

      dayEl.addEventListener('mouseleave', function() {
        tooltip.style.display = 'none';
      });
    });
  }
};

window.StatsModule = StatsModule;
module.exports = StatsModule;