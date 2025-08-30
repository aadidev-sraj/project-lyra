// Applications Logic (VPN, Stealth)

document.addEventListener("DOMContentLoaded", () => {
  initializeVPNApp();
  initializeStealthApp();
  initializeRecycleBin();
});

// Initialize VPN Application
function initializeVPNApp() {
  const vpnConnectButton = document.getElementById("vpn-connect-button");
  const mainStatusText = document.getElementById("vpn-main-status-text");
  const statusDescription = document.getElementById("vpn-status-description");
  const connectionCircle = document.getElementById("connection-circle");
  const pulseRing = document.getElementById("pulse-ring");
  const buttonText = vpnConnectButton
    ? vpnConnectButton.querySelector(".button-text")
    : null;
  const buttonIcon = vpnConnectButton
    ? vpnConnectButton.querySelector(".button-icon")
    : null;

  if (vpnConnectButton) {
    vpnConnectButton.addEventListener("click", () => {
      if (!window.gameState.vpnActive) {
        // Start connecting animation
        vpnConnectButton.classList.add("connecting");
        if (buttonText) buttonText.textContent = "Connecting...";
        if (buttonIcon) buttonIcon.textContent = "⚡";
        if (mainStatusText) mainStatusText.textContent = "Connecting...";
        if (statusDescription)
          statusDescription.textContent = "Establishing secure connection";

        // Simulate connection process
        setTimeout(() => {
          // Connect to VPN
          window.gameState.vpnActive = true;

          if (connectionCircle) {
            connectionCircle.classList.add("connected");
          }
          if (pulseRing) {
            pulseRing.classList.add("active");
          }
          if (mainStatusText) {
            mainStatusText.textContent = "Connected";
          }
          if (statusDescription) {
            statusDescription.textContent = "Your connection is secure";
          }
          if (buttonText) {
            buttonText.textContent = "Disconnect";
          }
          if (buttonIcon) {
            buttonIcon.textContent = "🔒";
          }

          vpnConnectButton.classList.remove("connecting");
          vpnConnectButton.classList.add("disconnect");

          // Unlock social media browsing
          window.gameState.socialMediaUnlocked = true;

          // Show browser notification
          if (window.showBrowserNotification) {
            window.showBrowserNotification(
              "VPN activated. You can now browse social media sites securely."
            );
          }
        }, 1000);
      } else {
        // Start disconnecting animation
        vpnConnectButton.classList.add("disconnecting");
        if (buttonText) buttonText.textContent = "Disconnecting...";
        if (buttonIcon) buttonIcon.textContent = "⚡";
        if (mainStatusText) mainStatusText.textContent = "Disconnecting...";
        if (statusDescription)
          statusDescription.textContent = "Closing secure connection";

        // Simulate disconnection process
        setTimeout(() => {
          // Disconnect from VPN
          window.gameState.vpnActive = false;

          if (connectionCircle) {
            connectionCircle.classList.remove("connected");
          }
          if (pulseRing) {
            pulseRing.classList.remove("active");
          }
          if (mainStatusText) {
            mainStatusText.textContent = "Disconnected";
          }
          if (statusDescription) {
            statusDescription.textContent = "Your connection is not secure";
          }
          if (buttonText) {
            buttonText.textContent = "Connect";
          }
          if (buttonIcon) {
            buttonIcon.textContent = "🔓";
          }

          vpnConnectButton.classList.remove("disconnecting");
          vpnConnectButton.classList.remove("disconnect");

          // Lock social media browsing
          window.gameState.socialMediaUnlocked = false;

          // Show browser notification
          if (window.showBrowserNotification) {
            window.showBrowserNotification(
              "VPN deactivated. Social media access is now blocked for security."
            );
          }
        }, 1000);
      }
    });
  }
}

// Initialize Stealth Application
function initializeStealthApp() {
  const activateButton = document.getElementById("stealth-activate-button");
  const statusIndicator = document.getElementById("stealth-status-indicator");
  const statusText = document.getElementById("stealth-status-text");
  const stealthTimer = document.getElementById("stealth-timer");
  const timerBar = document.getElementById("timer-bar");
  const timerValue = document.getElementById("timer-value");

  if (activateButton) {
    activateButton.addEventListener("click", () => {
      if (
        !gameState.stealthActive &&
        !activateButton.classList.contains("disabled")
      ) {
        // Activate Stealth Mode
        gameState.stealthActive = true;
        statusIndicator.classList.remove("disconnected");
        statusIndicator.classList.add("connected");
        statusText.textContent = "Active";

        // Show timer
        stealthTimer.classList.remove("hidden");

        // Disable button
        activateButton.textContent = "Active";
        activateButton.classList.add("disabled");

        // Start countdown
        gameState.stealthTimeRemaining = 300; // 5 minutes
        updateStealthTimer();

        gameState.stealthInterval = setInterval(() => {
          gameState.stealthTimeRemaining--;
          updateStealthTimer();

          if (gameState.stealthTimeRemaining <= 0) {
            clearInterval(gameState.stealthInterval);
            deactivateStealth();
          }
        }, 1000);

        // Unlock password recovery
        gameState.recoveryUnlocked = true;

        // Show browser notification
        showBrowserNotification(
          "Stealth mode activated. SMS notifications blocked for 5 minutes. You can now attempt password recovery."
        );

        // Enable forgot password button
        document
          .getElementById("forgot-password-button")
          .classList.remove("disabled");
      }
    });
  }

  function updateStealthTimer() {
    const minutes = Math.floor(gameState.stealthTimeRemaining / 60);
    const seconds = gameState.stealthTimeRemaining % 60;
    timerValue.textContent = `${minutes}:${seconds
      .toString()
      .padStart(2, "0")}`;

    // Update progress bar
    const percentage = (gameState.stealthTimeRemaining / 300) * 100;
    timerBar.style.width = `${percentage}%`;

    // Change color based on time remaining
    if (percentage < 20) {
      timerBar.style.backgroundColor = "#ff4136";
    } else if (percentage < 50) {
      timerBar.style.backgroundColor = "#ffdc00";
    }
  }

  function deactivateStealth() {
    gameState.stealthActive = false;
    statusIndicator.classList.remove("connected");
    statusIndicator.classList.add("disconnected");
    statusText.textContent = "Inactive";

    // Hide timer
    stealthTimer.classList.add("hidden");

    // Reset button
    activateButton.textContent = "Activate";
    activateButton.classList.remove("disabled");

    // Lock password recovery
    gameState.recoveryUnlocked = false;

    // Disable forgot password button
    document.getElementById("forgot-password-button").classList.add("disabled");

    // Show notification
    showBrowserNotification(
      "Stealth mode deactivated. SMS notifications are now active again."
    );
  }
}

// Initialize Recycle Bin
function initializeRecycleBin() {
  const recycleItems = document.querySelectorAll(".recycle-item");

  recycleItems.forEach((item) => {
    item.addEventListener("click", () => {
      // Show deleted file notification
      showBrowserNotification("This file cannot be recovered.");
    });
  });
}

// Show browser notification
function showBrowserNotification(message) {
  // Check if browser window is open
  const browserWindow = document.getElementById("chrome-window");
  if (browserWindow && browserWindow.classList.contains("active")) {
    const notificationElement = document.createElement("div");
    notificationElement.className = "browser-notification";
    notificationElement.textContent = message;

    document.body.appendChild(notificationElement);

    // Position notification at the top of the screen
    notificationElement.style.position = "fixed";
    notificationElement.style.top = "20px";
    notificationElement.style.left = "50%";
    notificationElement.style.transform = "translateX(-50%)";
    notificationElement.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    notificationElement.style.color = "white";
    notificationElement.style.padding = "10px 20px";
    notificationElement.style.borderRadius = "5px";
    notificationElement.style.zIndex = "1000";

    // Remove notification after 3 seconds
    setTimeout(() => {
      notificationElement.style.opacity = "0";
      setTimeout(() => {
        document.body.removeChild(notificationElement);
      }, 500);
    }, 3000);
  }
}
