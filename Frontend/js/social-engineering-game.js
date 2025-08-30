// ChatTrap Social Engineering Game
// Created for Project Lyra
// Corrected version by Google Gemini - 2025-08-30

document.addEventListener("DOMContentLoaded", () => {
  // --- ELEMENT SELECTORS ---
  const allScreens = document.querySelectorAll(
    ".game-screen, .feedback-screen"
  );
  const characterCards = document.querySelectorAll(".character-card");
  const startGameBtn = document.getElementById("start-game-btn");
  const sendBtn = document.getElementById("send-btn");
  const messageInput = document.getElementById("message-input");
  const genuineBtn = document.getElementById("genuine-btn");
  const imposterBtn = document.getElementById("imposter-btn");
  const continueBtn = document.getElementById("continue-btn");
  const continueFailedBtn = document.getElementById("continue-failed-btn");
  const retryBtn = document.getElementById("retry-btn");
  const exitDesktopBtn = document.getElementById("exit-desktop-btn");
  const chatAppBtn = document.getElementById("chat-app-btn");
  const emailAppBtn = document.getElementById("email-app-btn");

  // --- GAME DATA ---
  const characters = {
    "it-support": {
      name: "Alex Chen",
      role: "IT Support Specialist",
      icon: "fa-headset",
      isImposter: true,
      dialogue: [
        "Hi there! This is Alex from IT Support. We've detected some unusual login attempts on your account. I need to help you secure your account immediately.",
        "Thank you for confirming. To secure your account, I've just sent a verification link to your company email. Can you please open it and follow the steps?",
        "I understand your hesitation, but this is a critical security alert. The link in the email is the only way to secure your account right now. Please check your inbox.",
      ],
    },
    "hr-rep": {
      name: "Morgan Taylor",
      role: "HR Representative",
      icon: "fa-user-tie",
      isImposter: false,
      dialogue: [
        "Hello! This is Morgan from Human Resources. I'm just finalizing your onboarding file. Is now a good time to quickly confirm a few details?",
        "Great, thanks! I just need to verify your start date and emergency contact information is up to date in the official employee portal. I would never ask for sensitive data like passwords.",
        "Perfect, that's all I needed. Welcome to the team! Let me know if you need anything else.",
      ],
    },
    colleague: {
      name: "Jamie Wilson",
      role: "Software Developer",
      icon: "fa-user",
      isImposter: false,
      dialogue: [
        "Hey there! It's Jamie from the dev team. I'm working on the new project dashboard and need to understand what kind of access permissions your team needs. Got a minute?",
        "Awesome, thanks! So, would your team mostly need 'view-only' access, or would you also need 'edit' rights for tasks?",
        "That's super helpful. I'll configure that and send a link to the beta once it's ready. Thanks again!",
      ],
    },
  };

  const emails = {
    "it-support": {
      subject: "URGENT: Security Alert - Account Verification Required",
      sender: "Alex Chen <alex.chen@techcorp-support.net>",
      content: `
                <div class="email-details" style="padding:15px; border-bottom:1px solid #eee; display:flex; align-items:center;">
                    <div class="sender-avatar" style="width:40px; height:40px; border-radius:50%; background:#ddd; display:flex; align-items:center; justify-content:center; margin-right:15px; font-weight:bold;">AC</div>
                    <div class="email-sender-info">
                        <div class="email-sender" style="font-weight:bold;">Alex Chen <span style="color:red; font-weight:normal;">&lt;alex.chen@techcorp-support.net&gt;</span></div>
                        <div class="email-address" style="color:#666; font-size:12px;">To: newemployee@techcorp.com</div>
                    </div>
                </div>
                <div class="email-body">
                    <p>Dear Employee,</p>
                    <div class="security-alert-box">
                        <div class="security-alert-header"><i class="fas fa-shield-alt"></i> SECURITY ALERT</div>
                        <div class="security-alert-content">
                            <p>Our system has detected multiple <strong>unauthorized access attempts</strong> on your account. Your account security status is: <span style="color: #d93025; font-weight: bold;">AT RISK</span>.</p>
                        </div>
                    </div>
                    <p>To secure your account, please take immediate action by clicking the verification link below:</p>
                    <div style="text-align:center; padding:20px;">
                        <a href="#" class="suspicious-link">VERIFY ACCOUNT NOW</a>
                    </div>
                    <p>After verification, you will be prompted to:</p>
                    <ol>
                        <li>Confirm your current credentials</li>
                        <li>Update your security questions and answers</li>
                        <li>Review recent account activities</li>
                    </ol>
                    <div class="urgency-notice">
                        <strong>Important:</strong> This link will expire in <strong>30 minutes</strong>. Failure to act may result in account suspension.
                    </div>
                    <div class="email-attachment">
                        <i class="fas fa-file-pdf"></i>
                        <div class="email-attachment-info">
                            <div class="email-attachment-name">Security_Protocol_Update.pdf</div>
                            <div class="email-attachment-meta">PDF Document, 1.2 MB</div>
                        </div>
                    </div>
                </div>`,
    },
  };

  const socialEngineeringTactics = {
    "it-support": [
      "Creates a strong sense of urgency ('immediately', 'critical alert').",
      "Pressures user to click a link in an email.",
      "Uses a suspicious, non-standard email domain (techcorp-support.net).",
      "Threatens negative consequences (account suspension).",
      "Includes a suspicious attachment.",
    ],
    "hr-rep": [
      "Does not create urgency; conversation is relaxed.",
      "Explicitly states they would never ask for sensitive data like passwords.",
      "Directs you to the official, known company portal.",
      "Offers to be verified through official channels if asked.",
    ],
    colleague: [
      "Conversation is collaborative, not demanding.",
      "Focuses only on relevant and non-sensitive project information.",
      "Mentions standard company security practices (like Single Sign-On).",
      "Does not pressure you for immediate action.",
    ],
  };

  // --- GAME STATE VARIABLES ---
  let currentCharacterId = null;
  let completedCharacters = [];
  let decisionsCorrect = 0;
  let timerInterval = null;
  let timeRemaining = 60;
  let botMessageCounter = 0;
  let newEmailReceived = false;
  const totalCharacters = Object.keys(characters).length;

  // --- CORE GAME LOGIC ---

  function setActiveScreen(screenId) {
    allScreens.forEach((screen) => {
      screen.classList.remove("active");
      screen.style.display = "";
    });
    const screenToShow = document.getElementById(screenId);
    if (screenToShow) {
      screenToShow.classList.add("active");
      if (screenToShow.classList.contains("feedback-screen")) {
        screenToShow.style.display = "flex";
      }
    }
  }

  function startConversation(characterId) {
    currentCharacterId = characterId;
    botMessageCounter = 0;
    newEmailReceived = false;

    document.body.classList.add("desktop-mode");
    switchDesktopApp("chat");
    setActiveScreen("desktop-screen");

    const character = characters[characterId];
    document.getElementById(
      "chat-avatar"
    ).innerHTML = `<i class="fas ${character.icon}"></i>`;
    document.getElementById("chat-contact-name").textContent = character.name;
    document.getElementById("chat-window").innerHTML = "";
    document.getElementById("email-content").innerHTML = "";

    setTimeout(() => addMessage(character.dialogue[0], "bot"), 1000);
    botMessageCounter++;

    startTimer();
  }

  /************************************************************/
  /* --- UPDATED: Logic to play video on incorrect guess --- */
  /************************************************************/
  function makeDecision(guessedImposter) {
    clearInterval(timerInterval);
    document.getElementById("decision-modal").style.display = "none";

    const character = characters[currentCharacterId];
    const isCorrect = guessedImposter === character.isImposter;

    // If the user guessed "Genuine" (guessedImposter is false)
    // but the character IS an imposter, play the video.
    if (!isCorrect && character.isImposter) {
      playImposterVideo();
      return; // Stop the function here; the video player will handle the failure screen
    }

    // --- For all other cases (correct guess or wrong guess on a genuine person) ---
    if (isCorrect) {
      decisionsCorrect++;
      const successDesc = document.getElementById("success-description");
      successDesc.textContent = `Correct! ${character.name} was ${
        character.isImposter ? "an imposter." : "a genuine colleague."
      }`;

      const tacticsList = document.getElementById("tactics-list");
      const tacticsTitle = document.getElementById("success-tactics-title");
      tacticsList.innerHTML = "";
      tacticsTitle.textContent = character.isImposter
        ? "Red Flags You Spotted:"
        : "Legitimate Behaviors You Recognized:";
      socialEngineeringTactics[currentCharacterId].forEach((tactic) => {
        const li = document.createElement("li");
        li.textContent = tactic;
        tacticsList.appendChild(li);
      });
      setActiveScreen("success-feedback");
    } else {
      // This case handles guessing "imposter" for a genuine character
      showFailureFeedback();
    }
  }

  function continueToNextCharacter() {
    document.body.classList.remove("desktop-mode");
    if (
      currentCharacterId &&
      !completedCharacters.includes(currentCharacterId)
    ) {
      completedCharacters.push(currentCharacterId);
      const card = document.querySelector(
        `.character-card[data-character="${currentCharacterId}"]`
      );
      if (card) {
        card.classList.add("completed");
        card.querySelector(".character-status").textContent = "Completed";
      }
    }
    if (completedCharacters.length >= totalCharacters) {
      showResults();
    } else {
      setActiveScreen("character-select-screen");
    }
  }

  function showResults() {
    document.getElementById(
      "score"
    ).textContent = `${decisionsCorrect}/${totalCharacters}`;
    const percentage = (decisionsCorrect / totalCharacters) * 100;
    document.getElementById("progress-fill").style.width = `${percentage}%`;
    setActiveScreen("results-screen");
  }

  function resetGame() {
    completedCharacters = [];
    decisionsCorrect = 0;
    currentCharacterId = null;
    document.querySelectorAll(".character-card").forEach((card) => {
      card.classList.remove("completed");
      card.querySelector(".character-status").textContent = "New Message";
    });
    setActiveScreen("intro-screen");
  }

  // --- EMAIL, DESKTOP & VIDEO FUNCTIONS ---

  function switchDesktopApp(appId) {
    const chatWindow = document.getElementById("chat-app-window");
    const emailWindow = document.getElementById("email-app-window");
    chatWindow.classList.toggle("minimized", appId !== "chat");
    emailWindow.classList.toggle("minimized", appId !== "email");
    chatAppBtn.classList.toggle("active", appId === "chat");
    emailAppBtn.classList.toggle("active", appId !== "email");

    if (appId === "email" && newEmailReceived) {
      emailAppBtn.classList.remove("new-email-notification");
      showEmail();
    }
  }

  function triggerEmailNotification() {
    if (newEmailReceived) return;
    newEmailReceived = true;
    emailAppBtn.classList.add("new-email-notification");
  }

  function showEmail() {
    const emailData = emails[currentCharacterId];
    if (!emailData) return;
    const emailContent = document.getElementById("email-content");
    emailContent.innerHTML = emailData.content;

    emailContent
      .querySelectorAll(".suspicious-link, .email-attachment")
      .forEach((el) => {
        el.addEventListener("click", (e) => {
          e.preventDefault();
          playImposterVideo();
        });
      });
  }

  function playImposterVideo() {
    if (timerInterval) clearInterval(timerInterval);
    document.body.classList.remove("desktop-mode");

    const videoOverlay = document.createElement("div");
    videoOverlay.style.cssText =
      "position:fixed; top:0; left:0; width:100%; height:100%; background:black; z-index:9999; display:flex; justify-content:center; align-items:center;";

    const video = document.createElement("video");
    video.src = "../../assets/imposter.mp4"; // Ensure this path is correct
    video.style.maxWidth = "100%";
    video.style.maxHeight = "100%";
    video.autoplay = true;
    video.muted = false; // Ensure sound plays

    videoOverlay.appendChild(video);
    document.body.appendChild(videoOverlay);

    // When the video ends, remove it and show the failure screen
    video.onended = () => {
      videoOverlay.remove();
      showFailureFeedback();
    };

    // Fallback if the video fails to play for any reason
    video.onerror = () => {
      console.error("Video failed to load or play.");
      videoOverlay.remove();
      showFailureFeedback();
    };
  }

  function showFailureFeedback() {
    const character = characters[currentCharacterId];
    const failureDesc = document.getElementById("failure-description");
    failureDesc.textContent = `You fell for the trick! ${character.name} was an imposter.`;

    const flagsList = document.getElementById("missed-flags-list");
    const flagsTitle = document.getElementById("failure-tactics-title");
    flagsList.innerHTML = "";
    flagsTitle.textContent = "Red Flags You Missed:";
    socialEngineeringTactics[currentCharacterId].forEach((tactic) => {
      const li = document.createElement("li");
      li.textContent = tactic;
      flagsList.appendChild(li);
    });

    setActiveScreen("failure-feedback");
  }

  // --- UTILITY AND CHAT FUNCTIONS ---

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timeRemaining = 60;
    updateTimerDisplay();
    timerInterval = setInterval(updateTimer, 1000);
  }

  function updateTimer() {
    timeRemaining--;
    updateTimerDisplay();
    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      document.getElementById("decision-modal").style.display = "flex";
    }
  }

  function updateTimerDisplay() {
    const timerElement = document.getElementById("timer");
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    timerElement.textContent = `${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;
    timerElement.classList.toggle("danger", timeRemaining <= 10);
  }

  function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
      addMessage(message, "user");
      messageInput.value = "";
      const typingIndicator = document.createElement("div");
      typingIndicator.className = "typing-indicator";
      typingIndicator.innerHTML = `<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>`;
      document.getElementById("chat-window").appendChild(typingIndicator);
      setTimeout(() => {
        typingIndicator.remove();
        const dialogue = characters[currentCharacterId].dialogue;
        if (botMessageCounter < dialogue.length) {
          const botResponse = dialogue[botMessageCounter];
          addMessage(botResponse, "bot");
          if (botResponse.toLowerCase().includes("sent a verification link")) {
            triggerEmailNotification();
          }
          botMessageCounter++;
        }
      }, 1500 + Math.random() * 500);
    }
  }

  function addMessage(message, sender) {
    const chatWindow = document.getElementById("chat-window");
    const msgElement = document.createElement("div");
    msgElement.classList.add(
      "chat-message",
      sender === "user" ? "user-message" : "bot-message"
    );
    msgElement.textContent = message;
    chatWindow.appendChild(msgElement);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  // --- INITIALIZE EVENT LISTENERS ---
  startGameBtn.addEventListener("click", () =>
    setActiveScreen("character-select-screen")
  );
  sendBtn.addEventListener("click", sendMessage);
  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });
  genuineBtn.addEventListener("click", () => makeDecision(false));
  imposterBtn.addEventListener("click", () => makeDecision(true));
  continueBtn.addEventListener("click", continueToNextCharacter);
  continueFailedBtn.addEventListener("click", continueToNextCharacter);
  retryBtn.addEventListener("click", resetGame);
  exitDesktopBtn.addEventListener("click", () => {
    document.body.classList.remove("desktop-mode");
    setActiveScreen("character-select-screen");
  });
  chatAppBtn.addEventListener("click", () => switchDesktopApp("chat"));
  emailAppBtn.addEventListener("click", () => switchDesktopApp("email"));

  characterCards.forEach((card) => {
    card.addEventListener("click", function () {
      const characterId = this.getAttribute("data-character");
      if (!this.classList.contains("completed")) {
        startConversation(characterId);
      }
    });
  });

  resetGame();
});
