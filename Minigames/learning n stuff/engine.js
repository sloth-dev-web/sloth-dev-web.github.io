let completed = JSON.parse(localStorage.getItem('pythonCompleted') || '[]');
let currentLesson = null;
let quizStates = {};
let pyodide = null;

function showToast(message, type) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

async function loadPyodideEnv() {
    if (!pyodide) {
        pyodide = await loadPyodide();
    }
    return pyodide;
}

async function runCode(lessonId) {
    const editor = document.getElementById('editor-' + lessonId);
    const output = document.getElementById('output-' + lessonId);
    if (!editor || !output) return;

    const code = editor.value.trim();
    if (!code) return;

    output.className = 'output-box';
    output.textContent = 'loading python...';

    try {
        const py = await loadPyodideEnv();
        output.textContent = '';

        const wrapped = `
import sys, io
_stdout, _stderr = sys.stdout, sys.stderr
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
_err = False
try:
${code.split('\n').map(l => '    ' + l).join('\n')}
except Exception as e:
    print(e, file=sys.stderr)
    _err = True
_out = sys.stdout.getvalue()
_errmsg = sys.stderr.getvalue()
sys.stdout, sys.stderr = _stdout, _stderr
(_out, _err, _errmsg)`;

        const [out, hasErr, errmsg] = py.runPython(wrapped).toJs();

        if (hasErr) {
            output.textContent = errmsg || 'error';
            output.className = 'output-box error';
            showToast('wrong', 'error');
        } else {
            output.textContent = out || '# no output';
            output.className = 'output-box success';
            showToast('correct!', 'success');
        }
    } catch (err) {
        output.textContent = err.message;
        output.className = 'output-box error';
        showToast('wrong', 'error');
    }
}
const editors = {};

function saveProgress() {
    localStorage.setItem('pythonCompleted', JSON.stringify(completed));
}

function isComplete(id) {
    return completed.includes(id);
}

function markComplete(id) {
    if (!completed.includes(id)) {
        completed.push(id);
        saveProgress();
    }
}

function setupEditor(id) {
    const textarea = document.getElementById('editor-' + id);
    if (!textarea) return;

    editors[id] = textarea;

    const pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };

    function insertText(insert, offset) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const before = textarea.value.substring(0, start);
        const after = textarea.value.substring(end);
        textarea.value = before + insert + after;
        textarea.selectionStart = textarea.selectionEnd = start + offset;
    }

    textarea.addEventListener('keydown', function(e) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        if (e.key === 'Tab') {
            e.preventDefault();
            insertText('    ', 4);
            return;
        }

        const ch = e.key;
        if (pairs[ch] && ch !== '\n') {
            e.preventDefault();
            const selected = textarea.value.substring(start, end);

            if (ch === '"' || ch === "'") {
                if (selected && textarea.value[start] === ch && textarea.value[end - 1] === ch) {
                    textarea.selectionStart = start + 1;
                    textarea.selectionEnd = end - 1;
                    return;
                }
                insertText(ch + selected + ch, selected ? selected.length + 1 : 1);
                if (!selected) textarea.selectionStart = textarea.selectionEnd = start + 1;
            } else {
                insertText(ch + pairs[ch], 1);
            }
            return;
        }

        if ((ch === ')' || ch === ']' || ch === '}' || ch === '"' || ch === "'") && start === end) {
            if (textarea.value[start] === ch) {
                e.preventDefault();
                textarea.selectionStart = textarea.selectionEnd = start + 1;
                return;
            }
        }

        if (ch === 'Backspace' && start === end && start > 0) {
            const prev = textarea.value[start - 1];
            const next = textarea.value[start];
            if ((prev === '(' && next === ')') || (prev === '[' && next === ']') || (prev === '{' && next === '}') || (prev === '"' && next === '"') || (prev === "'" && next === "'")) {
                e.preventDefault();
                textarea.value = textarea.value.substring(0, start - 1) + textarea.value.substring(start + 1);
                textarea.selectionStart = textarea.selectionEnd = start - 1;
                return;
            }
        }
    });
}

function renderSidebar() {
    const list = document.getElementById('chapterList');
    const groups = {};
    LESSONS.forEach(l => {
        if (!groups[l.group]) groups[l.group] = { label: l.groupLabel, items: [] };
        groups[l.group].items.push(l);
    });

    list.innerHTML = '';
    for (const [key, group] of Object.entries(groups)) {
        const div = document.createElement('div');
        div.className = 'chapter-group';
        div.innerHTML = `<div class="chapter-group-title">${group.label}</div>`;
        group.items.forEach((lesson, i) => {
            const btn = document.createElement('button');
            btn.className = 'lesson-btn' + (isComplete(lesson.id) ? ' completed' : '') + (currentLesson === lesson.id ? ' active' : '');
            btn.innerHTML = `<span class="lesson-icon">${isComplete(lesson.id) ? '✓' : lesson.id.charAt(0).toUpperCase()}</span><span>${lesson.title}</span>`;
            btn.onclick = () => loadLesson(lesson.id);
            div.appendChild(btn);
        });
        list.appendChild(div);
    }

    const total = LESSONS.length;
    const done = completed.length;
    document.getElementById('progressFill').style.width = (done / total * 100) + '%';
    document.getElementById('progressText').textContent = `${done} / ${total} complete`;
}

function loadLesson(id) {
    const lesson = LESSONS.find(l => l.id === id);
    if (!lesson) return;
    currentLesson = id;
    quizStates[id] = quizStates[id] || { answers: {}, submitted: false };

    const content = document.getElementById('content');
    let html = `<div class="lesson-content">${lesson.lesson}</div>`;

    html += `<div class="section-divider"></div>`;

    html += `<div class="quiz-section"><h3>quiz</h3>`;
    lesson.quiz.forEach((q, qi) => {
        const state = quizStates[id];
        html += `<div class="quiz-question"><p>${qi + 1}. ${q.q}</p><div class="quiz-options">`;
        q.options.forEach((opt, oi) => {
            let cls = 'quiz-option';
            if (state.answers[qi] === oi) cls += ' selected';
            if (state.submitted) {
                cls += ' disabled';
                if (oi === q.answer) cls += ' correct';
                else if (state.answers[qi] === oi) cls += ' wrong';
            }
            html += `<div class="${cls}" onclick="selectQuiz('${id}', ${qi}, ${oi})">${opt}</div>`;
        });
        html += `</div></div>`;
    });
    if (!quizStates[id].submitted) {
        html += `<div class="quiz-actions"><button class="run-btn" onclick="submitQuiz('${id}')">check answers</button>`;
        html += `<span class="quiz-feedback" id="quizFeedback-${id}"></span></div>`;
    }
    html += `</div>`;

    html += `<div class="section-divider"></div>`;

    const escapedSolution = lesson.challenge.solution
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    html += `<div class="challenge-section"><h3>challenge</h3>`;
    html += `<p class="challenge-desc">${lesson.challenge.desc}</p>`;
    html += `<textarea class="code-editor" id="editor-${id}" placeholder="# write your code here...">${escapedSolution.split('\n')[0]}</textarea>`;
    html += `<div class="editor-actions">`;
    html += `<button class="run-btn run-code-btn" onclick="runCode('${id}')">run code</button>`;
    html += `<button class="run-btn" onclick="showHint('${id}')">hint</button>`;
    html += `<button class="run-btn" onclick="showSolution('${id}')">show solution</button>`;
    html += `<span class="quiz-feedback" id="challengeFeedback-${id}"></span>`;
    html += `</div>`;
    html += `<div class="output-box" id="output-${id}"></div>`;
    html += `<button class="complete-btn ${isComplete(id) ? 'done' : ''}" id="completeBtn-${id}" onclick="completeLesson('${id}')">${isComplete(id) ? 'completed ✓' : 'mark as complete'}</button>`;
    html += `</div>`;

    content.innerHTML = html;
    renderSidebar();
    setupEditor(id);
}

function selectQuiz(lessonId, qi, oi) {
    const state = quizStates[lessonId];
    if (state.submitted) return;
    state.answers[qi] = oi;

    const question = document.querySelectorAll(`.quiz-question`)[qi];
    const options = question.querySelectorAll('.quiz-option');
    options.forEach((opt, i) => {
        opt.className = 'quiz-option' + (i === oi ? ' selected' : '');
    });
}

function submitQuiz(lessonId) {
    const state = quizStates[lessonId];
    if (state.submitted) return;
    const lesson = LESSONS.find(l => l.id === lessonId);

    let correct = 0;
    lesson.quiz.forEach((q, qi) => {
        if (state.answers[qi] === q.answer) correct++;
    });

    state.submitted = true;
    loadLesson(lessonId);

    const fb = document.getElementById(`quizFeedback-${lessonId}`);
    if (fb) {
        if (correct === lesson.quiz.length) {
            fb.textContent = 'all correct!';
            fb.className = 'quiz-feedback correct';
        } else {
            fb.textContent = `${correct}/${lesson.quiz.length} correct`;
            fb.className = 'quiz-feedback wrong';
        }
    }
}

function showHint(lessonId) {
    const lesson = LESSONS.find(l => l.id === lessonId);
    const fb = document.getElementById(`challengeFeedback-${lessonId}`);
    if (fb) {
        fb.textContent = 'hint: ' + lesson.challenge.hint;
        fb.className = 'quiz-feedback';
    }
}

function showSolution(lessonId) {
    const lesson = LESSONS.find(l => l.id === lessonId);
    const editor = document.getElementById(`editor-${lessonId}`);
    if (editor) {
        editor.value = lesson.challenge.solution;
    }
    const output = document.getElementById(`output-${lessonId}`);
    if (output) {
        output.className = 'output-box success';
        output.textContent = '# solution loaded above. try to understand it!';
    }
}

function completeLesson(lessonId) {
    markComplete(lessonId);
    loadLesson(lessonId);
    renderSidebar();
}
