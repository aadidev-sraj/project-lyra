// Authentication Form Logic
document.addEventListener('DOMContentLoaded', () => {
    const authTabs = document.querySelectorAll('.auth-tab');
    const authForms = document.querySelectorAll('.auth-form');
    
    // Tab switching functionality
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            
            // Remove active class from all tabs and forms
            authTabs.forEach(t => t.classList.remove('active'));
            authForms.forEach(f => f.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding form
            tab.classList.add('active');
            document.getElementById(`${targetTab}-form`).classList.add('active');
        });
    });
    
    // Form validation and submission
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleLogin();
        });
    }
    
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleSignup();
        });
    }
});

function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // Basic validation
    if (!email || !password) {
        showTerminalMessage('ERROR: All fields required', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showTerminalMessage('ERROR: Invalid email format', 'error');
        return;
    }
    
    // Simulate login process
    showTerminalMessage('INITIALIZING CONNECTION...', 'info');
    
    setTimeout(() => {
        showTerminalMessage('ACCESS GRANTED', 'success');
        setTimeout(() => {
            window.location.href = 'challenges.html';
        }, 1500);
    }, 2000);
}

function handleSignup() {
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm').value;
    
    // Basic validation
    if (!username || !email || !password || !confirmPassword) {
        showTerminalMessage('ERROR: All fields required', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showTerminalMessage('ERROR: Invalid email format', 'error');
        return;
    }
    
    if (password.length < 6) {
        showTerminalMessage('ERROR: Password must be at least 6 characters', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showTerminalMessage('ERROR: Passwords do not match', 'error');
        return;
    }
    
    if (username.length < 3) {
        showTerminalMessage('ERROR: Username must be at least 3 characters', 'error');
        return;
    }
    
    // Simulate signup process
    showTerminalMessage('ESTABLISHING PROFILE...', 'info');
    
    setTimeout(() => {
        showTerminalMessage('PROFILE CREATED SUCCESSFULLY', 'success');
        setTimeout(() => {
            // Switch to login tab
            document.querySelector('[data-tab="login"]').click();
            showTerminalMessage('Please login with your new credentials', 'info');
        }, 1500);
    }, 2000);
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showTerminalMessage(message, type = 'info') {
    // Remove existing messages
    const existingMessage = document.querySelector('.terminal-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `terminal-message ${type}`;
    messageElement.textContent = message;
    
    // Style the message
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
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(messageElement);
    
    // Auto remove after 3 seconds
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

// Add terminal-style input effects
document.addEventListener('DOMContentLoaded', () => {
    const inputs = document.querySelectorAll('input');
    
    inputs.forEach(input => {
        // Add focus effects
        input.addEventListener('focus', () => {
            input.style.borderColor = '#00ff00';
            input.style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.5)';
        });
        
        input.addEventListener('blur', () => {
            input.style.borderColor = '#00ff00';
            input.style.boxShadow = 'none';
        });
        
        // Add typing effects
        input.addEventListener('input', () => {
            input.style.textShadow = '0 0 5px #00ff00';
            setTimeout(() => {
                input.style.textShadow = 'none';
            }, 100);
        });
    });
});