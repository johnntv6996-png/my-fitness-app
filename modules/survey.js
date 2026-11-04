// modules/survey.js

const SurveyModule = {
  init: function() {
    console.log('📋 Survey module initialized');
    if (typeof Logger !== 'undefined') Logger.log('Модуль опросов инициализирован', 'info');
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { SurveyModule.setup(); });
    } else { this.setup(); }
  },
  setup: function() {
    this.createSurveyScreen();
    if (typeof Core !== 'undefined') Core.addNavButton('Опросы', 'survey', '📋');
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
        { id: 'q3', type: 'rating', text: 'Насколько ты доволен результатом?', min: 1, max: 10 },
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
      '.survey-q { background:var(--card); border-radius:10px; padding:15px; margin-bottom:10px; border:1px solid var(--brd); }' +
      '.hint { font-size:0.75em; opacity:0.6; margin-top:3px; }' +
    '</style>';

    var html = css + '<div style="padding:15px;max-width:600px;margin:0 auto">';
    html += '<h2 style="color:var(--acc);margin-top:0">📋 Конструктор опросов</h2>';
    html += '<div class="hint" style="margin-bottom:15px">💡 Настрой вопросы для финального опроса после тренировки. Можно использовать стандартные или создать свои.</div>';

    html += '<button class="btn" style="width:100%;padding:10px;font-size:0.9em;background:var(--brd);color:var(--text);border:none;border-radius:6px;cursor:pointer;margin-bottom:15px" onclick="SurveyModule.resetToDefault()">🔄 Сбросить к стандартным</button>';

    for (var i = 0; i < config.questions.length; i++) {
      var q = config.questions[i];
      html += '<div class="survey-q">';
      html += '<div style="display:flex;justify-content:space-between;align-items:start;gap:10px">';
      html += '<div style="flex:1">';
      html += '<div style="font-weight:600;margin-bottom:8px">' + (i + 1) + '. ' + q.text + '</div>';
      html += '<div style="font-size:0.8em;opacity:0.7">Тип: ' + (q.type === 'rating' ? '⭐ Оценка ' + q.min + '-' + q.max : '📝 Текст') + '</div>';
      html += '</div>';
      html += '<div style="display:flex;gap:5px">';
      html += '<button class="btn" style="padding:4px 8px;font-size:0.8em;background:var(--brd);color:var(--text);border:none;border-radius:4px;cursor:pointer" onclick="SurveyModule.editQuestion(' + i + ')">✏️</button>';
      html += '<button class="btn" style="padding:4px 8px;font-size:0.8em;background:#e74c3c;color:#fff;border:none;border-radius:4px;cursor:pointer" onclick="SurveyModule.deleteQuestion(' + i + ')">🗑️</button>';
      html += '</div></div></div>';
    }

    html += '<button class="btn" style="width:100%;padding:12px;font-size:1em;font-weight:700;background:linear-gradient(135deg, var(--acc) 0%, #FFF8DC 100%);color:#3a2a0a;border:1px solid var(--acc);border-radius:8px;cursor:pointer;margin-top:15px" onclick="SurveyModule.addQuestion()">➕ Добавить вопрос</button>';
    html += '<button class="btn" style="width:100%;padding:12px;font-size:1em;font-weight:700;background:linear-gradient(135deg, var(--ok) 0%, #7FDD7F 100%);color:#1a3a1a;border:1px solid var(--ok);border-radius:8px;cursor:pointer;margin-top:10px" onclick="SurveyModule.testSurvey()">▶️ Тестовый запуск</button>';
    html += '</div>';

    screen.innerHTML = html;
  },

  resetToDefault: function() {
    if (!confirm('🔄 Сбросить опрос к стандартным вопросам?')) return;
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
    this.saveSurveyConfig(config);
    this.createSurveyScreen();
  },

  deleteQuestion: function(idx) {
    if (!confirm('🗑️ Удалить вопрос?')) return;
    var config = this.getSurveyConfig() || this.getDefaultSurvey();
    config.questions.splice(idx, 1);
    this.saveSurveyConfig(config);
    this.createSurveyScreen();
  },

  testSurvey: function() {
    var config = this.getSurveyConfig() || this.getDefaultSurvey();
    if (config.questions.length === 0) { alert('⚠️ Нет вопросов'); return; }
    this.runSurvey(config, function(answers) {
      alert('✅ Опрос пройден! Ответы сохранены.\n\n' + JSON.stringify(answers, null, 2));
    });
  },

  runSurvey: function(config, callback) {
    var currentQ = 0;
    var answers = {};

    var modal = document.createElement('div');
    modal.className = 'survey-modal';
    modal.id = 'finalSurveyModal';

    function renderQuestion() {
      if (currentQ >= config.questions.length) {
        modal.remove();
        if (callback) callback(answers);
        return;
      }
      var q = config.questions[currentQ];
      var content = '<div class="survey-modal-content">';
      content += '<div style="font-size:0.8em;opacity:0.7;margin-bottom:10px">Вопрос ' + (currentQ + 1) + ' из ' + config.questions.length + '</div>';
      content += '<h2 style="color:var(--acc);margin-top:0">' + q.text + '</h2>';

      if (q.type === 'rating') {
        content += '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:20px 0">';
        for (var v = q.min; v <= q.max; v++) {
          content += '<button class="btn" style="width:50px;height:50px;font-size:1.2em;background:var(--brd);color:var(--text);border:none;border-radius:8px;cursor:pointer" onclick="SurveyModule._surveyAnswer(' + v + ')">' + v + '</button>';
        }
        content += '</div>';
      } else {
        content += '<textarea id="surveyTextAnswer" rows="4" placeholder="Твой ответ..." style="width:100%;padding:10px;background:var(--inp);border:1px solid var(--brd);border-radius:6px;color:var(--text);font-size:1em;resize:vertical;margin:15px 0"></textarea>';
        content += '<button class="btn" style="width:100%;padding:12px;background:var(--ok);color:#2c3e50;border:none;border-radius:6px;cursor:pointer;font-weight:700" onclick="SurveyModule._surveyTextAnswer()">✅ Ответить</button>';
      }

      content += '<button class="btn" style="width:100%;padding:10px;background:var(--brd);color:var(--text);border:none;border-radius:6px;cursor:pointer;margin-top:10px" onclick="SurveyModule._surveySkip()">⏭ Пропустить</button>';
      content += '</div>';
      modal.innerHTML = content;
    }

    document.body.appendChild(modal);
    renderQuestion();
  },

  _surveyAnswer: function(value) {
    var config = SurveyModule.getSurveyConfig() || SurveyModule.getDefaultSurvey();
    var modal = document.getElementById('finalSurveyModal');
    if (!modal) return;
    var q = config.questions[SurveyModule._currentQ || 0];
    if (!q) return;
    SurveyModule._answers = SurveyModule._answers || {};
    SurveyModule._answers[q.id] = value;
    SurveyModule._currentQ = (SurveyModule._currentQ || 0) + 1;
    SurveyModule._renderNext();
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
    SurveyModule._renderNext();
  },

  _surveySkip: function() {
    var config = SurveyModule.getSurveyConfig() || SurveyModule.getDefaultSurvey();
    var q = config.questions[SurveyModule._currentQ || 0];
    if (!q) return;
    SurveyModule._answers = SurveyModule._answers || {};
    SurveyModule._answers[q.id] = null;
    SurveyModule._currentQ = (SurveyModule._currentQ || 0) + 1;
    SurveyModule._renderNext();
  },

  _renderNext: function() {
    var config = SurveyModule.getSurveyConfig() || SurveyModule.getDefaultSurvey();
    var modal = document.getElementById('finalSurveyModal');
    if (!modal) return;
    if (SurveyModule._currentQ >= config.questions.length) {
      modal.remove();
      alert('✅ Опрос пройден!');
      if (SurveyModule._surveyCallback) SurveyModule._surveyCallback(SurveyModule._answers);
      return;
    }
    var q = config.questions[SurveyModule._currentQ];
    var content = '<div class="survey-modal-content">';
    content += '<div style="font-size:0.8em;opacity:0.7;margin-bottom:10px">Вопрос ' + (SurveyModule._currentQ + 1) + ' из ' + config.questions.length + '</div>';
    content += '<h2 style="color:var(--acc);margin-top:0">' + q.text + '</h2>';
    if (q.type === 'rating') {
      content += '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:20px 0">';
      for (var v = q.min; v <= q.max; v++) {
        content += '<button class="btn" style="width:50px;height:50px;font-size:1.2em;background:var(--brd);color:var(--text);border:none;border-radius:8px;cursor:pointer" onclick="SurveyModule._surveyAnswer(' + v + ')">' + v + '</button>';
      }
      content += '</div>';
    } else {
      content += '<textarea id="surveyTextAnswer" rows="4" placeholder="Твой ответ..." style="width:100%;padding:10px;background:var(--inp);border:1px solid var(--brd);border-radius:6px;color:var(--text);font-size:1em;resize:vertical;margin:15px 0"></textarea>';
      content += '<button class="btn" style="width:100%;padding:12px;background:var(--ok);color:#2c3e50;border:none;border-radius:6px;cursor:pointer;font-weight:700" onclick="SurveyModule._surveyTextAnswer()">✅ Ответить</button>';
    }
    content += '<button class="btn" style="width:100%;padding:10px;background:var(--brd);color:var(--text);border:none;border-radius:6px;cursor:pointer;margin-top:10px" onclick="SurveyModule._surveySkip()">⏭ Пропустить</button>';
    content += '</div>';
    modal.innerHTML = content;
  }
};

window.SurveyModule = SurveyModule;
module.exports = SurveyModule;