// script.js

// Simple SHA-256 hash function for password hashing
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Глобальні змінні
let questions = window.questionsData || [];

// МАСИВ З НАЗВАМИ ПІДРОЗДІЛІВ
const DEPARTMENTS = [
    "Апарат",
    "Департамент комунікацій",
    "Департамент охорони здоров'я",
    "Департамент регіонального розвитку",
    "Департамент освіти і науки",
    "Департамент фінансів",
    "Департамент соціального захисту населення",
    "Департамент капітального будівництва",
    "Управління культури",
    "Управління молоді та спорту",
    "Управління екології та природних ресурсів",
    "Управління агропромислового розвитку",
    "Управління цивільного захисту населення",
    "Юридичне управління",
    "Служба у справах дітей",
    "Державний архів Чернівецької області",
    "Департамент систем життєзабезпечення",
    "Управління з питань ветеранської політики",
    "Управління цифрового розвитку, цифрових трансформацій і цифровізації",
    "Департамент оборонної роботи"
];

let shuffledQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let fullName = '';
let department = '';
let results = [];
let isAdminAuthenticated = false;
let adminPasswordHash = ''; 

// Ініціалізація додатку
async function initializeApp() {
    // Default password: "Rjkj,0rajhtdf!" -> hash it
    const defaultPassword = "1234";
    adminPasswordHash = await sha256(defaultPassword);
    
    loadResults();
    loadQuestions(); // НОВА ФУНКЦІЯ: Завантаження питань з LocalStorage
    populateDepartments(); 
    setupEventListeners();
    showScreen('introScreen');
    document.getElementById('totalQuestions').textContent = questions.length;
}

// НОВА ФУНКЦІЯ: Завантаження питань (пріоритет LocalStorage)
function loadQuestions() {
    try {
        const savedQuestions = localStorage.getItem('quizQuestions');
        if (savedQuestions) {
            // 1. Завантажуємо з локального сховища, якщо там вже були збережені зміни
            questions = JSON.parse(savedQuestions);
        } else if (window.questionsData) {
            // 2. Інакше завантажуємо з questions.json (через window.questionsData)
            questions = window.questionsData;
            saveQuestionsToLocalStorage(); // Зберігаємо першу версію в localStorage
        }
    } catch (e) {
        console.error('Помилка завантаження питань:', e);
        // Якщо помилка, використовуємо питання з questions.json як запасний варіант
        questions = window.questionsData || [];
    }
}

// НОВА ФУНКЦІЯ: Збереження питань в LocalStorage
function saveQuestionsToLocalStorage() {
    try {
        localStorage.setItem('quizQuestions', JSON.stringify(questions));
    } catch (e) {
        console.error('Помилка збереження питань в LocalStorage:', e);
    }
}

// НОВА ФУНКЦІЯ: Завантаження JSON-файлу
function downloadQuestionsJSON() {
    // Форматуємо питання у вигляд, як у файлі questions.json (з обгорткою window.questionsData)
    const questionsJSONContent = `// questions.json\nwindow.questionsData = ${JSON.stringify(questions, null, 4)};`;
    
    const blob = new Blob([questionsJSONContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('Файл questions.json успішно сформовано для завантаження! Збережіть його та замініть оригінальний файл для постійного збереження змін.');
}


// Функція для заповнення випадаючого списку підрозділів
function populateDepartments() {
    const select = document.getElementById('department');
    DEPARTMENTS.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = dept;
        select.appendChild(option);
    });
}

// Налаштування слухачів подій
function setupEventListeners() {
    // Навігація
    document.getElementById('startBtn').addEventListener('click', () => showScreen('introScreen'));
    document.getElementById('statsBtn').addEventListener('click', () => {
        if (isAdminAuthenticated) {
            showScreen('statsScreen');
            updateStats();
        } else {
            showAuthScreen('stats');
        }
    });
    document.getElementById('resultsBtn').addEventListener('click', () => {
        if (isAdminAuthenticated) {
            showScreen('resultsTableScreen');
            updateResultsTable();
        } else {
            showAuthScreen('results');
        }
    });
    document.getElementById('adminBtn').addEventListener('click', () => {
        if (isAdminAuthenticated) {
            showScreen('adminScreen');
            renderQuestionsList();
        } else {
            showAuthScreen('admin');
        }
    });

    // Авторизація
    document.getElementById('authSubmitBtn').addEventListener('click', authenticateAdmin);

    // Початок тесту
    document.getElementById('startQuizBtn').addEventListener('click', startQuiz);

    // Керування тестом
    document.getElementById('prevBtn').addEventListener('click', prevQuestion);
    document.getElementById('nextBtn').addEventListener('click', nextQuestion);
    document.getElementById('submitBtn').addEventListener('click', submitQuiz);

    // Кнопки "Назад"
    document.getElementById('restartBtn').addEventListener('click', () => showScreen('introScreen'));
    document.getElementById('backToMainStats').addEventListener('click', () => showScreen('introScreen'));
    document.getElementById('backToMainResults').addEventListener('click', () => showScreen('introScreen'));
    document.getElementById('backToMainAdmin').addEventListener('click', () => showScreen('introScreen'));

    // Адміністрування
    document.getElementById('addQuestionBtn').addEventListener('click', addQuestionForm);
    document.getElementById('saveQuestionsBtn').addEventListener('click', saveQuestions);
    document.getElementById('changePasswordBtn').addEventListener('click', changePassword);
    document.getElementById('downloadQuestionsBtn').addEventListener('click', downloadQuestionsJSON); // НОВИЙ СЛУХАЧ

    // Фільтрація та сортування результатів
    document.getElementById('filterSurname').addEventListener('input', filterResults);
    document.getElementById('filterDepartment').addEventListener('input', filterResults);
    document.getElementById('sortResults').addEventListener('change', filterResults);
}

// ВИПРАВЛЕНО: Функція показу екрану
function showScreen(screenId) {
    // Приховуємо всі екрани
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    // Показуємо потрібний екран
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }

    // Оновлюємо активну кнопку навігації
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const navBtnMap = {
        'introScreen': 'startBtn',
        'statsScreen': 'statsBtn',
        'resultsTableScreen': 'resultsBtn',
        'adminScreen': 'adminBtn'
    };

    const activeNavBtnId = navBtnMap[screenId];
    if (activeNavBtnId) {
        const activeNavBtn = document.getElementById(activeNavBtnId);
        if (activeNavBtn) {
            activeNavBtn.classList.add('active');
        }
    }
}


// Показ екрану авторизації
function showAuthScreen(targetScreen) {
    window.authTarget = targetScreen;
    showScreen('authScreen');
    document.getElementById('authPassword').value = '';
    document.getElementById('authMessage').textContent = '';
}

// Авторизація адміністратора
async function authenticateAdmin() {
    const password = document.getElementById('authPassword').value;
    if (!password) {
        document.getElementById('authMessage').textContent = 'Будь ласка, введіть пароль!';
        return;
    }

    const passwordHash = await sha256(password);
    if (passwordHash === adminPasswordHash) {
        isAdminAuthenticated = true;
        document.getElementById('authMessage').textContent = '';

        switch (window.authTarget) {
            case 'stats':
                showScreen('statsScreen');
                updateStats();
                break;
            case 'results':
                showScreen('resultsTableScreen');
                updateResultsTable();
                break;
            case 'admin':
                showScreen('adminScreen');
                renderQuestionsList();
                break;
        }
    } else {
        document.getElementById('authMessage').textContent = 'Неправильний пароль!';
    }
}

// Зміна пароля
async function changePassword() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const messageEl = document.getElementById('passwordMessage');

    if (!newPassword || !confirmPassword) {
        messageEl.textContent = 'Будь ласка, заповніть всі поля!';
        messageEl.style.color = '#e74c3c';
        return;
    }

    if (newPassword !== confirmPassword) {
        messageEl.textContent = 'Паролі не співпадають!';
        messageEl.style.color = '#e74c3c';
        return;
    }

    if (newPassword.length < 6) {
        messageEl.textContent = 'Пароль повинен містити мінімум 6 символів!';
        messageEl.style.color = '#e74c3c';
        return;
    }

    adminPasswordHash = await sha256(newPassword);
    messageEl.textContent = 'Пароль успішно змінено!';
    messageEl.style.color = '#27ae60';

    // Clear inputs
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';

    // Auto-hide message after 3 seconds
    setTimeout(() => {
        messageEl.textContent = '';
    }, 3000);
}


// Початок тесту
function startQuiz() {
    fullName = document.getElementById('fullName').value.trim();
    department = document.getElementById('department').value; 
    
    // Перевірка, чи обрано підрозділ
    if (department === "" || department === "Оберіть підрозділ") {
        alert('Будь ласка, оберіть структурний підрозділ!');
        return;
    }
    
    if (!fullName) {
        alert('Будь ласка, заповніть ПІБ!');
        return;
    }

    if (questions.length === 0) {
        alert('На жаль, наразі немає доступних питань для тестування. Зверніться до адміністратора.');
        return;
    }

    shuffledQuestions = shuffleArray([...questions]);
    userAnswers = new Array(shuffledQuestions.length).fill(-1);
    currentQuestionIndex = 0;

    showQuestion();
    showScreen('quizScreen');
}

// Показ питання
function showQuestion() {
    const question = shuffledQuestions[currentQuestionIndex];
    const questionNumber = currentQuestionIndex + 1;
    const totalQuestions = shuffledQuestions.length;

    document.getElementById('questionNumber').textContent = questionNumber;
    document.getElementById('totalQuestions').textContent = totalQuestions;
    document.getElementById('questionText').textContent = question.question;

    const imgElement = document.getElementById('questionImage');
    if (question.image) {
        imgElement.src = question.image;
        imgElement.style.display = 'block';
    } else {
        imgElement.style.display = 'none';
    }

    const answers = question.answers;
    const answersContainer = document.getElementById('answersContainer');
    answersContainer.innerHTML = '';

    answers.forEach((answer, index) => {
        const answerElement = document.createElement('div');
        answerElement.className = 'answer-option';
        answerElement.textContent = answer;
        answerElement.dataset.index = index; 
        answerElement.addEventListener('click', () => selectAnswer(index));

        // Відображення попередньо обраної відповіді
        if (userAnswers[currentQuestionIndex] === index) {
            answerElement.classList.add('selected');
        }

        answersContainer.appendChild(answerElement);
    });

    const progress = (questionNumber / totalQuestions) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;

    document.getElementById('prevBtn').style.display = currentQuestionIndex === 0 ? 'block' : 'block';
    document.getElementById('nextBtn').style.display = currentQuestionIndex === totalQuestions - 1 ? 'none' : 'block';
    document.getElementById('submitBtn').style.display = currentQuestionIndex === totalQuestions - 1 ? 'block' : 'none';
}

// Вибір відповіді
function selectAnswer(selectedIndex) {
    userAnswers[currentQuestionIndex] = selectedIndex;

    document.querySelectorAll('.answer-option').forEach((option) => {
        const optionIndex = parseInt(option.dataset.index);
        option.classList.toggle('selected', optionIndex === selectedIndex);
    });
}

// Попереднє питання
function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        showQuestion();
    }
}

// Наступне питання
function nextQuestion() {
    // Перевірка, чи була обрана відповідь
    if (userAnswers[currentQuestionIndex] === -1) {
         alert('Будь ласка, оберіть відповідь, перш ніж переходити до наступного питання!');
         return;
    }

    if (currentQuestionIndex < shuffledQuestions.length - 1) {
        currentQuestionIndex++;
        showQuestion();
    }
}

// Завершення тесту
function submitQuiz() {
    // Перевірка, чи була обрана відповідь на останнє питання
    if (userAnswers[currentQuestionIndex] === -1) {
         alert('Будь ласка, оберіть відповідь на останнє питання!');
         return;
    }

    let correctCount = 0;
    let incorrectCount = 0;

    shuffledQuestions.forEach((question, index) => {
        if (userAnswers[index] === question.correct) {
            correctCount++;
        } else {
            incorrectCount++;
        }
    });

    const totalCount = shuffledQuestions.length;
    const score = Math.round((correctCount / totalCount) * 100);

    const result = {
        fullName: fullName,
        department: department,
        correct: correctCount,
        incorrect: incorrectCount,
        total: totalCount,
        score: score,
        date: new Date().toISOString()
    };

    results.push(result);
    saveResults();

    document.getElementById('correctCount').textContent = correctCount;
    document.getElementById('incorrectCount').textContent = incorrectCount;
    document.getElementById('totalCount').textContent = totalCount;

    let resultMessage = '';
    if (score >= 80) {
        resultMessage = 'Відмінно! Ви добре розумієте основи кібербезпеки! 🎉';
    } else if (score >= 60) {
        resultMessage = 'Добре! Але є над чим попрацювати. 💪';
    } else {
        resultMessage = 'Потрібно серйозно вивчити основи кібербезпеки! 📚';
    }
    document.getElementById('resultMessage').textContent = resultMessage;

    showScreen('resultsScreen');
}

// Завантаження результатів
function loadResults() {
    try {
        const savedResults = localStorage.getItem('quizResults');
        if (savedResults) {
            results = JSON.parse(savedResults);
        }
    } catch (e) {
        console.error('Помилка завантаження результатів:', e);
    }
}

// Збереження результатів
function saveResults() {
    try {
        localStorage.setItem('quizResults', JSON.stringify(results));
        updateStats();
        updateResultsTable();
    } catch (e) {
        console.error('Помилка збереження результатів:', e);
    }
}

// Оновлення статистики
function updateStats() {
    if (results.length === 0) {
        document.getElementById('totalTests').textContent = '0';
        document.getElementById('averageScore').textContent = '0';
        document.getElementById('departmentStats').innerHTML = '<p style="text-align: center; margin-top: 20px; color: #666;">Немає даних</p>';
        return;
    }

    document.getElementById('totalTests').textContent = results.length;

    const totalScore = results.reduce((sum, result) => sum + result.score, 0);
    const averageScore = Math.round(totalScore / results.length);
    document.getElementById('averageScore').textContent = averageScore;

    const departmentStats = {};
    results.forEach(result => {
        departmentStats[result.department] = (departmentStats[result.department] || 0) + 1;
    });

    let statsHTML = '<div style="margin-top: 30px;"><h3 style="text-align: center; margin-bottom: 20px; color: #2c3e50;"><i class="fas fa-building"></i> За підрозділами:</h3><div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 20px;">';
    Object.entries(departmentStats).forEach(([dept, count]) => {
        statsHTML += `<div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 15px; border-radius: 15px; min-width: 150px; text-align: center; box-shadow: 0 5px 15px rgba(0,0,0,0.2);">
            <div style="font-size: 1.8em; font-weight: bold;">${count}</div>
            <div>${dept}</div>
        </div>`;
    });
    statsHTML += '</div></div>';

    document.getElementById('departmentStats').innerHTML = statsHTML;
}

// Оновлення таблиці результатів
function updateResultsTable() {
    filterResults();
}

// Фільтрація та сортування результатів
function filterResults() {
    const surnameFilter = document.getElementById('filterSurname').value.toLowerCase();
    const departmentFilter = document.getElementById('filterDepartment').value.toLowerCase();
    const sortOption = document.getElementById('sortResults').value;

    let filteredResults = results.filter(result => {
        const matchesSurname = result.fullName.toLowerCase().includes(surnameFilter);
        const matchesDepartment = result.department.toLowerCase().includes(departmentFilter);
        return matchesSurname && matchesDepartment;
    });

    switch (sortOption) {
        case 'score':
            filteredResults.sort((a, b) => b.score - a.score);
            break;
        case 'name':
            filteredResults.sort((a, b) => a.fullName.localeCompare(b.fullName));
            break;
        case 'date':
        default:
            filteredResults.sort((a, b) => new Date(b.date) - new Date(a.date));
            break;
    }

    const tbody = document.getElementById('resultsTableBody');
    tbody.innerHTML = '';

    filteredResults.forEach(result => {
        const row = document.createElement('tr');
        const date = new Date(result.date).toLocaleDateString('uk-UA');
        row.innerHTML = `
            <td>${result.fullName}</td>
            <td>${result.department}</td>
            <td>${result.correct}</td>
            <td>${result.incorrect}</td>
            <td>${result.score}%</td>
            <td>${date}</td>
        `;
        tbody.appendChild(row);
    });
}

// Адміністрування питань
function addQuestionForm() {
    const questionsList = document.getElementById('questionsList');
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-form';
    questionDiv.innerHTML = `
        <div class="form-row">
            <div class="form-col">
                <label>Текст питання:</label>
                <textarea placeholder="Введіть текст питання" rows="3" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;"></textarea>
            </div>
            <div class="form-col">
                <label>URL зображення (необов'язково):</label>
                <input type="text" placeholder="https://example.com/image.jpg" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;">
            </div>
        </div>
        <div style="margin-top: 15px;">
            <label>Варіанти відповідей:</label>
            <div class="answer-row">
                <input type="text" class="answer-input" placeholder="Варіант відповіді 1">
                <input type="checkbox" class="correct-checkbox"> Правильна
            </div>
            <div class="answer-row">
                <input type="text" class="answer-input" placeholder="Варіант відповіді 2">
                <input type="checkbox" class="correct-checkbox">
            </div>
            <div class="answer-row">
                <input type="text" class="answer-input" placeholder="Варіант відповіді 3">
                <input type="checkbox" class="correct-checkbox">
            </div>
            <div class="answer-row">
                <input type="text" class="answer-input" placeholder="Варіант відповіді 4">
                <input type="checkbox" class="correct-checkbox">
            </div>
        </div>
        <button class="btn btn-danger delete-question-btn" style="margin-top: 15px;"><i class="fas fa-trash"></i> Видалити питання</button>
    `;

    questionDiv.querySelector('.delete-question-btn').addEventListener('click', () => {
        questionDiv.remove();
    });

    // Додаємо обробник для чекбоксів (щоб лише один був активним)
    questionDiv.querySelectorAll('.correct-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                questionDiv.querySelectorAll('.correct-checkbox').forEach(otherCheckbox => {
                    if (otherCheckbox !== e.target) {
                        otherCheckbox.checked = false;
                    }
                });
            }
        });
    });

    questionsList.appendChild(questionDiv);
}

function saveQuestions() {
    const questionForms = document.querySelectorAll('.question-form');
    const newQuestions = [];

    for (let form of questionForms) {
        const questionText = form.querySelector('textarea').value;
        const image = form.querySelector('input[type="text"]').value;
        const answerInputs = form.querySelectorAll('.answer-input');
        const correctInputs = form.querySelectorAll('.correct-checkbox');

        const answers = Array.from(answerInputs).map(input => input.value);
        const correctIndex = Array.from(correctInputs).findIndex(checkbox => checkbox.checked);

        // Перевіряємо, чи всі 4 відповіді заповнені
        if (questionText && answers.filter(a => a.trim()).length === 4 && correctIndex !== -1) {
            newQuestions.push({
                question: questionText,
                image: image || '',
                answers: answers,
                correct: correctIndex
            });
        } else {
            alert('Будь ласка, заповніть всі поля для кожного питання, включаючи 4 варіанти відповідей та вибір правильного!');
            return;
        }
    }

    if (newQuestions.length > 0) {
        questions = newQuestions;
        saveQuestionsToLocalStorage(); // ЗБЕРІГАННЯ В LOCAL STORAGE
        
        // Оновлюємо кількість питань на початковому екрані
        document.getElementById('totalQuestions').textContent = questions.length;
        alert('Питання успішно збережено в браузері! Щоб зберегти їх назавжди, скористайтеся кнопкою "Завантажити Questions.json".');
        // Оновлюємо список
        renderQuestionsList();
    }
}

function renderQuestionsList() {
    const questionsList = document.getElementById('questionsList');
    questionsList.innerHTML = '';

    questions.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-form';
        
        // Генеруємо відповіді
        let answersHTML = '';
        for (let i = 0; i < 4; i++) {
            const answerValue = question.answers[i] || '';
            const isCorrect = question.correct === i ? 'checked' : '';
            answersHTML += `
                <div class="answer-row">
                    <input type="text" class="answer-input" placeholder="Варіант відповіді ${i + 1}" value="${answerValue}">
                    <input type="checkbox" class="correct-checkbox" data-index="${i}" ${isCorrect}> ${i === 0 ? 'Правильна' : ''}
                </div>
            `;
        }
        
        questionDiv.innerHTML = `
            <div class="form-row">
                <div class="form-col">
                    <label>Текст питання:</label>
                    <textarea placeholder="Введіть текст питання" rows="3" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;">${question.question}</textarea>
                </div>
                <div class="form-col">
                    <label>URL зображення (необов'язково):</label>
                    <input type="text" placeholder="https://example.com/image.jpg" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;" value="${question.image}">
                </div>
            </div>
            <div style="margin-top: 15px;">
                <label>Варіанти відповідей:</label>
                ${answersHTML}
            </div>
            <button class="btn btn-danger delete-question-btn" style="margin-top: 15px;" data-index="${index}"><i class="fas fa-trash"></i> Видалити питання</button>
        `;

        // Додаємо обробник для видалення
        questionDiv.querySelector('.delete-question-btn').addEventListener('click', (e) => {
            const indexToDelete = parseInt(e.currentTarget.dataset.index);
            questions.splice(indexToDelete, 1);
            renderQuestionsList(); // Перерендеримо список, щоб індекси були правильними
            document.getElementById('totalQuestions').textContent = questions.length;
        });

        // Додаємо обробник для чекбоксів (щоб лише один був активним)
        questionDiv.querySelectorAll('.correct-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    questionDiv.querySelectorAll('.correct-checkbox').forEach(otherCheckbox => {
                        if (otherCheckbox !== e.target) {
                            otherCheckbox.checked = false;
                        }
                    });
                }
            });
        });
        
        questionsList.appendChild(questionDiv);
    });
}

// Допоміжні функції
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// Ініціалізація додатку
initializeApp();