// Matrix Rain Effect
class MatrixRain {
    constructor() {
        this.canvas = document.getElementById('matrix-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+-=[]{}|;:,.<>?';
        this.fontSize = 14;
        this.columns = 0;
        this.drops = [];
        
        this.init();
        this.animate();
        
        window.addEventListener('resize', () => this.init());
    }
    
    init() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.columns = Math.floor(this.canvas.width / this.fontSize);
        this.drops = Array(this.columns).fill(1);
    }
    
    animate() {
        // Semi-transparent black background for trail effect
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Green text
        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = `${this.fontSize}px Courier New`;
        
        for (let i = 0; i < this.drops.length; i++) {
            const text = this.characters[Math.floor(Math.random() * this.characters.length)];
            const x = i * this.fontSize;
            const y = this.drops[i] * this.fontSize;
            
            this.ctx.fillText(text, x, y);
            
            // Reset drop to top randomly
            if (y > this.canvas.height && Math.random() > 0.975) {
                this.drops[i] = 0;
            }
            
            this.drops[i]++;
        }
        
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize Matrix Rain when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MatrixRain();
});

// Splash Screen Logic
document.addEventListener('DOMContentLoaded', () => {
    const splashScreen = document.getElementById('splash-screen');
    const mainContent = document.getElementById('main-content');
    
    if (splashScreen && mainContent) {
        // Show splash screen
        splashScreen.classList.add('active');
        
        // Hide splash screen and show main content after 5 seconds
        setTimeout(() => {
            splashScreen.classList.remove('active');
            setTimeout(() => {
                mainContent.classList.add('active');
            }, 500);
        }, 5000);
    } else if (mainContent) {
        // If no splash screen, show main content immediately
        mainContent.classList.add('active');
    }
});

// Glitch effect for text elements
function addGlitchEffect() {
    const glitchElements = document.querySelectorAll('.glitch-text');
    
    glitchElements.forEach(element => {
        setInterval(() => {
            if (Math.random() > 0.95) {
                element.style.animation = 'none';
                element.offsetHeight; // Trigger reflow
                element.style.animation = null;
            }
        }, 100);
    });
}

// Initialize glitch effects
document.addEventListener('DOMContentLoaded', addGlitchEffect);

// Terminal cursor blink effect
function initializeCursors() {
    const inputs = document.querySelectorAll('input');
    
    inputs.forEach(input => {
        const cursor = input.parentElement.querySelector('.input-cursor');
        if (cursor) {
            input.addEventListener('focus', () => {
                cursor.style.display = 'block';
            });
            
            input.addEventListener('blur', () => {
                cursor.style.display = 'none';
            });
        }
    });
}

document.addEventListener('DOMContentLoaded', initializeCursors);

// Typing sound effect simulation (visual feedback)
function addTypingEffect() {
    const inputs = document.querySelectorAll('input');
    
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            input.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.8)';
            setTimeout(() => {
                input.style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.5)';
            }, 100);
        });
    });
}

document.addEventListener('DOMContentLoaded', addTypingEffect);