// script.js

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
let testSettings = {
    isActive: false,
    startDate: null,
    endDate: null,
    title: 'Тестування з кібербезпеки'
}; 

// Ініціалізація додатку
async function initializeApp() {    
    loadResults();
    loadQuestions(); // НОВА ФУНКЦІЯ: Завантаження питань з LocalStorage
    loadTestSettings(); 
    populateDepartments(); 
    setupEventListeners();
    checkTestAvailability(); 
    showScreen('introScreen');
    document.getElementById('totalQuestions').textContent = questions.length;
    startTimer(); 
    
    checkInitialAuth();
    
    setTimeout(() => {
        updateTestSettingsDisplay();
    }, 100);
}

//Перевірка авторизації при ініціалізації
function checkInitialAuth() {
    try {
        const savedAuth = localStorage.getItem('adminAuthData');
        if (savedAuth) {
            const authData = JSON.parse(savedAuth);
            const hourAgo = Date.now() - (60 * 60 * 1000);
            
            if (authData.authorized && authData.timestamp > hourAgo) {
                isAdminAuthenticated = true;
            }
        }
    } catch (e) {
        console.log('Помилка перевірки збереженої авторизації:', e);
    }
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

// Завантаження налаштувань тесту
function loadTestSettings() {
    try {
        const savedSettings = localStorage.getItem('testSettings');
        if (savedSettings) {
            testSettings = { ...testSettings, ...JSON.parse(savedSettings) };
        }
    } catch (e) {
        console.error('Помилка завантаження налаштувань тесту:', e);
    }
}

// Збереження налаштувань тесту
function saveTestSettings() {
    try {
        localStorage.setItem('testSettings', JSON.stringify(testSettings));
    } catch (e) {
        console.error('Помилка збереження налаштувань тесту:', e);
    }
}

// Перевірка доступності тесту
function checkTestAvailability() {
    const now = new Date();
    let isAvailable = testSettings.isActive;
    
    if (testSettings.startDate) {
        const startDate = new Date(testSettings.startDate);
        if (now < startDate) {
            isAvailable = false;
        }
    }
    
    if (testSettings.endDate) {
        const endDate = new Date(testSettings.endDate);
        if (now > endDate) {
            isAvailable = false;
        }
    }
    
    const startBtn = document.getElementById('startQuizBtn');
    const messageEl = document.getElementById('testAvailabilityMessage');
    
    if (!isAvailable) {
        startBtn.disabled = true;
        startBtn.textContent = 'Тест недоступний';
        startBtn.style.opacity = '0.6';
        
        let message = '';
        if (!testSettings.isActive) {
            message = 'Тест тимчасово вимкнений адміністратором.';
        } else if (testSettings.startDate && now < new Date(testSettings.startDate)) {
            message = `Тест буде доступний з ${formatDateTime(testSettings.startDate)}`;
        } else if (testSettings.endDate && now > new Date(testSettings.endDate)) {
            message = `Тест завершився ${formatDateTime(testSettings.endDate)}`;
        }
        
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.style.display = 'block';
        }
        
        const timerEl = document.getElementById('testTimer');
        if (timerEl && !testSettings.isActive) {
            timerEl.style.display = 'none';
        }
    } else {
        startBtn.disabled = false;
        startBtn.textContent = 'Почати тестування';
        startBtn.style.opacity = '1';
        
        if (messageEl) {
            messageEl.style.display = 'none';
        }
    }
}

// Форматування дати та часу
function formatDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('uk-UA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Таймер зворотного відліку
function startTimer() {
    const timerEl = document.getElementById('testTimer');
    if (!timerEl) return;
    
    function updateTimer() {
        if (!testSettings.isActive) {
            timerEl.style.display = 'none';
            return;
        }
        
        const now = new Date();
        let targetDate = null;
        let timerText = '';
        
        if (testSettings.startDate && now < new Date(testSettings.startDate)) {
            targetDate = new Date(testSettings.startDate);
            timerText = 'До початку: ';
        } else if (testSettings.endDate && now < new Date(testSettings.endDate)) {
            targetDate = new Date(testSettings.endDate);
            timerText = 'До завершення: ';
        }
        
        if (targetDate) {
            const timeDiff = targetDate - now;
            
            if (timeDiff > 0) {
                const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
                
                timerEl.innerHTML = `
                    <i class="fas fa-clock"></i> ${timerText}
                    <span class="timer-value">${days}д ${hours}г ${minutes}хв ${seconds}с</span>
                `;
                timerEl.style.display = 'block';
            } else {
                checkTestAvailability();
                timerEl.style.display = 'none';
            }
        } else {
            timerEl.style.display = 'none';
        }
    }
    
    updateTimer();
    setInterval(updateTimer, 1000);
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
        showScreen('statsScreen');
        updateStats();
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
            setTimeout(() => {
                updateTestSettingsDisplay();
            }, 50);
        } else {
            showAuthScreen('admin');
        }
    });

    // Авторизація
    document.getElementById('authSubmitBtn').addEventListener('click', authenticateAdmin);
    addEventListener('keydown', (event) => {
        event.preventDefault();
        if (event.key === 'Enter') {
            authenticateAdmin();
        }
    });

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
    document.getElementById('downloadQuestionsBtn').addEventListener('click', downloadQuestionsJSON); // НОВИЙ СЛУХАЧ
    
    // Налаштування тесту
    document.getElementById('toggleTestBtn').addEventListener('click', toggleTestActivity);

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
    window.popupOpenTime = Date.now();
    showScreen('authScreen');
    document.getElementById('authMessage').textContent = '';
    
    checkExistingAuth();
}

// Перевірка існуючої авторизації
function checkExistingAuth() {
    const savedAuth = localStorage.getItem('adminAuthData');
    if (savedAuth) {
        const authData = JSON.parse(savedAuth);
        const hourAgo = Date.now() - (60 * 60 * 1000);
        
        if (authData.authorized && authData.timestamp > hourAgo) {
            isAdminAuthenticated = true;
            
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
                    setTimeout(() => {
                        updateTestSettingsDisplay();
                    }, 50);
                    break;
            }
            return;
        }
    }
}

// Авторизація адміністратора через зовнішній сайт
async function authenticateAdmin() {
    document.getElementById('authMessage').textContent = 'Відкривається вікно авторизації...';
    document.getElementById('authSubmitBtn').disabled = true;

    try {
        const authResult = await openAuthWindow();
        
        if (authResult.success) {
            isAdminAuthenticated = true;
            document.getElementById('authMessage').textContent = '';
            
            localStorage.setItem('adminAuthData', JSON.stringify({
                authorized: true,
                timestamp: Date.now(),
                userData: authResult.userData
            }));

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
                    setTimeout(() => {
                        updateTestSettingsDisplay();
                    }, 50);
                    break;
            }
        } else {
            document.getElementById('authMessage').textContent = 'Помилка авторизації. Спробуйте ще раз.';
        }
    } catch (error) {
        console.error('Помилка авторизації:', error);
        document.getElementById('authMessage').textContent = 'Помилка авторизації. Перевірте підключення до інтернету.';
    } finally {
        document.getElementById('authSubmitBtn').disabled = false;
    }
}

// Функція відкриття popup вікна для авторизації
function openAuthWindow() {
    return new Promise((resolve) => {
        const authUrl = 'https://digital.bukoda.gov.ua/master3581';
        const popup = window.open(
            authUrl, 
            'authWindow',
            'width=800,height=600,scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no'
        );

        let checkInterval;
        let timeout;

        checkInterval = setInterval(() => {
            try {
                if (popup.closed) {
                    clearInterval(checkInterval);
                    clearTimeout(timeout);
                    
                    checkAuthStatus().then(result => {
                        resolve(result);
                    });
                }
                
                const popupUrl = popup.location.href;
                if (popupUrl && popupUrl !== authUrl && !popupUrl.includes('master3581')) {
                    popup.close();
                    clearInterval(checkInterval);
                    clearTimeout(timeout);
                    resolve({ 
                        success: true, 
                        userData: { 
                            authTime: Date.now(),
                            source: 'bukoda_digital' 
                        } 
                    });
                }
            } catch (error) {
                console.log('Помилка при перевірці popup:', error);
            }
        }, 2000);

        timeout = setTimeout(() => {
            clearInterval(checkInterval);
            if (!popup.closed) {
                popup.close();
            }
            resolve({ success: false, error: 'Час очікування авторизації минув' });
        }, 300000); 
    });
}

// Альтернативна функція перевірки статусу авторизації
async function checkAuthStatus() {
    try {
        const response = await fetch('https://digital.bukoda.gov.ua/master3581/api/check-auth', {
            method: 'GET',
            credentials: 'include',
            mode: 'cors'
        });
        
        if (response.ok) {
            const authData = await response.json();
            return { 
                success: true, 
                userData: { 
                    ...authData,
                    authTime: Date.now(),
                    source: 'bukoda_digital' 
                } 
            };
        }
    } catch (error) {
        console.log('API перевірки недоступний, використовуємо fallback логіку');
    }
    
    const popupOpenTime = Date.now() - (window.popupOpenTime || Date.now());
    if (popupOpenTime > 10000) {
        return { 
            success: true, 
            userData: { 
                authTime: Date.now(),
                source: 'bukoda_digital',
                fallback: true
            } 
        };
    }
    
    return { success: false, error: 'Авторизація не підтверджена' };
}

// Функція для скидання авторизації
function logoutAdmin() {
    isAdminAuthenticated = false;
    localStorage.removeItem('adminAuthData');
    showScreen('introScreen');
}


// Початок тесту
function startQuiz() {
    const now = new Date();
    let isAvailable = testSettings.isActive;
    
    if (testSettings.startDate) {
        const startDate = new Date(testSettings.startDate);
        if (now < startDate) {
            isAvailable = false;
        }
    }
    
    if (testSettings.endDate) {
        const endDate = new Date(testSettings.endDate);
        if (now > endDate) {
            isAvailable = false;
        }
    }
    
    if (!isAvailable) {
        if (!testSettings.isActive) {
            alert('Тест наразі деактивований адміністратором.');
        } else if (testSettings.startDate && now < new Date(testSettings.startDate)) {
            alert(`Тест буде доступний з ${formatDateTime(testSettings.startDate)}`);
        } else if (testSettings.endDate && now > new Date(testSettings.endDate)) {
            alert(`Тест завершився ${formatDateTime(testSettings.endDate)}`);
        }
        return;
    }

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

// Управління налаштуваннями тесту
function toggleTestActivity() {
    if (!testSettings.isActive) {
        const title = document.getElementById('testTitle').value.trim();
        const startDate = document.getElementById('testStartDate').value;
        const endDate = document.getElementById('testEndDate').value;
        
        if (!title) {
            alert('Будь ласка, введіть назву тесту!');
            return;
        }
        
        if (!startDate) {
            alert('Будь ласка, вкажіть дату початку тесту!');
            return;
        }
        
        if (!endDate) {
            alert('Будь ласка, вкажіть дату завершення тесту!');
            return;
        }
        
        if (new Date(startDate) >= new Date(endDate)) {
            alert('Дата початку повинна бути раніше дати завершення!');
            return;
        }
        
        const now = new Date();
        if (new Date(startDate) < now) {
            alert('Дата початку повинна бути в майбутньому!');
            return;
        }
        
        testSettings = {
            title: title,
            isActive: true,
            startDate: startDate,
            endDate: endDate
        };
        
        saveTestSettings();
        checkTestAvailability();
        updateTestSettingsDisplay();
        
        alert('Тест успішно активовано! Користувачі зможуть проходити тест згідно з налаштованим розкладом.');
    } else {
        if (confirm('Ви впевнені, що хочете деактивувати тест? Це також очистить всі налаштування.')) {
            testSettings = {
                isActive: false,
                startDate: null,
                endDate: null,
                title: 'Тестування з кібербезпеки'
            };
            
            saveTestSettings();
            checkTestAvailability();
            updateTestSettingsDisplay();
            
            alert('Тест деактивовано і налаштування очищено.');
        }
    }
}

function updateTestSettingsDisplay() {
    const adminScreen = document.getElementById('adminScreen');
    if (!adminScreen) {
        return; 
    }
    
    const titleEl = document.getElementById('testTitle');
    const activeEl = document.getElementById('testActive');
    const startDateEl = document.getElementById('testStartDate');
    const endDateEl = document.getElementById('testEndDate');
    const statusEl = document.getElementById('testStatus');
    const toggleBtn = document.getElementById('toggleTestBtn');
    
    if (titleEl) titleEl.value = testSettings.title || '';
    if (startDateEl) startDateEl.value = testSettings.startDate || '';
    if (endDateEl) endDateEl.value = testSettings.endDate || '';
    
    if (activeEl) {
        activeEl.style.display = 'none';
        activeEl.parentElement.style.display = 'none';
    }
    
    if (statusEl) {
        const now = new Date();
        let status = 'Неактивний';
        let statusClass = 'status-inactive';
        
        if (testSettings.isActive) {
            if (testSettings.startDate && now < new Date(testSettings.startDate)) {
                status = 'Очікування початку';
                statusClass = 'status-pending';
            } else if (testSettings.endDate && now > new Date(testSettings.endDate)) {
                status = 'Завершений';
                statusClass = 'status-expired';
            } else {
                status = 'Активний';
                statusClass = 'status-active';
            }
        }
        
        statusEl.textContent = status;
        statusEl.className = `test-status ${statusClass}`;
    }
    
    if (toggleBtn) {
        if (testSettings.isActive) {
            toggleBtn.innerHTML = '<i class="fas fa-pause"></i> Деактивувати тест';
            toggleBtn.className = 'btn btn-danger';
            toggleBtn.disabled = false;
            toggleBtn.style.opacity = '1';
        } else {
            toggleBtn.innerHTML = '<i class="fas fa-play"></i> Активувати тест';
            toggleBtn.className = 'btn btn-success';
            toggleBtn.disabled = false;
            toggleBtn.style.opacity = '1';
        }
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