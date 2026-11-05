// modules/survey.js

const SurveyModule = {
  _currentQ: 0,
  _answers: {},
  _surveyCallback: null,

  init: function() {
    console.log('Survey module initialized');
    if (typeof Logger !== 'undefined') Logger.log('Модуль опросов инициализирован', 'info');
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { SurveyModule.setup(); });
    } else { this.setup(); }
  },
  setup: function() {
    this.createSurveyScreen();
    if (typeof Core !== 'undefined') Core.addNavButton('Опросы', 'survey', '<i class="ph ph-clipboard-text"></i>');
  },

  getSurveyConfig: function() {
    if (typeof FTStorage !== 'undefined') return FTStorage.get('survey_config') || null;
    return null;
  },
  saveSurveyConfig: function(c) { if (typeof FTStorage !== 'undefined') FTStorage.set('survey_config', c); },

  getDefaultSurvey: function() {
    return {
      questions: [
        { id: 'q1', type: 'rating', text: 'Как ты себя чувствуешь?', min: 1, max: 10 },
        { id: 'q2', type: 'rating', text: 'Насколько сложной была тренировка?', min: 1, max: 10 },
        { id: 'q3', type: 'rating', text: 'Насколько доволен результатом?', min: 1, max: 10 },
        { id: 'q4', type: 'text', text: 'Что понравилось больше всего?' },
        { id: 'q5', type: 'text', text: 'Что можно улучшить?' }
      ]
    };
  },

  createSurveyScreen: function() {
    var screen = document.getElementById('screen-survey');
    if (!screen) {
      screen = document.createElement('div');
      screen.id = 'screen-survey';
      screen.className = 'screen';
      document.getElementById('userInterface').appendChild(screen);
    }
    var config = this.getSurveyConfig();
    if (!config) config = this.getDefaultSurvey();

    var css = '<style>' +
      '.survey-q { background:var(--bg-card); border-radius:12px; padding:16px; margin-bottom:12px; border:1px solid var(--border-subtle); transition:all 0.2s; }' +
      '.survey-q:hover { border-color:var(--border-gold); }' +
      '.hint { font-size:0.75em; opacity:0.6; margin-top:3px; color:var(--text-secondary); }' +
    '</style>';

    var html = css + '<div style="padding:16px;max-width:700px;margin:0 auto">';
    html += '<h2 style="font-family:var(--font-display);font-size:2em;margin-bottom:10px;color:var(--accent-gold);display:flex;align-items:center;gap:12px"><i class="ph ph-clipboard-text"></i> Конструктор опросов</h2>';
    html += '<div class="hint" style="margin-bottom:18px;display:flex;align-items:center;gap:6px"><i class="ph ph-info"></i> Настрой вопросы для финального опроса. Числовые вопросы (оценка) появятся на графике в статистике.</div>';

    html += '<div style="background:var(--accent-gold-dim);border:1px solid var(--border-gold);border-radius:10px;padding:12px 16px;margin-bottom:18px;font-size:0.9em;display:flex;align-items:start;gap:10px">';
    html += '<i class="ph ph-info" style="color:var(--accent-gold);font-size:1.2em;margin-top:2px"></i>';
    html += '<div><strong style="color:var(--accent-gold)">Связь со статистикой:</strong><div style="margin-top:4px;opacity:0.8">Вопросы с типом "Оценка" автоматически появляются как метрики на графике. Ответы сохраняются в историю тренировок.</div></div>';
    html += '</div>';

    html += '<button class="btn btn-secondary" style="width:100%;padding:12px;font-size:0.95em;margin-bottom:18px" onclick="SurveyModule.resetToDefault()"><i class="ph ph-arrows-counter-clockwise"></i> Сбросить к стандартным</button>';

    for (var i = 0; i < config.questions.length; i++) {
      var q = config.questions[i];
      var isRating = q.type === 'rating';
      html += '<div class="survey-q">';
      html += '<div style="display:flex;justify-content:space-between;align-items:start;gap:10px">';
      html += '<div style="flex:1">';
      html += '<div style="font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:8px"><span style="color:var(--accent-gold);font-weight:700">' + (i + 1) + '.</span> ' + q.text + '</div>';
      html += '<div style="font-size:0.85em;opacity:0.7;display:flex;align-items:center;gap:6px;flex-wrap:wrap">';
      html += '<i class="ph ' + (isRating ? 'ph-star' : 'ph-text-t') + '"></i> Тип: ' + (isRating ? 'Оценка ' + q.min + '-' + q.max : 'Текст');
      if (isRating) html += ' <span style="color:var(--accent-gold);font-size:0.85em">· появится на графике</span>';
      html += '</div>';
      html += '</div>';
      html += '<div style="display:flex;gap:6px">';
      html += '<button class="btn btn-secondary" style="padding:6px 10px;font-size:0.85em" onclick="SurveyModule.editQuestion(' + i + ')"><i class="ph ph-pencil-simple"></i></button>';
      html += '<button class="btn btn-danger" style="padding:6px 10px;font-size:0.85em" onclick="SurveyModule.deleteQuestion(' + i + ')"><i class="ph ph-trash"></i></button>';
      html += '</div></div></div>';
    }

    html += '<button class="btn btn-primary" style="width:100%;padding:14px;font-size:1em;font-weight:600;margin-top:16px" onclick="SurveyModule.addQuestion()"><i class="ph ph-plus-circle"></i> Добавить вопрос</button>';
    html += '<button class="btn btn-success" style="width:100%;padding:14px;font-size:1em;font-weight:600;margin-top:10px" onclick="SurveyModule.testSurvey()"><i class="ph ph-play-circle"></i> Тестовый запуск</button>';
    html += '</div>';

    screen.innerHTML = html;
  },

  resetToDefault: function() {
    if (!confirm('Сбросить опрос к стандартным вопросам?')) return;
    this.saveSurveyConfig(this.getDefaultSurvey());
    this.createSurveyScreen();
  },

  addQuestion: function() {
    var text = prompt('Введи текст вопроса:');
    if (!text) return;
    var type = confirm('Нажми ОК для типа "Оценка (1-10)"\nНажми Отмена для типа "Текст"') ? 'rating' : 'text';
    var config = this.getSurveyConfig() || this.getDefaultSurvey();
    config.questions.push({ id: 'q_' + Date.now(), type: type, text: text, min: 1, max: 10 });
    this.saveSurveyConfig(config);
    this.createSurveyScreen();
  },

  editQuestion: function(idx) {
    var config = this.getSurveyConfig() || this.getDefaultSurvey();
    var q = config.questions[idx];
    var newText = prompt('Текст вопроса:', q.text);
    if (newText === null) return;
    q.text = newText;
    if (q.type === 'rating') {
      var newMax = prompt('Максимальное значение (1-10):', q.max || 10);
      if (newMax !== null) q.max = parseInt(newMax) || 10;
    }
    this.saveSurveyConfig(config);
    this.createSurveyScreen();
  },

  deleteQuestion: function(idx) {
    if (!confirm('Удалить вопрос? Он также исчезнет с графика в статистике.')) return;
    var config = this.getSurveyConfig() || this.getDefaultSurvey();
    config.questions.splice(idx, 1);
    this.saveSurveyConfig(config);
    this.createSurveyScreen();
  },

  testSurvey: function() {
    var config = this.getSurveyConfig() || this.getDefaultSurvey();
    if (config.questions.length === 0) { alert('Нет вопросов'); return; }
    this.runSurvey(config, function(answers) {
      alert('Опрос пройден! Ответы:\n\n' + JSON.stringify(answers, null, 2));
    });
  },

  runSurvey: function(config, callback) {
    this._currentQ = 0;
    this._answers = {};
    this._surveyCallback = callback;
    var modal = document.createElement('div');
    modal.className = 'workout-modal';
    modal.id = 'finalSurveyModal';
    modal.style.zIndex = '2200';
    document.body.appendChild(modal);
    this._renderQuestion();
  },

  _renderQuestion: function() {
    var config = SurveyModule.getSurveyConfig() || SurveyModule.getDefaultSurvey();
    var modal = document.getElementById('finalSurveyModal');
    if (!modal) return;
    var currentQ = SurveyModule._currentQ || 0;
    if (currentQ >= config.questions.length) {
      modal.remove();
      SurveyModule._saveSurveyAnswers();
      if (SurveyModule._surveyCallback) SurveyModule._surveyCallback(SurveyModule._answers);
      return;
    }
    var q = config.questions[currentQ];
    var content = document.createElement('div');
    content.className = 'workout-modal-content';
    content.style.maxWidth = '400px';
    var progress = document.createElement('div');
    progress.style.cssText = 'font-size:0.8em;opacity:0.7;margin-bottom:12px;display:flex;align-items:center;gap:6px';
    progress.innerHTML = '<i class="ph ph-clipboard-text"></i> Вопрос ' + (currentQ + 1) + ' из ' + config.questions.length;
    content.appendChild(progress);
    var title = document.createElement('h2');
    title.style.cssText = 'font-family:var(--font-display);color:var(--accent-gold);margin-top:0;text-align:center';
    title.textContent = q.text;
    content.appendChild(title);
    if (q.type === 'rating') {
      var buttonsDiv = document.createElement('div');
      buttonsDiv.style.cssText = 'display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:20px 0';
      for (var v = q.min || 1; v <= (q.max || 10); v++) {
        var btn = document.createElement('button');
        btn.className = 'btn btn-secondary';
        btn.textContent = v;
        btn.style.cssText = 'width:50px;height:50px;font-size:1.2em';
        (function(val) { btn.onclick = function() { SurveyModule._surveyAnswer(val); }; })(v);
        buttonsDiv.appendChild(btn);
      }
      content.appendChild(buttonsDiv);
    } else {
      var textarea = document.createElement('textarea');
      textarea.id = 'surveyTextAnswer';
      textarea.rows = 4;
      textarea.placeholder = 'Твой ответ...';
      textarea.style.cssText = 'width:100%;padding:12px;background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:10px;color:var(--text-primary);font-size:1em;resize:vertical;margin:16px 0;font-family:var(--font-primary)';
      content.appendChild(textarea);
      var submitBtn = document.createElement('button');
      submitBtn.className = 'btn btn-primary';
      submitBtn.innerHTML = '<i class="ph ph-check"></i> Ответить';
      submitBtn.style.cssText = 'width:100%;padding:14px';
      submitBtn.onclick = function() { SurveyModule._surveyTextAnswer(); };
      content.appendChild(submitBtn);
    }
    var skipBtn = document.createElement('button');
    skipBtn.className = 'btn btn-secondary';
    skipBtn.innerHTML = '<i class="ph ph-skip-forward"></i> Пропустить';
    skipBtn.style.cssText = 'width:100%;padding:12px;margin-top:12px';
    skipBtn.onclick = function() { SurveyModule._surveySkip(); };
    content.appendChild(skipBtn);
    modal.innerHTML = '';
    modal.appendChild(content);
  },

  _surveyAnswer: function(value) {
    var config = SurveyModule.getSurveyConfig() || SurveyModule.getDefaultSurvey();
    var q = config.questions[SurveyModule._currentQ || 0];
    if (!q) return;
    SurveyModule._answers = SurveyModule._answers || {};
    SurveyModule._answers[q.id] = value;
    SurveyModule._currentQ = (SurveyModule._currentQ || 0) + 1;
    SurveyModule._renderQuestion();
  },

  _surveyTextAnswer: function() {
    var textarea = document.getElementById('surveyTextAnswer');
    if (!textarea) return;
    var value = textarea.value.trim();
    var config = SurveyModule.getSurveyConfig() || SurveyModule.getDefaultSurvey();
    var q = config.questions[SurveyModule._currentQ || 0];
    if (!q) return;
    SurveyModule._answers = SurveyModule._answers || {};
    SurveyModule._answers[q.id] = value;
    SurveyModule._currentQ = (SurveyModule._currentQ || 0) + 1;
    SurveyModule._renderQuestion();
  },

  _surveySkip: function() {
    var config = SurveyModule.getSurveyConfig() || SurveyModule.getDefaultSurvey();
    var q = config.questions[SurveyModule._currentQ || 0];
    if (!q) return;
    SurveyModule._answers = SurveyModule._answers || {};
    SurveyModule._answers[q.id] = null;
    SurveyModule._currentQ = (SurveyModule._currentQ || 0) + 1;
    SurveyModule._renderQuestion();
  },

  // Сохраняет ответы в историю сегодняшнего дня
  _saveSurveyAnswers: function() {
    var todayStr = new Date().toISOString().slice(0, 10);
    var history = [];
    if (typeof FTStorage !== 'undefined') history = FTStorage.get('history') || [];
    var dayRecord = null;
    for (var i = 0; i < history.length; i++) {
      if (history[i].date === todayStr) { dayRecord = history[i]; break; }
    }
    if (!dayRecord) {
      dayRecord = { date: todayStr, dayName: ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'][(new Date().getDay() + 6) % 7], muscleGroup: '', exercises: [], details: [], duration: 0, timestamp: Date.now(), survey: {} };
      history.push(dayRecord);
    }
    if (!dayRecord.survey) dayRecord.survey = {};
    for (var key in SurveyModule._answers) {
      dayRecord.survey[key] = SurveyModule._answers[key];
    }
    // Начислить XP за прохождение опроса
    var stats = null;
    if (typeof FTStorage !== 'undefined') stats = FTStorage.get('stats') || {yes:0, later:0, no:0, xp:0, level:1, streak:0};
    if (stats) {
      stats.xp = (stats.xp || 0) + 10;
      var xpNeeded = stats.level * 100;
      if (stats.xp >= xpNeeded) { stats.xp -= xpNeeded; stats.level++; }
      if (typeof FTStorage !== 'undefined') FTStorage.set('stats', stats);
    }
    if (typeof FTStorage !== 'undefined') FTStorage.set('history', history);
    alert('✅ Опрос сохранён! +10 XP. Данные добавлены в статистику.');
  }
};

window.SurveyModule = SurveyModule;
module.exports = SurveyModule;