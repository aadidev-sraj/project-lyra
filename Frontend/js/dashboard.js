// Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize threat counter
    updateThreatCounter();
    
    // Update threat counter every 20 minutes (1200000 milliseconds)
    setInterval(updateThreatCounter, 1200000);
});

// Function to update threat counter with random number
function updateThreatCounter() {
    const counterElement = document.getElementById('threat-counter');
    if (counterElement) {
        // Generate random number between 150-500
        const randomThreats = Math.floor(Math.random() * (500 - 150 + 1)) + 150;
        
        // Add animation class
        counterElement.style.animation = 'numberUpdate 1s ease-in-out';
        
        // Update the number
        setTimeout(() => {
            counterElement.textContent = randomThreats;
        }, 500);
        
        // Remove animation class after animation completes
        setTimeout(() => {
            counterElement.style.animation = '';
        }, 1000);
    }
}

// Module navigation functions
function enterModule(moduleId) {
    console.log(`Entering module: ${moduleId}`);
    // Add your module navigation logic here
    switch(moduleId) {
        case 'phishing':
            window.location.href = 'phishing-model.html';
            break;
        case 'malware':
            window.location.href = 'malware-module.html';
            break;
        case 'social-engineering':
            // Navigate to social engineering module
            alert('Social Engineering module coming soon!');
            break;
        case 'network-security':
            // Navigate to network security module
            alert('Network Security module coming soon!');
            break;
        default:
            console.log('Module not available yet');
    }
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear any stored user data
        localStorage.removeItem('currentUser');
        // Redirect to login page
        window.location.href = '../../index.html';
    }
}