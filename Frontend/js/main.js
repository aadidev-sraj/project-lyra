// Main Game Logic
window.gameState = {
  vpnActive: false,
  stealthActive: false,
  stealthTimeRemaining: 300, // 5 minutes in seconds
  stealthInterval: null,
  activeWindows: [],
  socialMediaUnlocked: false,
  recoveryUnlocked: false,
  attempts: 0,
  maxAttempts: 3,
};

// Initialize when document loads
document.addEventListener("DOMContentLoaded", () => {
  // Update desktop clock
  updateClock();
  setInterval(updateClock, 1000);

  // Initialize windows
  initializeWindows();

  // Initialize event listeners for window interactions
  initializeWindowInteractions();
});

// Update desktop clock
function updateClock() {
  const clockElement = document.getElementById("desktop-clock");
  if (clockElement) {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes.toString().padStart(2, "0");
    clockElement.textContent = `${formattedHours}:${formattedMinutes} ${ampm}`;
  }
}

// Initialize windows positioning
function initializeWindows() {
  const windows = document.querySelectorAll(".window");

  windows.forEach((window) => {
    // Set initial positions (random offsets to prevent exact stacking)
    const offsetX = Math.random() * 50 - 25;
    const offsetY = Math.random() * 50 - 25;
    window.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
  });
}

// Set up event listeners for window interactions
function initializeWindowInteractions() {
  const windows = document.querySelectorAll(".window");
  let highestZIndex = 10;

  windows.forEach((window) => {
    const header = window.querySelector(".window-header");
    const closeBtn = window.querySelector(".close");
    const minimizeBtn = window.querySelector(".minimize");
    const maximizeBtn = window.querySelector(".maximize");

    // Make window draggable
    makeDraggable(window, header);

    // Close button
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        window.classList.remove("active");
        // Remove from active windows
        const index = gameState.activeWindows.indexOf(window.id);
        if (index > -1) {
          gameState.activeWindows.splice(index, 1);
        }
        // Remove task item
        updateTaskItems();
      });
    }

    // Minimize button
    if (minimizeBtn) {
      minimizeBtn.addEventListener("click", () => {
        window.classList.remove("active");
      });
    }

    // Maximize button (toggle fullscreen)
    if (maximizeBtn) {
      maximizeBtn.addEventListener("click", () => {
        window.classList.toggle("fullscreen");

        if (window.classList.contains("fullscreen")) {
          window.style.width = "100%";
          window.style.height = "calc(100% - 40px)"; // Account for taskbar
          window.style.top = "0";
          window.style.left = "0";
          window.style.transform = "none";
          window.style.borderRadius = "0";
        } else {
          window.style.width = "800px";
          window.style.height = "600px";
          window.style.top = "50%";
          window.style.left = "50%";
          window.style.transform = "translate(-50%, -50%)";
          window.style.borderRadius = "8px";
        }
      });
    }

    // Bring to front when clicked
    window.addEventListener("mousedown", () => {
      highestZIndex += 1;
      window.style.zIndex = highestZIndex;
    });
  });

  // Set up desktop icon clicks
  const icons = document.querySelectorAll(".desktop-icons .icon");
  icons.forEach((icon) => {
    icon.addEventListener("click", () => {
      const appId = icon.id;
      const windowId = appId.replace("icon", "window");
      openWindow(windowId);
    });
  });
}

// Make an element draggable
function makeDraggable(element, handle) {
  let pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;

  if (handle) {
    handle.onmousedown = dragMouseDown;
  } else {
    element.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();

    // Don't drag if window is fullscreen
    if (element.classList.contains("fullscreen")) {
      return;
    }

    // Get the mouse cursor position at startup
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();

    // Calculate the new cursor position
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;

    // Set the element's new position
    element.style.top = element.offsetTop - pos2 + "px";
    element.style.left = element.offsetLeft - pos1 + "px";

    // Reset transform since we're using absolute positioning now
    element.style.transform = "none";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// Open a window
function openWindow(windowId) {
  const window = document.getElementById(windowId);
  if (window) {
    // Close all other windows if it's the first window
    if (gameState.activeWindows.length === 0) {
      document.querySelectorAll(".window").forEach((w) => {
        w.classList.remove("active");
      });
    }

    // Add to active windows if not already there
    if (!gameState.activeWindows.includes(windowId)) {
      gameState.activeWindows.push(windowId);
    }

    // Show window
    window.classList.add("active");

    // Update taskbar
    updateTaskItems();

    // Bring to front
    const highestZ = Math.max(
      ...Array.from(document.querySelectorAll(".window")).map(
        (w) => parseInt(w.style.zIndex) || 0
      )
    );
    window.style.zIndex = highestZ + 1;
  }
}

// Update taskbar items based on active windows
function updateTaskItems() {
  const taskItems = document.querySelector(".task-items");
  taskItems.innerHTML = "";

  gameState.activeWindows.forEach((windowId) => {
    const window = document.getElementById(windowId);
    if (window) {
      const title = window.querySelector(".window-title").textContent;

      const taskItem = document.createElement("div");
      taskItem.className = "task-item";
      if (window.classList.contains("active")) {
        taskItem.classList.add("active");
      }
      taskItem.textContent = title;

      taskItem.addEventListener("click", () => {
        if (window.classList.contains("active")) {
          window.classList.remove("active");
        } else {
          window.classList.add("active");
          // Bring to front
          const highestZ = Math.max(
            ...Array.from(document.querySelectorAll(".window")).map(
              (w) => parseInt(w.style.zIndex) || 0
            )
          );
          window.style.zIndex = highestZ + 1;
        }
      });

      taskItems.appendChild(taskItem);
    }
  });
}

// Show game success
function showSuccess() {
  const modal = document.getElementById("success-modal");
  modal.classList.add("active");

  document.getElementById("success-close").addEventListener("click", () => {
    modal.classList.remove("active");
    document.getElementById("exit-simulation").click();
  });
}

// Show game failure
function showFailure(reason) {
  const modal = document.getElementById("failure-modal");
  document.getElementById("failure-reason").textContent =
    reason ||
    "The target has been alerted to your activities and has secured their accounts.";
  modal.classList.add("active");

  document.getElementById("failure-close").addEventListener("click", () => {
    modal.classList.remove("active");
    resetGame();
  });
}

// Reset the game state
function resetGame() {
  // Reset game state
  gameState = {
    vpnActive: false,
    stealthActive: false,
    stealthTimeRemaining: 300,
    stealthInterval: null,
    activeWindows: [],
    socialMediaUnlocked: false,
    recoveryUnlocked: false,
    attempts: 0,
    maxAttempts: 3,
  };

  // Reset stealth timer if active
  if (gameState.stealthInterval) {
    clearInterval(gameState.stealthInterval);
  }

  // Close all windows
  document.querySelectorAll(".window").forEach((window) => {
    window.classList.remove("active");
  });

  // Reset VPN
  document.getElementById("vpn-status-indicator").classList.remove("connected");
  document.getElementById("vpn-status-indicator").classList.add("disconnected");
  document.getElementById("vpn-status-text").textContent = "Disconnected";
  document.getElementById("vpn-connect-button").textContent = "Connect";
  document.getElementById("vpn-connect-button").classList.remove("disconnect");

  // Reset Stealth
  document
    .getElementById("stealth-status-indicator")
    .classList.remove("connected");
  document
    .getElementById("stealth-status-indicator")
    .classList.add("disconnected");
  document.getElementById("stealth-status-text").textContent = "Inactive";
  document.getElementById("stealth-activate-button").textContent = "Activate";
  document
    .getElementById("stealth-activate-button")
    .classList.remove("disabled");
  document.getElementById("stealth-timer").classList.add("hidden");

  // Reset browser
  document.getElementById("address-input").value = "socialconnect.com/login";
  document.querySelectorAll(".browser-page").forEach((page) => {
    page.classList.add("hidden");
  });
  document.getElementById("login-page").classList.remove("hidden");
  document.getElementById("password-input").value = "";
  document.getElementById("login-message").textContent = "";
  document.getElementById("forgot-password-button").classList.add("disabled");

  // Clear security questions
  document.getElementById("security-questions").innerHTML = "";
  document.getElementById("recovery-message").textContent = "";

  // Update taskbar
  updateTaskItems();
}
