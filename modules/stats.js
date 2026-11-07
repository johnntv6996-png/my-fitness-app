// modules/stats.js
const StatsModule = {
  zoom: { xMin: 0, xMax: 29, yMin: 0, yMax: 10 },
  isPanning: false,
  panStart: { x: 0, y: 0 },
  panStartZoom: null,
  activeMetrics: {},
  allMetrics: {},
  totalDays: 30,
  calendarMonth: new Date().getMonth(),
  calendarYear: new Date().getFullYear(),
  lastMouseX: -1,
  lastMouseY: -1,
  _chartDataCache: null,
  _chartDataCacheKey: null,
  _legendExpanded: false,
  _initialized: false,

  init: function() {
    if (typeof Logger !== 'undefined') Logger.log('Модуль статистики инициализирован', 'info');
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { StatsModule.setup(); });
    } else { this.setup(); }
  },

  setup: function() {
    this.createStatsScreen();
    if (typeof Core !== 'undefined') {
      Core.addNavButton('Статистика', 'stats', '<i class="ph ph-chart-line-up"></i>');
      Core.registerScreen('stats', function() { StatsModule.createStatsScreen(); });
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
  getSurveyConfig: function() { return (typeof FTStorage !== 'undefined' ? FTStorage.get('survey_config') : null) || null; },

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

  buildChartDataCacheKey: function(history) {
    if (!history || history.length === 0) return 'empty';
    return history.length + '_' + history[0].date + '_' + history[history.length - 1].date + '_' + (history[history.length - 1].timestamp || 0);
  },

  buildChartData: function() {
    var history = this.getHistory();
    var key = this.buildChartDataCacheKey(history);
    if (this._chartDataCache && this._chartDataCacheKey === key) return this._chartDataCache;

    if (history.length === 0) {
      this._chartDataCache = { data: { exercises: [], weight: [], mood: [] }, labels: [], totalDays: 30 };
      this._chartDataCacheKey = key;
      return this._chartDataCache;
    }

    var dates = history.map(function(h) { return h.date; }).sort();
    var firstDate = new Date(dates[0] + 'T00:00:00');
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var msPerDay = 1000 * 60 * 60 * 24;
    var totalDays = Math.floor((today - firstDate) / msPerDay) + 1;
    if (totalDays < 1) totalDays = 1;

    var data = { exercises: [], weight: [], mood: [] };
    var labels = [];
    var historyMap = (typeof Core !== 'undefined' && Core.getHistoryMap) ? Core.getHistoryMap(history) : {};
    var config = this.getSurveyConfig();
    var surveyKeys = [];
    if (config && config.questions) {
      for (var i = 0; i < config.questions.length; i++) {
        var q = config.questions[i];
        if (['rating', 'emoji', 'range', 'number'].indexOf(q.type) !== -1) {
          var key2 = 'survey_' + q.id;
          data[key2] = [];
          surveyKeys.push(key2);
        }
      }
    }

    for (var i = 0; i < totalDays; i++) {
      var date = new Date(firstDate);
      date.setDate(date.getDate() + i);
      var dateStr = (typeof Core !== 'undefined' && Core.utils && Core.utils.formatLocalDate) ? Core.utils.formatLocalDate(date) : date.toISOString().slice(0, 10);
      var dayRecord = historyMap[dateStr] || null;
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

    // Инициализация зума только один раз
    if (!this._initialized) {
      this.zoom.xMin = 0;
      this.zoom.xMax = totalDays - 1;
      this.zoom.yMin = 0;
      this.zoom.yMax = this.findMaxY(data);
      if (this.zoom.yMax <= 0) this.zoom.yMax = 10;
      this._initialized = true;
    }

    this._chartDataCache = { data: data, labels: labels, totalDays: totalDays };
    this._chartDataCacheKey = key;
    return this._chartDataCache;
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
    // Округляем до удобного значения
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
      if (!sortedHistory[i].skipped && sortedHistory[i].exercises && sortedHistory[i].exercises.length > 0) {
        tempStreak++;
        if (tempStreak > bestStreak) bestStreak = tempStreak;
      } else { tempStreak = 0; }
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
      '.metrics-strip::-webkit-scrollbar { height: 6px; }' +
      '.metrics-strip::-webkit-scrollbar-thumb { background:var(--accent-gold); border-radius:3px; }' +
      '.metric-chip { display:flex; align-items:center; gap:6px; padding:6px 10px; background:var(--bg-secondary); border:1px solid var(--border-subtle); border-radius:16px; cursor:pointer; transition:all 0.2s; user-select:none; white-space:nowrap; flex-shrink:0; font-size:0.85em; }' +
      '.metric-chip:hover { border-color:var(--border-gold); }' +
      '.metric-chip.active { border-color:var(--accent-gold); background:var(--accent-gold-dim); }' +
      '.metric-chip input { display:none; }' +
      '.metric-chip .dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }' +
      '.metric-chip .check { font-size:0.9em; opacity:0; transition:opacity 0.2s; }' +
      '.metric-chip.active .check { opacity:1; }' +
      '.chart-zoom-info { position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.7); padding:6px 10px; border-radius:6px; font-size:0.75em; color:var(--text-primary); z-index:5; pointer-events:none; font-weight:600; }' +
      'body.light-theme .chart-zoom-info { background:rgba(255,255,255,0.9); color:var(--text-primary); }' +
      '.chart-reset-btn { position:absolute; top:10px; left:10px; background:rgba(212,175,55,0.2); border:1px solid var(--border-gold); color:var(--accent-gold); padding:6px 10px; border-radius:6px; font-size:0.75em; cursor:pointer; z-index:5; display:flex; align-items:center; gap:4px; }' +
      '.chart-reset-btn:hover { background:rgba(212,175,55,0.3); }' +
      '.chart-legend { position:absolute; top:40px; right:10px; background:rgba(10,10,15,0.9); backdrop-filter:blur(10px); border:1px solid var(--border-gold); border-radius:10px; padding:10px 14px; z-index:15; max-height:200px; overflow-y:auto; min-width:150px; pointer-events:auto; cursor:pointer; }' +
      'body.light-theme .chart-legend { background:rgba(245,242,235,0.95); }' +
      '.chart-legend::-webkit-scrollbar { width:4px; }' +
      '.chart-legend::-webkit-scrollbar-thumb { background:var(--accent-gold); border-radius:2px; }' +
      '.legend-item { display:flex; align-items:center; gap:8px; margin-bottom:6px; font-size:0.8em; }' +
      '.legend-item:last-child { margin-bottom:0; }' +
      '.legend-color { width:12px; height:12px; border-radius:3px; flex-shrink:0; }' +
      '.legend-label { color:var(--text-secondary); flex:1; }' +
      '.tooltip { position:absolute; background:var(--bg-secondary); border:1px solid var(--border-gold); border-radius:8px; padding:10px 14px; font-size:0.8em; pointer-events:none; z-index:20; box-shadow:0 4px 12px rgba(0,0,0,0.5); max-width:250px; }' +
      '.tooltip-row { display:flex; align-items:center; gap:8px; margin-bottom:4px; }' +
      '.tooltip-row:last-child { margin-bottom:0; }' +
      '.tooltip-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }' +
      '.tooltip-label { opacity:0.7; flex:1; }' +
      '.tooltip-value { font-weight:600; color:var(--accent-gold); }' +
      '.tooltip-date { font-weight:600; color:var(--accent-gold); margin-bottom:6px; padding-bottom:6px; border-bottom:1px solid var(--border-subtle); }' +
      '.chart-scrollbar-h { position:absolute; bottom:0; left:0; right:0; height:8px; background:rgba(0,0,0,0.2); cursor:pointer; }' +
      '.chart-scrollbar-v { position:absolute; top:0; right:0; bottom:0; width:8px; background:rgba(0,0,0,0.2); cursor:pointer; }' +
      '.chart-scrollbar-thumb { position:absolute; background:var(--accent-gold); border-radius:4px; opacity:0.6; }' +
      '.chart-scrollbar-thumb:hover { opacity:1; }' +
      '@media (max-width: 600px) { .stat-metric-value { font-size:1.6em; } .stat-card { padding:14px; } .chart-canvas-wrap { height:320px; } }' +
      '@media (prefers-reduced-motion: reduce) { .stat-card, .metric-chip { transition: none !important; } }' +
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
    chartHtml += '<div class="chart-scrollbar-h" id="scrollbarH"><div class="chart-scrollbar-thumb" id="scrollbarThumbH" style="height:100%"></div></div>';
    chartHtml += '<div class="chart-scrollbar-v" id="scrollbarV"><div class="chart-scrollbar-thumb" id="scrollbarThumbV" style="width:100%"></div></div>';
    chartHtml += '</div>';
    chartHtml += '<div class="metrics-strip" id="metricsStrip"></div>';
    chartHtml += '</div></div>';

    var streakHtml = '<div class="stat-card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">';
    streakHtml += '<h3 style="font-family:var(--font-display);color:var(--accent-gold);margin:0;display:flex;align-items:center;gap:10px"><i class="ph ph-flame"></i> Последние 14 дней</h3>';
    streakHtml += '<button class="btn btn-secondary" style="padding:8px 12px;font-size:0.85em" onclick="StatsModule.openCalendar()"><i class="ph ph-calendar"></i> Календарь</button>';
    streakHtml += '</div>';
    if (hintsEnabled) streakHtml += '<div class="hint" style="display:flex;align-items:center;gap:4px;margin-bottom:12px"><i class="ph ph-info"></i> Зелёный = тренировка, красный = пропуск</div>';
    streakHtml += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">';
    var historyMap = (typeof Core !== 'undefined' && Core.getHistoryMap) ? Core.getHistoryMap(history) : {};
    for (var i = 13; i >= 0; i--) {
      var date = new Date(); date.setDate(date.getDate() - i);
      var dateStr = (typeof Core !== 'undefined' && Core.utils && Core.utils.formatLocalDate) ? Core.utils.formatLocalDate(date) : date.toISOString().slice(0, 10);
      var dayRecord = historyMap[dateStr] || null;
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
    setTimeout(function() { self.setupChartInteractions(); self.drawChart(); self.updateScrollbars(); }, 50);
  },

  renderMetricChips: function() {
    var esc = (typeof Core !== 'undefined' && Core.utils) ? Core.utils.escapeHtml : function(t){return t;};
    var strip = document.getElementById('metricsStrip');
    if (!strip) return;
    var html = '';
    for (var key in this.allMetrics) {
      var m = this.allMetrics[key];
      var active = this.activeMetrics[key] ? 'active' : '';
      html += '<div class="metric-chip ' + active + '" onclick="StatsModule.toggleMetricChip(\'' + esc(key) + '\')">';
      html += '<input type="checkbox" ' + (this.activeMetrics[key] ? 'checked' : '') + '>';
      html += '<span class="check">✓</span>';
      html += '<div class="dot" style="background:' + m.color + '"></div>';
      html += '<span>' + esc(m.label) + '</span>';
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
    if (wrap.dataset.inited === '1') return;
    wrap.dataset.inited = '1';
    var canvas = document.getElementById('activityChart');
    var self = this;
    var drawRaf = (typeof Core !== 'undefined' && Core.utils && Core.utils.throttleRaf) ? Core.utils.throttleRaf(function() { self.drawChart(); }) : function() { self.drawChart(); };

    // Wheel zoom
    wrap.addEventListener('wheel', function(e) {
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      var mouseX = e.clientX - rect.left;
      var mouseY = e.clientY - rect.top;
      var zoomFactor = e.deltaY > 0 ? 1.15 : 0.87;
      self.zoomAtPoint(mouseX, mouseY, rect.width, rect.height, zoomFactor);
    }, { passive: false });

    // Pan
    wrap.addEventListener('pointerdown', function(e) {
      if (e.target.closest('.chart-legend')) return;
      if (e.target.closest('.chart-reset-btn')) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      self.isPanning = true;
      self.panStart = { x: e.clientX, y: e.clientY };
      self.panStartZoom = { xMin: self.zoom.xMin, xMax: self.zoom.xMax, yMin: self.zoom.yMin, yMax: self.zoom.yMax };
      wrap.style.cursor = 'grabbing';
      wrap.setPointerCapture && wrap.setPointerCapture(e.pointerId);
    });

    wrap.addEventListener('pointermove', function(e) {
      if (!self.isPanning) { self.handleTooltip(e); return; }
      var rect = canvas.getBoundingClientRect();
      var dx = e.clientX - self.panStart.x;
      var dy = e.clientY - self.panStart.y;
      var xRange = self.panStartZoom.xMax - self.panStartZoom.xMin;
      var yRange = self.panStartZoom.yMax - self.panStartZoom.yMin;
      self.zoom.xMin = self.panStartZoom.xMin - (dx / rect.width) * xRange;
      self.zoom.xMax = self.panStartZoom.xMax - (dx / rect.width) * xRange;
      self.zoom.yMin = self.panStartZoom.yMin - (dy / rect.height) * yRange;
      self.zoom.yMax = self.panStartZoom.yMax - (dy / rect.height) * yRange;
      self.clampZoom();
      drawRaf();
      self.updateScrollbars();
    });

    wrap.addEventListener('pointerup', function(e) {
      if (self.isPanning) {
        self.isPanning = false;
        wrap.style.cursor = 'crosshair';
        wrap.releasePointerCapture && e.pointerId && wrap.releasePointerCapture(e.pointerId);
      }
    });

    wrap.addEventListener('pointercancel', function() {
      if (self.isPanning) {
        self.isPanning = false;
        wrap.style.cursor = 'crosshair';
      }
    });

    canvas.addEventListener('pointerleave', function() {
      self.lastMouseX = -1;
      self.lastMouseY = -1;
      var tooltip = document.getElementById('chartTooltip');
      if (tooltip) tooltip.style.display = 'none';
    });

    canvas.addEventListener('click', function(e) {
      if (e.target.closest('.chart-legend')) return;
      self.handlePointClick(e);
    });

    // Touch pinch zoom
    var touchStartDist = 0;
    var touchStartZoom = null;
    wrap.addEventListener('touchstart', function(e) {
      if (e.touches.length === 2) {
        touchStartDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        touchStartZoom = { xMin: self.zoom.xMin, xMax: self.zoom.xMax, yMin: self.zoom.yMin, yMax: self.zoom.yMax };
      }
    }, { passive: true });

    wrap.addEventListener('touchmove', function(e) {
      if (e.touches.length === 2 && touchStartZoom) {
        var dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        var scale = touchStartDist / dist;
        var cx = (touchStartZoom.xMin + touchStartZoom.xMax) / 2;
        var xRange = (touchStartZoom.xMax - touchStartZoom.xMin) * scale;
        self.zoom.xMin = cx - xRange / 2;
        self.zoom.xMax = cx + xRange / 2;
        self.clampZoom();
        drawRaf();
        self.updateScrollbars();
      }
    }, { passive: true });

    wrap.addEventListener('touchend', function() { touchStartZoom = null; });

    // Scrollbars
    var scrollbarH = document.getElementById('scrollbarH');
    var scrollbarV = document.getElementById('scrollbarV');
    var thumbH = document.getElementById('scrollbarThumbH');
    var thumbV = document.getElementById('scrollbarThumbV');
    var scrollState = { h: false, v: false, startX: 0, startY: 0, startZoomX: 0, startZoomY: 0 };

    if (scrollbarH && thumbH) {
      scrollbarH.addEventListener('pointerdown', function(e) {
        scrollState.h = true;
        scrollState.startX = e.clientX;
        scrollState.startZoomX = { min: self.zoom.xMin, max: self.zoom.xMax };
        scrollbarH.setPointerCapture && scrollbarH.setPointerCapture(e.pointerId);
        e.stopPropagation();
      });
      scrollbarH.addEventListener('pointermove', function(e) {
        if (!scrollState.h) return;
        var rect = scrollbarH.getBoundingClientRect();
        var dx = e.clientX - scrollState.startX;
        var xRange = scrollState.startZoomX.max - scrollState.startZoomX.min;
        var moveRatio = dx / (rect.width - xRange);
        self.zoom.xMin = scrollState.startZoomX.min + moveRatio * (self.totalDays - 1 - xRange);
        self.zoom.xMax = self.zoom.xMin + xRange;
        self.clampZoom();
        drawRaf();
        self.updateScrollbars();
      });
      scrollbarH.addEventListener('pointerup', function() { scrollState.h = false; });
    }

    if (scrollbarV && thumbV) {
      scrollbarV.addEventListener('pointerdown', function(e) {
        scrollState.v = true;
        scrollState.startY = e.clientY;
        scrollState.startZoomY = { min: self.zoom.yMin, max: self.zoom.yMax };
        scrollbarV.setPointerCapture && scrollbarV.setPointerCapture(e.pointerId);
        e.stopPropagation();
      });
      scrollbarV.addEventListener('pointermove', function(e) {
        if (!scrollState.v) return;
        var rect = scrollbarV.getBoundingClientRect();
        var dy = e.clientY - scrollState.startY;
        var yRange = scrollState.startZoomY.max - scrollState.startZoomY.min;
        var moveRatio = -dy / (rect.height - yRange);
        self.zoom.yMin = scrollState.startZoomY.min + moveRatio * (self.zoom.yMax - yRange);
        self.zoom.yMax = self.zoom.yMin + yRange;
        self.clampZoom();
        drawRaf();
        self.updateScrollbars();
      });
      scrollbarV.addEventListener('pointerup', function() { scrollState.v = false; });
    }
  },

  updateScrollbars: function() {
    var thumbH = document.getElementById('scrollbarThumbH');
    var thumbV = document.getElementById('scrollbarThumbV');
    var wrap = document.getElementById('chartWrap');
    if (!thumbH || !thumbV || !wrap) return;

    var xRange = this.zoom.xMax - this.zoom.xMin;
    var yRange = this.zoom.yMax - this.zoom.yMin;
    var hPercent = Math.min(100, Math.max(10, (xRange / this.totalDays) * 100));
    var vPercent = Math.min(100, Math.max(10, (yRange / this.zoom.yMax) * 100));
    var hLeft = (this.zoom.xMin / this.totalDays) * 100;
    var vBottom = (this.zoom.yMin / this.zoom.yMax) * 100;

    thumbH.style.width = hPercent + '%';
    thumbH.style.left = hLeft + '%';
    thumbV.style.height = vPercent + '%';
    thumbV.style.bottom = vBottom + '%';
  },

  handleTooltip: function(e) {
    var canvas = document.getElementById('activityChart');
    var tooltip = document.getElementById('chartTooltip');
    if (!canvas || !tooltip) return;
    if (e.target.closest('.chart-legend')) { tooltip.style.display = 'none'; return; }
    var rect = canvas.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
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
    if (history.length === 0) { tooltip.style.display = 'none'; return; }
    var dates = history.map(function(h) { return h.date; }).sort();
    var firstDate = new Date(dates[0] + 'T00:00:00');
    var date = new Date(firstDate);
    date.setDate(date.getDate() + dayIdx);
    var dateStr = (typeof Core !== 'undefined' && Core.utils && Core.utils.formatLocalDate) ? Core.utils.formatLocalDate(date) : date.toISOString().slice(0, 10);
    var historyMap = (typeof Core !== 'undefined' && Core.getHistoryMap) ? Core.getHistoryMap(history) : {};
    var dayRecord = historyMap[dateStr] || null;
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
      html += '<div class="tooltip-label">' + (typeof Core !== 'undefined' && Core.utils ? Core.utils.escapeHtml(m.label) : m.label) + '</div>';
      html += '<div class="tooltip-value">' + this.formatMetricValue(val, m) + '</div>';
      html += '</div>';
    }
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
    if (history.length === 0) return;
    var dates = history.map(function(h) { return h.date; }).sort();
    var firstDate = new Date(dates[0] + 'T00:00:00');
    var date = new Date(firstDate);
    date.setDate(date.getDate() + dayIdx);
    var dateStr = (typeof Core !== 'undefined' && Core.utils && Core.utils.formatLocalDate) ? Core.utils.formatLocalDate(date) : date.toISOString().slice(0, 10);
    var historyMap = (typeof Core !== 'undefined' && Core.getHistoryMap) ? Core.getHistoryMap(history) : {};
    var dayRecord = historyMap[dateStr] || null;
    if (dayRecord) {
      var info = ' ' + dateStr + '\n';
      if (dayRecord.exercises) info += 'Упражнений: ' + dayRecord.exercises.length + '\n';
      if (dayRecord.weight) info += 'Вес: ' + dayRecord.weight + ' кг\n';
      if (dayRecord.mood) info += 'Самочувствие: ' + dayRecord.mood + '/10\n';
      if (typeof Notify !== 'undefined') Notify.info(info); else alert(info);
    }
  },

  getPadding: function(width, height) {
    return { left: width < 400 ? 28 : 36, right: width < 400 ? 12 : 20, top: 20, bottom: 30 };
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
    this.updateScrollbars();
  },

  clampZoom: function() {
    var xRange = this.zoom.xMax - this.zoom.xMin;
    var yRange = this.zoom.yMax - this.zoom.yMin;
    var minRange = Math.max(1, Math.floor(this.totalDays / 20));
    var maxRange = this.totalDays;

    if (xRange < minRange) {
      var cx = (this.zoom.xMin + this.zoom.xMax) / 2;
      this.zoom.xMin = cx - minRange / 2;
      this.zoom.xMax = cx + minRange / 2;
    }
    if (xRange > maxRange) {
      this.zoom.xMin = 0;
      this.zoom.xMax = this.totalDays - 1;
    }
    if (yRange < 2) {
      var cy = (this.zoom.yMin + this.zoom.yMax) / 2;
      this.zoom.yMin = cy - 1;
      this.zoom.yMax = cy + 1;
    }

    if (this.zoom.xMin < 0) {
      this.zoom.xMax -= this.zoom.xMin;
      this.zoom.xMin = 0;
    }
    if (this.zoom.xMax > this.totalDays - 1) {
      this.zoom.xMin -= (this.zoom.xMax - this.totalDays + 1);
      this.zoom.xMax = this.totalDays - 1;
    }
    if (this.zoom.yMin < 0) {
      this.zoom.yMax -= this.zoom.yMin;
      this.zoom.yMin = 0;
    }

    var info = document.getElementById('zoomInfo');
    if (info) {
      var xZoom = Math.round(this.totalDays / (this.zoom.xMax - this.zoom.xMin) * 100);
      info.textContent = xZoom + '%';
    }
  },

  resetZoom: function() {
    this._initialized = false;
    this.zoom.xMin = 0;
    this.zoom.xMax = this.totalDays - 1;
    this.zoom.yMin = 0;
    this.zoom.yMax = 10;
    var chartData = this.buildChartData();
    this.zoom.yMax = this.findMaxY(chartData.data);
    if (this.zoom.yMax <= 0) this.zoom.yMax = 10;
    this.clampZoom();
    this.drawChart();
    this.updateScrollbars();
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

    // Обновляем yMax на основе данных
    var maxY = this.findMaxY(data);
    if (this.zoom.yMax < maxY || this.zoom.yMax === 0) {
      this.zoom.yMax = maxY;
    }
    if (this.zoom.yMax <= 0) this.zoom.yMax = 10;

    var padding = this.getPadding(width, height);
    var chartWidth = width - padding.left - padding.right;
    var chartHeight = height - padding.top - padding.bottom;
    var xRange = this.zoom.xMax - this.zoom.xMin;
    var yRange = this.zoom.yMax - this.zoom.yMin;
    if (yRange <= 0) yRange = 10;

    // Сетка
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (var i = 0; i <= 4; i++) {
      var y = padding.top + (i / 4) * chartHeight;
      ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(width - padding.right, y); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(212,175,55,0.3)';
    ctx.beginPath(); ctx.moveTo(padding.left, padding.top); ctx.lineTo(padding.left, height - padding.bottom); ctx.lineTo(width - padding.right, height - padding.bottom); ctx.stroke();

    // Линии метрик - рисуем через весь график
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
      var prevX = null, prevY = null;

      for (var i = 0; i < series.length; i++) {
        if (series[i] === null) continue;
        var x = padding.left + ((i - this.zoom.xMin) / xRange) * chartWidth;
        var y = height - padding.bottom - ((series[i] - this.zoom.yMin) / yRange) * chartHeight;

        // Рисуем линию даже если точка за пределами видимой области
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
        prevX = x;
        prevY = y;
      }
      ctx.stroke();

      // Точки
      for (var i = 0; i < series.length; i++) {
        if (series[i] === null) continue;
        var x = padding.left + ((i - this.zoom.xMin) / xRange) * chartWidth;
        var y = height - padding.bottom - ((series[i] - this.zoom.yMin) / yRange) * chartHeight;
        if (x < padding.left - 10 || x > width - padding.right + 10) continue;
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = m.color; ctx.fill();
        ctx.strokeStyle = '#0a0a0f'; ctx.lineWidth = 2; ctx.stroke();
      }
    }

    // Подписи осей
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

    // Легенда
    var oldLegend = document.getElementById('chartLegend');
    if (oldLegend) oldLegend.remove();
    var legendDiv = document.createElement('div');
    legendDiv.id = 'chartLegend';
    legendDiv.className = 'chart-legend';
    var hasAny = false;
    var itemsHtml = '';
    var esc = (typeof Core !== 'undefined' && Core.utils) ? Core.utils.escapeHtml : function(t){return t;};
    for (var key in metrics) {
      var m = metrics[key];
      if (!this.activeMetrics[key]) continue;
      hasAny = true;
      itemsHtml += '<div class="legend-item"><div class="legend-color" style="background:' + m.color + '"></div><div class="legend-label">' + esc(m.label) + '</div></div>';
    }
    var activeCount = 0;
    for (var key in metrics) if (this.activeMetrics[key]) activeCount++;
    legendDiv.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">' +
      '<div style="font-size:0.8em;color:var(--text-secondary);display:flex;align-items:center;gap:6px"><i class="ph ph-list"></i> Метрики (' + activeCount + ')</div>' +
      '<i class="ph ' + (this._legendExpanded ? 'ph-caret-up' : 'ph-caret-down') + '" style="color:var(--accent-gold);font-size:0.9em"></i>' +
    '</div>' + (this._legendExpanded && hasAny ? '<div style="margin-top:8px;border-top:1px solid var(--border-subtle);padding-top:8px;max-height:180px;overflow-y:auto">' + itemsHtml + '</div>' : '');
    legendDiv.onclick = function(e) {
      e.stopPropagation();
      StatsModule._legendExpanded = !StatsModule._legendExpanded;
      StatsModule.drawChart();
    };
    if (hasAny) wrap.appendChild(legendDiv);
  },

  openCalendar: function() {
    // ... (оставляем как было)
  },

  changeMonth: function(delta) {
    // ... (оставляем как было)
  },

  renderCalendar: function() {
    // ... (оставляем как было)
  },

  setupCalendarTooltips: function() {
    // ... (оставляем как было)
  }
};
window.StatsModule = StatsModule;
module.exports = StatsModule;