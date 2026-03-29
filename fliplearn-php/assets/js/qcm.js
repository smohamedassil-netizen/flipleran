// Moteur de QCM
// Variables globales : questions (array), timerSeconds (int) definis dans la page PHP

let currentIndex = 0;
let answers = {};
let timerInterval = null;
let timeLeft = timerSeconds;

const display = document.getElementById('question-display');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const timerValue = document.getElementById('timer-value');

function showQuestion(index) {
    const q = questions[index];
    const total = questions.length;

    // Mise a jour progress
    progressFill.style.width = ((index / total) * 100) + '%';
    progressText.textContent = 'Question ' + (index + 1) + '/' + total;

    // Afficher la question
    display.innerHTML = `
        <div class="question-card">
            <h2 class="question-text">${escapeHtml(q.texte)}</h2>
            <div class="options-grid">
                <button class="option-btn" data-answer="A" onclick="selectAnswer('A', this)">
                    <span class="option-letter">A</span>
                    <span class="option-text">${escapeHtml(q.option_a)}</span>
                </button>
                <button class="option-btn" data-answer="B" onclick="selectAnswer('B', this)">
                    <span class="option-letter">B</span>
                    <span class="option-text">${escapeHtml(q.option_b)}</span>
                </button>
                <button class="option-btn" data-answer="C" onclick="selectAnswer('C', this)">
                    <span class="option-letter">C</span>
                    <span class="option-text">${escapeHtml(q.option_c)}</span>
                </button>
                <button class="option-btn" data-answer="D" onclick="selectAnswer('D', this)">
                    <span class="option-letter">D</span>
                    <span class="option-text">${escapeHtml(q.option_d)}</span>
                </button>
            </div>
        </div>
    `;

    // Reset et demarrer le timer
    startTimer();
}

function startTimer() {
    timeLeft = timerSeconds;
    timerValue.textContent = timeLeft;
    timerValue.parentElement.classList.remove('timer-danger');

    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(function() {
        timeLeft--;
        timerValue.textContent = timeLeft;

        if (timeLeft <= 5) {
            timerValue.parentElement.classList.add('timer-danger');
        }

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            // Temps ecoule : passer a la suivante sans reponse
            nextQuestion();
        }
    }, 1000);
}

function selectAnswer(letter, btn) {
    // Enregistrer la reponse
    answers[questions[currentIndex].id] = letter;

    // Feedback visuel
    document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    // Passer a la suivante apres un court delai
    clearInterval(timerInterval);
    setTimeout(nextQuestion, 400);
}

function nextQuestion() {
    currentIndex++;
    if (currentIndex < questions.length) {
        showQuestion(currentIndex);
    } else {
        submitQCM();
    }
}

function submitQCM() {
    clearInterval(timerInterval);

    // Remplir le formulaire cache
    const container = document.getElementById('answers-container');
    container.innerHTML = '';

    for (const [questionId, answer] of Object.entries(answers)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'answers[' + questionId + ']';
        input.value = answer;
        container.appendChild(input);
    }

    // Afficher un message de chargement
    display.innerHTML = '<div class="loading"><h2>Calcul du score...</h2></div>';
    progressFill.style.width = '100%';

    // Soumettre
    document.getElementById('qcm-submit-form').submit();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Demarrer le QCM
showQuestion(0);
