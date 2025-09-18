// Challenges Page Logic
document.addEventListener('DOMContentLoaded', () => {
    initializeChallenges();
    addChallengeInteractions();
});

function initializeChallenges() {
    const challengeNodes = document.querySelectorAll('.challenge-node');
    
    challengeNodes.forEach((node, index) => {
        // Add entrance animation with delay
        node.style.opacity = '0';
        node.style.transform = 'translateX(-50px)';
        
        setTimeout(() => {
            node.style.transition = 'all 0.5s ease';
            node.style.opacity = '1';
            node.style.transform = 'translateX(0)';
        }, index * 200);
    });
}

function addChallengeInteractions() {
    const challengeNodes = document.querySelectorAll('.challenge-node');
    
    challengeNodes.forEach(node => {
        const startBtn = node.querySelector('.start-btn');
        const isLocked = node.classList.contains('locked');
        
        if (!isLocked && startBtn && !startBtn.classList.contains('disabled')) {
            startBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const challengeTitle = node.querySelector('h3').textContent;
                startChallenge(challengeTitle);
            });
        }
        
        // Add hover sound effect simulation
        node.addEventListener('mouseenter', () => {
            if (!isLocked) {
                playHoverEffect(node);
            }
        });
    });
}

function startChallenge(challengeTitle) {
    showTerminalMessage(`INITIALIZING: ${challengeTitle}`, 'info');
    
    // Simulate loading
    setTimeout(() => {
        showTerminalMessage('CHALLENGE ENVIRONMENT READY', 'success');
        setTimeout(() => {
            // In a real app, this would navigate to the challenge
            showTerminalMessage('Challenge simulation - Feature coming soon!', 'info');
        }, 1000);
    }, 2000);
}

function playHoverEffect(node) {
    // Add glowing effect
    node.style.boxShadow = '0 0 30px rgba(0, 255, 0, 0.6)';
    node.style.borderColor = '#00ff00';
    
    // Add subtle scale effect
    node.style.transform = 'scale(1.02) translateX(10px)';
    
    // Reset on mouse leave
    node.addEventListener('mouseleave', () => {
        node.style.boxShadow = '';
        node.style.transform = '';
    }, { once: true });
}

// Progress animation
function animateProgress() {
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
        const targetWidth = progressFill.style.width;
        progressFill.style.width = '0%';
        
        setTimeout(() => {
            progressFill.style.width = targetWidth;
        }, 500);
    }
}

// Initialize progress animation when page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(animateProgress, 1000);
});

// Add terminal message function (reused from auth.js)
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

// Add connection line animation
document.addEventListener('DOMContentLoaded', () => {
    const connectionLines = document.querySelectorAll('.connection-line');
    
    connectionLines.forEach((line, index) => {
        line.style.width = '0';
        setTimeout(() => {
            line.style.transition = 'width 0.5s ease';
            line.style.width = '2rem';
        }, (index + 1) * 800);
    });
});