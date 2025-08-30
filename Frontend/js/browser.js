// Browser simulation logic

// Browser notification function
function showBrowserNotification(message) {
  const notification = document.createElement("div");
  notification.className = "browser-notification";
  notification.textContent = message;
  notification.style.position = "absolute";
  notification.style.bottom = "20px";
  notification.style.left = "50%";
  notification.style.transform = "translateX(-50%)";
  notification.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  notification.style.color = "white";
  notification.style.padding = "10px 20px";
  notification.style.borderRadius = "5px";
  notification.style.zIndex = "1000";

  const browserContent = document.querySelector(".browser-content");
  if (browserContent) {
    browserContent.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }
}

// Function to update browser UI
function updateBrowserUI(url, title) {
  const addressInput = document.getElementById("address-input");
  const titleElement = document.querySelector(".window-title");

  if (addressInput) {
    addressInput.value = url;
  }
  if (titleElement) {
    titleElement.textContent = title + " - Google Chrome";
  }
}

// Function to hide all browser pages
function hideAllBrowserPages() {
  document.querySelectorAll(".browser-page").forEach((page) => {
    page.classList.add("hidden");
  });
}

// Function to ensure Chrome window is visible
function showChromeWindow() {
  const chromeWindow = document.getElementById("chrome-window");
  if (chromeWindow) {
    chromeWindow.style.display = "block";
  }
}

// Function to navigate to a social media page
function navigateToSocialMedia(platform) {
  console.log("Attempting to navigate to", platform);
  console.log("Game state:", window.gameState);

  if (!window.gameState || !window.gameState.vpnActive) {
    console.log("VPN check failed - not active");
    showBrowserNotification(
      "Error: VPN must be activated to access social media sites"
    );
    return;
  }

  hideAllBrowserPages();
  const page = document.getElementById(`${platform}-page`);
  console.log("Target page element:", page);

  if (page) {
    page.classList.remove("hidden");
    let title = platform.charAt(0).toUpperCase() + platform.slice(1);
    let url = `https://${platform}.com/billbaits`;
    console.log("Updating UI with:", { url, title });
    updateBrowserUI(url, title);
    showChromeWindow();
  } else {
    console.log("Page element not found for platform:", platform);
  }
}

// Global navigation functions
function navigateToTwitter() {
  navigateToSocialMedia("twitter");
}

function navigateToFacebook() {
  navigateToSocialMedia("facebook");
}

function navigateToInstagram() {
  navigateToSocialMedia("instagram");
}
// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  // Add clnnick handlers for social media links
  document.addEventListener("click", function (e) {
    console.log("Click detected:", e.target);
    if (e.target.classList.contains("social-link")) {
      console.log("Social link clicked:", e.target.dataset.platform);
      e.preventDefault();
      const platform = e.target.dataset.platform;
      switch (platform) {
        case "twitter":
          console.log("Navigating to Twitter");
          navigateToTwitter();
          break;
        case "facebook":
          console.log("Navigating to Facebook");
          navigateToFacebook();
          break;
        case "instagram":
          console.log("Navigating to Instagram");
          navigateToInstagram();
          break;
      }
    }
  });

  initializeBrowser();

  // Add click handlers for social media links
  document.addEventListener("click", function (e) {
    if (e.target.classList.contains("social-link")) {
      e.preventDefault();
      const platform = e.target.dataset.platform;
      switch (platform) {
        case "twitter":
          navigateToTwitter();
          break;
        case "facebook":
          navigateToFacebook();
          break;
        case "instagram":
          navigateToInstagram();
          break;
      }
    }
  });
});

// Initialize browser functionality
function initializeBrowser() {
  // Set up browser controls
  const backButton = document.querySelector(".browser-back");
  const forwardButton = document.querySelector(".browser-forward");
  const refreshButton = document.querySelector(".browser-refresh");
  const addressInput = document.getElementById("address-input");

  // Browser history
  let browserHistory = ["socialconnect.com/login"];
  let currentHistoryIndex = 0;

  // Back button
  if (backButton) {
    backButton.addEventListener("click", () => {
      if (currentHistoryIndex > 0) {
        currentHistoryIndex--;
        navigateToPage(browserHistory[currentHistoryIndex]);
      }
    });
  }

  // Forward button
  if (forwardButton) {
    forwardButton.addEventListener("click", () => {
      if (currentHistoryIndex < browserHistory.length - 1) {
        currentHistoryIndex++;
        navigateToPage(browserHistory[currentHistoryIndex]);
      }
    });
  }

  // Refresh button
  if (refreshButton) {
    refreshButton.addEventListener("click", () => {
      navigateToPage(browserHistory[currentHistoryIndex]);
    });
  }

  // Set up social media navigation
  setupSocialMediaLinks();

  // Initialize login form
  initializeLoginForm();
}

// Set up navigation between social media platforms
function setupSocialMediaLinks() {
  // Create browser tabs
  const twitterTab = createBrowserTab("Twitter", "twitter");
  const instagramTab = createBrowserTab("Instagram", "instagram");
  const facebookTab = createBrowserTab("Facebook", "facebook");

  const tabsContainer = document.querySelector(".browser-tabs");
  if (tabsContainer) {
    tabsContainer.appendChild(twitterTab);
    tabsContainer.appendChild(instagramTab);
    tabsContainer.appendChild(facebookTab);
  }
}

// Create a browser tab
function createBrowserTab(name, pageName) {
  const tab = document.createElement("div");
  tab.className = "tab";
  tab.dataset.page = pageName;
  tab.innerHTML = `<span>${name}</span>`;

  tab.addEventListener("click", () => {
    // Check if VPN is active before allowing navigation to social media
    if (!gameState.vpnActive) {
      showBrowserNotification(
        "Error: VPN must be activated to access social media sites"
      );
      return;
    }

    // Deactivate all tabs
    document
      .querySelectorAll(".tab")
      .forEach((t) => t.classList.remove("active-tab"));

    // Activate this tab
    tab.classList.add("active-tab");

    // Hide all pages
    document.querySelectorAll(".browser-page").forEach((page) => {
      page.classList.add("hidden");
    });

    // Show corresponding page
    const targetPage = document.getElementById(`${pageName}-page`);
    if (targetPage) {
      targetPage.classList.remove("hidden");
    }

    // Update address bar
    document.getElementById(
      "address-input"
    ).value = `${pageName}.com/profile/target_user`;
  });

  return tab;
}

// Navigate to a specific page
function navigateToPage(url) {
  // Update address bar
  const addressInput = document.getElementById("address-input");
  if (addressInput) {
    addressInput.value = url;
  }

  // Hide all pages
  document.querySelectorAll(".browser-page").forEach((page) => {
    page.classList.add("hidden");
  });

  // Determine which page to show based on URL
  let pageToShow = "login-page";

  if (url.includes("twitter.com")) {
    pageToShow = "twitter-page";
  } else if (url.includes("instagram.com")) {
    pageToShow = "instagram-page";
  } else if (url.includes("facebook.com")) {
    pageToShow = "facebook-page";
  } else if (url.includes("recovery")) {
    pageToShow = "password-recovery-page";
  }

  // Show the page
  const targetPage = document.getElementById(pageToShow);
  if (targetPage) {
    targetPage.classList.remove("hidden");
  }
}

// Initialize login form functionality
function initializeLoginForm() {
  const loginButton = document.getElementById("login-button");
  const forgotPasswordButton = document.getElementById(
    "forgot-password-button"
  );
  const passwordInput = document.getElementById("password-input");

  if (loginButton) {
    loginButton.addEventListener("click", () => {
      // Always show login failure
      document.getElementById("login-message").textContent =
        "Incorrect password. Please try again or use password recovery.";
      passwordInput.value = "";
    });
  }

  if (forgotPasswordButton) {
    forgotPasswordButton.addEventListener("click", () => {
      // Check if stealth mode is active
      if (!gameState.stealthActive) {
        showFailure(
          "You attempted password recovery without activating Stealth Mode. The target received an SMS notification and locked their account."
        );
        return;
      }

      // Show password recovery page
      navigateToPage("socialconnect.com/account-recovery");

      // Generate security questions
      generateSecurityQuestions();
    });
  }
}

// Generate security questions for password recovery
function generateSecurityQuestions() {
  const securityQuestionsContainer =
    document.getElementById("security-questions");
  const questionsData = [
    {
      id: "pet",
      question: "What is the name of your pet?",
      correctAnswer: "max",
    },
    {
      id: "hometown",
      question: "What is your hometown?",
      correctAnswer: "lakeview",
    },
    {
      id: "color",
      question: "What is your favorite color?",
      correctAnswer: "blue",
    },
    {
      id: "friend",
      question: "What is the name of your childhood best friend?",
      correctAnswer: "sam",
    },
  ];

  // Select 3 random questions
  const selectedQuestions = shuffleArray(questionsData).slice(0, 3);

  // Clear previous questions
  securityQuestionsContainer.innerHTML = "";

  // Add questions to the form
  selectedQuestions.forEach((q) => {
    const questionElement = document.createElement("div");
    questionElement.className = "security-question";
    questionElement.innerHTML = `
          <label for="${q.id}">${q.question}</label>
          <input type="text" id="${
            q.id
          }" data-correct="${q.correctAnswer.toLowerCase()}">
      `;
    securityQuestionsContainer.appendChild(questionElement);
  });

  // Add submit button event listener
  const submitButton = document.getElementById("submit-answers-btn");
  if (submitButton) {
    submitButton.addEventListener("click", checkSecurityAnswers);
  }
}

// Check security question answers
function checkSecurityAnswers() {
  const inputs = document.querySelectorAll("#security-questions input");
  const recoveryMessage = document.getElementById("recovery-message");
  let allCorrect = true;

  // Check each answer
  inputs.forEach((input) => {
    const userAnswer = input.value.trim().toLowerCase();
    const correctAnswer = input.dataset.correct;

    if (userAnswer !== correctAnswer) {
      allCorrect = false;
    }
  });

  gameState.attempts++;

  if (allCorrect) {
    recoveryMessage.textContent =
      "Verification successful! Account access granted.";
    recoveryMessage.className = "success-message";

    // Show success after a brief delay
    setTimeout(() => {
      showSuccess();
    }, 2000);
  } else {
    if (gameState.attempts >= gameState.maxAttempts) {
      showFailure(
        "You exceeded the maximum number of allowed password recovery attempts. The account has been locked."
      );
    } else {
      recoveryMessage.textContent = `Incorrect answers. ${
        gameState.maxAttempts - gameState.attempts
      } attempts remaining.`;
      recoveryMessage.className = "error-message";
    }
  }
}

// Shuffle array (Fisher-Yates algorithm)
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}
