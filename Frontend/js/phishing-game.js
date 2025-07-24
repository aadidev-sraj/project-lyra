// Game State Management
let currentLevel = 0;
let gameProgress = {
    level1: false,
    level2: false,
    level3: false,
    level4: false,
    level5: false,
    level6: false,
    level7: false,
    level8: false
};

// Game Statistics
let gameStats = {
    threatsNeutralized: 0,
    correctAnswers: 0,
    totalQuestions: 0
};

// Initialize game when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    initializeMatrix();
    setupDragAndDrop();
    setupHookDetection();
    initializeQuiz();
});

// Start the game
function startGame() {
    showLevel(1);
}

// Show specific level
function showLevel(levelNum) {
    // Hide all screens
    document.querySelectorAll('.game-screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show target level
    const targetScreen = document.getElementById(levelNum === 0 ? 'welcome-screen' : 
                                               levelNum === 9 ? 'end-screen' : 
                                               `level-${levelNum}`);
    if (targetScreen) {
        targetScreen.classList.add('active');
        currentLevel = levelNum;
    }
}

// Level 1: Phish or Legit
function makeChoice(level, choice) {
    const feedback = document.getElementById(`level-${level}-feedback`);
    feedback.classList.remove('hidden');
    
    if (level === 1) {
        if (choice === 'phish') {
            feedback.className = 'feedback success';
            feedback.innerHTML = `
                <h3>✅ CORRECT!</h3>
                <p>This is indeed a phishing email. Red flags include:</p>
                <ul style="text-align: left; margin: 1rem 0;">
                    <li>Suspicious sender domain (paypaI.com with capital 'I' instead of 'l')</li>
                    <li>Urgent language creating pressure</li>
                    <li>Generic greeting "Dear Valued Customer"</li>
                    <li>Threat of account suspension</li>
                </ul>
                <button class="game-btn" onclick="completeLevel(1)">PROCEED TO NEXT LEVEL</button>
            `;
            gameStats.correctAnswers++;
            gameStats.threatsNeutralized++;
        } else {
            feedback.className = 'feedback error';
            feedback.innerHTML = `
                <h3>❌ INCORRECT</h3>
                <p>This was actually a phishing email. Look more carefully at the sender domain and urgent language.</p>
                <button class="game-btn" onclick="completeLevel(1)">CONTINUE ANYWAY</button>
            `;
        }
        gameStats.totalQuestions++;
    }
}

// Level 2: Detective Choice
function detectiveChoice(question, choice) {
    const feedback = document.getElementById('level-2-feedback');
    feedback.classList.remove('hidden');
    
    if (choice === 'B') {
        feedback.className = 'feedback success';
        feedback.innerHTML = `
            <h3>✅ EXCELLENT CHOICE!</h3>
            <p>Isolating the computer and documenting the incident is the correct first step. This prevents potential malware spread while preserving evidence for investigation.</p>
            <button class="game-btn" onclick="completeLevel(2)">ADVANCE TO NEXT MISSION</button>
        `;
        gameStats.correctAnswers++;
        gameStats.threatsNeutralized++;
    } else {
        feedback.className = 'feedback error';
        feedback.innerHTML = `
            <h3>❌ SUBOPTIMAL RESPONSE</h3>
            <p>The best practice is to isolate the computer from the network first to prevent malware spread, then document everything for investigation.</p>
            <button class="game-btn" onclick="completeLevel(2)">CONTINUE TRAINING</button>
        `;
    }
    gameStats.totalQuestions++;
}

// Level 3: Drag and Drop Setup
function setupDragAndDrop() {
    const emailItems = document.querySelectorAll('.email-item');
    const dropZones = document.querySelectorAll('.drop-zone');
    
    emailItems.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
    });
    
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', handleDragOver);
        zone.addEventListener('drop', handleDrop);
        zone.addEventListener('dragenter', handleDragEnter);
        zone.addEventListener('dragleave', handleDragLeave);
    });
}

function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.id);
    e.dataTransfer.setData('email-type', e.target.dataset.type);
    e.target.classList.add('dragging');
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDragEnter(e) {
    e.preventDefault();
    e.target.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.target.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.target.classList.remove('drag-over');
    
    const emailId = e.dataTransfer.getData('text/plain');
    const emailType = e.dataTransfer.getData('email-type');
    const zone = e.target.dataset.zone;
    
    const emailElement = document.querySelector(`[data-id="${emailId}"]`);
    if (emailElement) {
        e.target.appendChild(emailElement);
        emailElement.style.margin = '0.5rem';
        emailElement.style.opacity = '0.8';
        
        // Show check button when all emails are sorted
        checkIfAllEmailsSorted();
    }
}

function checkIfAllEmailsSorted() {
    const emailQueue = document.querySelector('.email-queue');
    if (emailQueue.children.length === 0) {
        document.getElementById('level-3-check').classList.remove('hidden');
    }
}

function checkInboxSorting() {
    const safeZone = document.querySelector('.safe-zone');
    const quarantineZone = document.querySelector('.quarantine-zone');
    
    let correct = 0;
    let total = 0;
    
    // Check safe zone
    safeZone.querySelectorAll('.email-item').forEach(email => {
        total++;
        if (email.dataset.type === 'safe') {
            correct++;
            gameStats.threatsNeutralized++;
        }
    });
    
    // Check quarantine zone
    quarantineZone.querySelectorAll('.email-item').forEach(email => {
        total++;
        if (email.dataset.type === 'phish') {
            correct++;
            gameStats.threatsNeutralized++;
        }
    });
    
    const feedback = document.getElementById('level-3-feedback');
    feedback.classList.remove('hidden');
    
    if (correct === total) {
        feedback.className = 'feedback success';
        feedback.innerHTML = `
            <h3>🎯 PERFECT SORTING!</h3>
            <p>You correctly identified all phishing emails and legitimate messages. Your inbox is secure!</p>
            <button class="game-btn" onclick="completeLevel(3)">CONTINUE TO NEXT CHALLENGE</button>
        `;
        gameStats.correctAnswers++;
    } else {
        feedback.className = 'feedback error';
        feedback.innerHTML = `
            <h3>⚠️ PARTIAL SUCCESS</h3>
            <p>You sorted ${correct}/${total} emails correctly. Review the suspicious elements in phishing emails.</p>
            <button class="game-btn" onclick="completeLevel(3)">PROCEED WITH CAUTION</button>
        `;
    }
    gameStats.totalQuestions++;
}

// Level 4: Hook Detection Setup
function setupHookDetection() {
    const hooks = document.querySelectorAll('[data-hook]');
    let foundHooks = 0;
    
    hooks.forEach(hook => {
        hook.addEventListener('click', () => {
            if (!hook.classList.contains('found')) {
                hook.classList.add('found');
                foundHooks++;
                updateHookCounter(foundHooks);
                
                if (foundHooks === hooks.length) {
                    setTimeout(() => completeHookDetection(), 500);
                }
            }
        });
    });
}

function updateHookCounter(count) {
    document.getElementById('hooks-count').textContent = count;
}

function completeHookDetection() {
    const feedback = document.getElementById('level-4-feedback');
    feedback.classList.remove('hidden');
    feedback.className = 'feedback success';
    feedback.innerHTML = `
        <h3>🔍 ALL HOOKS DETECTED!</h3>
        <p>You successfully identified all suspicious elements:</p>
        <ul style="text-align: left; margin: 1rem 0;">
            <li>Suspicious URL with typosquatting</li>
            <li>Urgent call-to-action button</li>
            <li>Threatening urgency message</li>
            <li>Suspicious contact email domain</li>
        </ul>
        <button class="game-btn" onclick="completeLevel(4)">ADVANCE TO CORPORATE CHALLENGE</button>
    `;
    gameStats.correctAnswers++;
    gameStats.threatsNeutralized += 4;
    gameStats.totalQuestions++;
}

// Level 5: Corporate Challenge
function corporateChoice(choice) {
    const feedback = document.getElementById('level-5-feedback');
    feedback.classList.remove('hidden');
    
    if (choice === 'D') {
        feedback.className = 'feedback success';
        feedback.innerHTML = `
            <h3>🏆 EXEMPLARY SECURITY PROTOCOL!</h3>
            <p>Perfect! You chose to verify through multiple channels. This is a classic CEO fraud/Business Email Compromise (BEC) attack. Always verify unusual financial requests through multiple communication channels.</p>
            <button class="game-btn" onclick="completeLevel(5)">PROCEED TO IQ TEST</button>
        `;
        gameStats.correctAnswers++;
        gameStats.threatsNeutralized++;
    } else if (choice === 'B' || choice === 'C') {
        feedback.className = 'feedback info';
        feedback.innerHTML = `
            <h3>✅ GOOD SECURITY THINKING!</h3>
            <p>Your choice shows good security awareness, but the best practice is to verify through multiple channels (both calling the CEO and involving IT security).</p>
            <button class="game-btn" onclick="completeLevel(5)">CONTINUE TO IQ TEST</button>
        `;
        gameStats.correctAnswers++;
        gameStats.threatsNeutralized++;
    } else {
        feedback.className = 'feedback error';
        feedback.innerHTML = `
            <h3>🚨 CRITICAL SECURITY FAILURE!</h3>
            <p>This would result in a successful BEC attack! Never process unusual financial requests without verification through multiple channels.</p>
            <button class="game-btn" onclick="completeLevel(5)">LEARN FROM MISTAKES</button>
        `;
    }
    gameStats.totalQuestions++;
}

// Level 6: Quiz System
let quizData = [
    {
        question: "What is the most common type of phishing attack?",
        options: [
            "A) Spear phishing targeting specific individuals",
            "B) Mass email phishing campaigns", 
            "C) SMS phishing (smishing)",
            "D) Voice phishing (vishing)"
        ],
        correct: "B",
        explanation: "Mass email phishing campaigns are the most common, casting a wide net to catch as many victims as possible."
    },
    {
        question: "Which of these is NOT a red flag in a phishing email?",
        options: [
            "A) Generic greetings like 'Dear Customer'",
            "B) Urgent language creating time pressure",
            "C) Personalized content with your real name",
            "D) Suspicious sender email domains"
        ],
        correct: "C",
        explanation: "Personalized content actually makes phishing more dangerous (spear phishing), but it's not a red flag - it's a sign of a more sophisticated attack."
    },
    {
        question: "What should you do if you accidentally click a phishing link?",
        options: [
            "A) Immediately close the browser and hope for the best",
            "B) Disconnect from internet, scan for malware, change passwords, report incident",
            "C) Continue browsing normally",
            "D) Only change your email password"
        ],
        correct: "B",
        explanation: "A comprehensive response includes isolation, scanning, credential changes, and incident reporting."
    },
    {
        question: "Which URL is most likely to be a phishing site?",
        options: [
            "A) https://www.paypal.com/signin",
            "B) https://paypal-security.com/verify",
            "C) https://www.paypal.com/security",
            "D) https://help.paypal.com"
        ],
        correct: "B",
        explanation: "The domain 'paypal-security.com' is not owned by PayPal. Legitimate PayPal URLs use the paypal.com domain."
    },
    {
        question: "What is 'whaling' in cybersecurity?",
        options: [
            "A) A type of malware that spreads quickly",
            "B) Phishing attacks targeting high-profile executives",
            "C) A method of data encryption",
            "D) A network security protocol"
        ],
        correct: "B",
        explanation: "Whaling specifically targets high-value individuals like CEOs and executives, often for business email compromise attacks."
    }
];

let currentQuizQuestion = 0;
let quizScore = 0;

function initializeQuiz() {
    // Quiz will be initialized when level 6 is reached
}

function displayQuizQuestion() {
    if (currentQuizQuestion < quizData.length) {
        const question = quizData[currentQuizQuestion];
        const questionContainer = document.getElementById('quiz-question');
        
        questionContainer.innerHTML = `
            <h3>${question.question}</h3>
            <div class="quiz-options">
                ${question.options.map(option => 
                    `<button class="quiz-option" onclick="answerQuiz('${option.charAt(0)}')">${option}</button>`
                ).join('')}
            </div>
        `;
        
        document.getElementById('current-question').textContent = currentQuizQuestion + 1;
        document.getElementById('total-questions').textContent = quizData.length;
    }
}

function answerQuiz(answer) {
    const question = quizData[currentQuizQuestion];
    const feedback = document.getElementById('quiz-feedback');
    const options = document.querySelectorAll('.quiz-option');
    
    // Disable all options
    options.forEach(option => option.disabled = true);
    
    // Mark correct and incorrect answers
    options.forEach(option => {
        const optionLetter = option.textContent.charAt(0);
        if (optionLetter === question.correct) {
            option.classList.add('correct');
        } else if (optionLetter === answer && answer !== question.correct) {
            option.classList.add('incorrect');
        }
    });
    
    // Show feedback
    feedback.classList.remove('hidden');
    if (answer === question.correct) {
        quizScore++;
        gameStats.correctAnswers++;
        gameStats.threatsNeutralized++;
        feedback.className = 'quiz-feedback success';
        feedback.innerHTML = `<h4>✅ Correct!</h4><p>${question.explanation}</p>`;
    } else {
        feedback.className = 'quiz-feedback error';
        feedback.innerHTML = `<h4>❌ Incorrect</h4><p>The correct answer is ${question.correct}. ${question.explanation}</p>`;
    }
    
    // Update score display
    document.getElementById('quiz-score-value').textContent = quizScore;
    gameStats.totalQuestions++;
    
    // Move to next question after delay
    setTimeout(() => {
        currentQuizQuestion++;
        if (currentQuizQuestion < quizData.length) {
            feedback.classList.add('hidden');
            displayQuizQuestion();
        } else {
            // Quiz completed
            setTimeout(() => completeQuiz(), 1000);
        }
    }, 3000);
}

function completeQuiz() {
    const feedback = document.getElementById('quiz-feedback');
    feedback.classList.remove('hidden');
    feedback.className = 'quiz-feedback success';
    
    const percentage = Math.round((quizScore / quizData.length) * 100);
    let rating = '';
    if (percentage >= 80) rating = 'EXPERT';
    else if (percentage >= 60) rating = 'PROFICIENT';
    else if (percentage >= 40) rating = 'NOVICE';
    else rating = 'NEEDS TRAINING';
    
    feedback.innerHTML = `
        <h3>🧠 PHISHING IQ TEST COMPLETE!</h3>
        <p>Final Score: ${quizScore}/${quizData.length} (${percentage}%)</p>
        <p>Security Rating: <strong>${rating}</strong></p>
        <button class="game-btn" onclick="completeLevel(6)">ADVANCE TO URL HUNTER</button>
    `;
}

// Level 7: URL Classification
let urlsClassified = 0;
let urlsCorrect = 0;

function classifyUrl(button, classification) {
    const urlItem = button.closest('.url-item');
    const isSafe = urlItem.dataset.safe === 'true';
    const isCorrect = (classification === 'safe' && isSafe) || (classification === 'malicious' && !isSafe);
    
    // Disable buttons for this URL
    const buttons = urlItem.querySelectorAll('.url-btn');
    buttons.forEach(btn => btn.disabled = true);
    
    // Mark selected button
    button.classList.add('selected');
    
    // Update counters
    urlsClassified++;
    if (isCorrect) {
        urlsCorrect++;
        gameStats.correctAnswers++;
        gameStats.threatsNeutralized++;
    }
    gameStats.totalQuestions++;
    
    // Update display
    document.getElementById('urls-classified').textContent = urlsClassified;
    document.getElementById('urls-correct').textContent = urlsCorrect;
    
    // Check if all URLs classified
    if (urlsClassified === 5) {
        setTimeout(() => completeUrlHunter(), 1000);
    }
}

function completeUrlHunter() {
    const feedback = document.getElementById('level-7-feedback');
    feedback.classList.remove('hidden');
    
    const percentage = Math.round((urlsCorrect / 5) * 100);
    
    if (percentage >= 80) {
        feedback.className = 'feedback success';
        feedback.innerHTML = `
            <h3>🎯 URL EXPERT!</h3>
            <p>Excellent work! You correctly identified ${urlsCorrect}/5 URLs (${percentage}%).</p>
            <p>You can spot malicious domains, typosquatting, and suspicious TLDs.</p>
            <button class="game-btn" onclick="completeLevel(7)">FINAL CHALLENGE AWAITS</button>
        `;
    } else {
        feedback.className = 'feedback info';
        feedback.innerHTML = `
            <h3>🔍 GOOD EFFORT!</h3>
            <p>You identified ${urlsCorrect}/5 URLs correctly (${percentage}%).</p>
            <p>Remember to check for typosquatting, suspicious TLDs, and domain legitimacy.</p>
            <button class="game-btn" onclick="completeLevel(7)">PROCEED TO FINAL BOSS</button>
        `;
    }
}

// Level 8: Phish Invaders Game
let invadersGame = {
    score: 0,
    lives: 3,
    timeLeft: 60,
    gameActive: false,
    gameInterval: null,
    spawnInterval: null,
    emails: []
};

function startInvaders() {
    // Reset game state
    invadersGame = {
        score: 0,
        lives: 3,
        timeLeft: 60,
        gameActive: true,
        gameInterval: null,
        spawnInterval: null,
        emails: []
    };
    
    // Update UI
    updateInvadersDisplay();
    document.getElementById('start-invaders').classList.add('hidden');
    document.getElementById('pause-invaders').classList.remove('hidden');
    
    // Start game loops
    invadersGame.gameInterval = setInterval(updateInvadersGame, 100);
    invadersGame.spawnInterval = setInterval(spawnPhishEmail, 2000);
}

function pauseInvaders() {
    invadersGame.gameActive = !invadersGame.gameActive;
    const pauseBtn = document.getElementById('pause-invaders');
    pauseBtn.textContent = invadersGame.gameActive ? 'PAUSE' : 'RESUME';
}

function spawnPhishEmail() {
    if (!invadersGame.gameActive) return;
    
    const gameArea = document.getElementById('game-area');
    const email = document.createElement('div');
    email.className = 'phish-email';
    email.textContent = getRandomPhishSubject();
    email.style.left = Math.random() * (gameArea.offsetWidth - 100) + 'px';
    email.style.animationDuration = (Math.random() * 3 + 2) + 's';
    
    email.addEventListener('click', () => interceptEmail(email));
    
    gameArea.appendChild(email);
    invadersGame.emails.push(email);
    
    // Remove email when animation ends
    email.addEventListener('animationend', () => {
        if (email.parentNode) {
            email.remove();
            invadersGame.lives--;
            updateInvadersDisplay();
            
            if (invadersGame.lives <= 0) {
                endInvadersGame();
            }
        }
    });
}

function getRandomPhishSubjects() {
    const subjects = [
        'URGENT: Verify Account',
        'You Won $1,000,000!',
        'Security Alert',
        'Suspended Account',
        'Click Here Now!',
        'Free Gift Card',
        'Tax Refund Available',
        'Bank Security Notice'
    ];
    return subjects[Math.floor(Math.random() * subjects.length)];
}

function getRandomPhishSubject() {
    return getRandomPhishSubjects();
}

function interceptEmail(email) {
    if (!invadersGame.gameActive) return;
    
    email.classList.add('intercepted');
    email.style.pointerEvents = 'none';
    
    invadersGame.score += 10;
    gameStats.threatsNeutralized++;
    updateInvadersDisplay();
    
    setTimeout(() => {
        if (email.parentNode) {
            email.remove();
        }
    }, 300);
}

function updateInvadersGame() {
    if (!invadersGame.gameActive) return;
    
    invadersGame.timeLeft -= 0.1;
    
    if (invadersGame.timeLeft <= 0) {
        endInvadersGame();
    }
    
    updateInvadersDisplay();
}

function updateInvadersDisplay() {
    document.getElementById('invaders-score').textContent = invadersGame.score;
    document.getElementById('invaders-lives').textContent = invadersGame.lives;
    document.getElementById('invaders-time').textContent = Math.ceil(invadersGame.timeLeft);
}

function endInvadersGame() {
    invadersGame.gameActive = false;
    clearInterval(invadersGame.gameInterval);
    clearInterval(invadersGame.spawnInterval);
    
    // Remove all remaining emails
    invadersGame.emails.forEach(email => {
        if (email.parentNode) {
            email.remove();
        }
    });
    
    // Show results
    const feedback = document.getElementById('level-8-feedback');
    feedback.classList.remove('hidden');
    
    if (invadersGame.score >= 100) {
        feedback.className = 'feedback success';
        feedback.innerHTML = `
            <h3>🚀 CYBER DEFENSE CHAMPION!</h3>
            <p>Outstanding performance! Score: ${invadersGame.score}</p>
            <p>You successfully defended against the phishing invasion!</p>
            <button class="game-btn" onclick="completeLevel(8)">COMPLETE TRAINING</button>
        `;
        gameStats.correctAnswers++;
    } else {
        feedback.className = 'feedback info';
        feedback.innerHTML = `
            <h3>🛡️ DEFENSE COMPLETE!</h3>
            <p>Good effort! Final Score: ${invadersGame.score}</p>
            <p>Every intercepted phishing email makes the digital world safer!</p>
            <button class="game-btn" onclick="completeLevel(8)">COMPLETE TRAINING</button>
        `;
    }
    gameStats.totalQuestions++;
    
    // Hide game controls
    document.getElementById('pause-invaders').classList.add('hidden');
}

// Complete level and advance
function completeLevel(levelNum) {
    gameProgress[`level${levelNum}`] = true;
    
    if (levelNum < 8) {
        showLevel(levelNum + 1);
        
        // Initialize specific level content
        if (levelNum + 1 === 6) {
            currentQuizQuestion = 0;
            quizScore = 0;
            displayQuizQuestion();
        }
    } else {
        // Show end screen
        showEndScreen();
    }
}

// Show end screen with final stats
function showEndScreen() {
    // Update final statistics
    document.getElementById('total-threats').textContent = gameStats.threatsNeutralized;
    
    showLevel(9);
}

// Restart game
function restartGame() {
    // Reset all game state
    currentLevel = 0;
    gameProgress = {
        level1: false, level2: false, level3: false, level4: false,
        level5: false, level6: false, level7: false, level8: false
    };
    gameStats = {
        threatsNeutralized: 0,
        correctAnswers: 0,
        totalQuestions: 0
    };
    
    // Reset level-specific states
    currentQuizQuestion = 0;
    quizScore = 0;
    urlsClassified = 0;
    urlsCorrect = 0;
    
    // Reset UI elements
    document.querySelectorAll('.feedback').forEach(feedback => {
        feedback.classList.add('hidden');
    });
    
    document.querySelectorAll('.quiz-option').forEach(option => {
        option.disabled = false;
        option.classList.remove('correct', 'incorrect');
    });
    
    document.querySelectorAll('.url-btn').forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('selected');
    });
    
    // Reset drag and drop
    const emailQueue = document.querySelector('.email-queue');
    const dropZones = document.querySelectorAll('.drop-zone');
    
    dropZones.forEach(zone => {
        const emails = zone.querySelectorAll('.email-item');
        emails.forEach(email => {
            emailQueue.appendChild(email);
            email.style.margin = '';
            email.style.opacity = '';
        });
    });
    
    document.getElementById('level-3-check').classList.add('hidden');
    
    // Reset hook detection
    document.querySelectorAll('[data-hook]').forEach(hook => {
        hook.classList.remove('found');
    });
    updateHookCounter(0);
    
    // Show welcome screen
    showLevel(0);
}

// Return to main menu
function returnToMenu() {
    window.location.href = 'challenges.html';
}

// Initialize Matrix background (reuse from main site)
function initializeMatrix() {
    // Matrix background is handled by matrix.js
    if (typeof MatrixRain !== 'undefined') {
        new MatrixRain();
    }
}

// Utility function to show terminal messages
function showTerminalMessage(message, type = 'info') {
    const existingMessage = document.querySelector('.terminal-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const messageElement = document.createElement('div');
    messageElement.className = `terminal-message ${type}`;
    messageElement.textContent = message;
    
    messageElement.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.9);
        border: 2px solid ${getMessageColor(type)};
        color: ${getMessageColor(type)};
        padding: 1rem 2rem;
        border-radius: 5px;
        font-family: 'Courier New', monospace;
        font-size: 0.9rem;
        z-index: 10000;
        box-shadow: 0 0 20px ${getMessageColor(type)}40;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(messageElement);
    
    setTimeout(() => {
        messageElement.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.remove();
            }
        }, 300);
    }, 3000);
}

function getMessageColor(type) {
    switch (type) {
        case 'error': return '#ff0000';
        case 'success': return '#00ff00';
        case 'info': return '#00aaff';
        default: return '#00ff00';
    }
}