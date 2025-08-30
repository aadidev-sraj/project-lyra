// Desktop Environment Interactions

document.addEventListener("DOMContentLoaded", () => {
  // Desktop double-click handler for icons
  const icons = document.querySelectorAll(".desktop-icons .icon");
  icons.forEach((icon) => {
    icon.addEventListener("dblclick", () => {
      const appId = icon.id;
      const windowId = appId.replace("icon", "window");
      openWindow(windowId);
    });
  });

  // Handle taskbar interactions
  initializeTaskbar();
});

// Initialize taskbar functionality
function initializeTaskbar() {
  const startButton = document.querySelector(".start-button");

  if (startButton) {
    startButton.addEventListener("click", () => {
      // Toggle start menu (not implemented in this version)
      alert(
        "Start menu functionality would appear here in a full implementation."
      );
    });
  }
}

// Window stacking and ordering
let zIndexCounter = 100;

function bringToFront(window) {
  zIndexCounter++;
  window.style.zIndex = zIndexCounter;

  // Update active status in taskbar
  updateActiveWindow(window.id);
}

function updateActiveWindow(windowId) {
  // Remove active class from all task items
  document.querySelectorAll(".task-item").forEach((item) => {
    item.classList.remove("active");
  });

  // Add active class to the clicked window's task item
  const taskItems = document.querySelectorAll(".task-item");
  for (const item of taskItems) {
    if (
      item.textContent ===
      document.getElementById(windowId).querySelector(".window-title")
        .textContent
    ) {
      item.classList.add("active");
      break;
    }
  }
}
