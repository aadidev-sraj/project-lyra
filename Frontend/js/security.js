// Security Game Logic

document.addEventListener("DOMContentLoaded", () => {
  // Initialize security game elements
  initializeSecurityGame();
});

function initializeSecurityGame() {
  // Set up security questions
  const securityQuestions = [
    {
      question: "What is the name of your pet?",
      answer: "max",
      clues: [
        { location: "Twitter", content: "Max loves his new toy!" },
        { location: "Instagram", content: "Max enjoying the sunset" },
      ],
    },
    {
      question: "What is your hometown?",
      answer: "lakeview",
      clues: [
        {
          location: "Twitter",
          content: "going back to Lakeview, where it all began",
        },
        { location: "Facebook", content: "Lives in: Lakeview" },
      ],
    },
    {
      question: "What is your favorite color?",
      answer: "blue",
      clues: [
        { location: "Twitter", content: "love the color blue!" },
        { location: "Instagram", content: "Wearing my favorite color" },
      ],
    },
    {
      question: "What is the name of your childhood best friend?",
      answer: "sam",
      clues: [
        { location: "Twitter", content: "my childhood friend Sam" },
        { location: "Facebook", content: "Tagged: Sam Johnson" },
      ],
    },
  ];

  // Store in window object for access from other scripts
  window.securityQuestions = securityQuestions;
}

// Security check for VPN usage
function checkVPNSecurity() {
  if (!gameState.vpnActive) {
    return {
      secure: false,
      message:
        "You must use a VPN to safely browse social media profiles. Your real IP address is currently visible.",
    };
  }
  return {
    secure: true,
    message: "VPN active. Your connection is secure.",
  };
}

// Security check for stealth mode
function checkStealthSecurity() {
  if (!gameState.stealthActive) {
    return {
      secure: false,
      message:
        "Stealth mode is not active. Password recovery attempts will notify the target via SMS.",
    };
  }
  return {
    secure: true,
    message: "Stealth mode active. SMS notifications are being blocked.",
  };
}

// Track game progress
function trackProgress(action) {
  // Could be expanded to track player actions for scoring
  console.log(`Player action: ${action}`);
}

// Validate security measure sequence
function validateSecurityMeasures() {
  const vpnCheck = checkVPNSecurity();
  const stealthCheck = checkStealthSecurity();

  return {
    allSecure: vpnCheck.secure && stealthCheck.secure,
    vpn: vpnCheck,
    stealth: stealthCheck,
  };
}
