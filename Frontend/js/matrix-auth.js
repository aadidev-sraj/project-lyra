// Matrix-themed authentication handler
document.addEventListener("DOMContentLoaded", () => {
  // Initialize splash screen
  initSplashScreen()

  // Initialize auth tabs
  initAuthTabs()

  // Initialize forms
  initAuthForms()
})

function initSplashScreen() {
  const splashScreen = document.getElementById("splash-screen")
  const mainContent = document.getElementById("main-content")

  // Show splash screen for 4 seconds
  setTimeout(() => {
    splashScreen.classList.remove("active")
    mainContent.classList.add("visible")
  }, 4000)
}

function initAuthTabs() {
  const authTabs = document.querySelectorAll(".auth-tab")
  const authForms = document.querySelectorAll(".auth-form")

  authTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetTab = tab.getAttribute("data-tab")

      // Remove active class from all tabs and forms
      authTabs.forEach((t) => t.classList.remove("active"))
      authForms.forEach((f) => f.classList.remove("active"))

      // Add active class to clicked tab and corresponding form
      tab.classList.add("active")
      document.getElementById(`${targetTab}-form`).classList.add("active")
    })
  })
}

function initAuthForms() {
  const loginForm = document.getElementById("login-form")
  const signupForm = document.getElementById("signup-form")

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault()
    handleLogin()
  })

  signupForm.addEventListener("submit", (e) => {
    e.preventDefault()
    handleSignup()
  })
}

async function handleLogin() {
  const email = document.getElementById("login-email").value.trim()
  const password = document.getElementById("login-password").value

  if (!email || !password) {
    showTerminalMessage("ERROR: All fields required", "error")
    return
  }

  showTerminalMessage("INITIALIZING CONNECTION...", "info")

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || "Login failed")
    }

    // Store token
    localStorage.setItem("lyra_token", data.token)

    showTerminalMessage("ACCESS GRANTED", "success")

    // Redirect to dashboard after success
    setTimeout(() => {
      window.location.href = "/pages/dashboard.html"
    }, 1500)
  } catch (error) {
    showTerminalMessage(`ERROR: ${error.message}`, "error")
  }
}

async function handleSignup() {
  const username = document.getElementById("signup-username").value.trim()
  const firstName = document.getElementById("signup-firstname").value.trim()
  const lastName = document.getElementById("signup-lastname").value.trim()
  const email = document.getElementById("signup-email").value.trim()
  const password = document.getElementById("signup-password").value
  const confirmPassword = document.getElementById("signup-confirm").value

  // Validation
  if (!username || !firstName || !lastName || !email || !password || !confirmPassword) {
    showTerminalMessage("ERROR: All fields required", "error")
    return
  }

  if (username.length < 3) {
    showTerminalMessage("ERROR: Username must be at least 3 characters", "error")
    return
  }

  if (password.length < 6) {
    showTerminalMessage("ERROR: Password must be at least 6 characters", "error")
    return
  }

  if (password !== confirmPassword) {
    showTerminalMessage("ERROR: Passwords do not match", "error")
    return
  }

  showTerminalMessage("ESTABLISHING PROFILE...", "info")

  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        firstName,
        lastName,
        email,
        password,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || data.errors?.map((e) => e.msg).join(", ") || "Registration failed")
    }

    showTerminalMessage("PROFILE CREATED SUCCESSFULLY", "success")

    // Switch to login tab
    setTimeout(() => {
      document.querySelector('[data-tab="login"]').click()
      showTerminalMessage("Please login with your new credentials", "info")
    }, 1500)
  } catch (error) {
    showTerminalMessage(`ERROR: ${error.message}`, "error")
  }
}

function showTerminalMessage(message, type = "info") {
  // Remove existing message
  const existingMessage = document.querySelector(".terminal-message")
  if (existingMessage) {
    existingMessage.remove()
  }

  // Create new message element
  const messageElement = document.createElement("div")
  messageElement.className = `terminal-message ${type}`
  messageElement.textContent = message

  // Add to DOM
  document.body.appendChild(messageElement)

  // Auto-remove after 4 seconds
  setTimeout(() => {
    if (messageElement.parentNode) {
      messageElement.remove()
    }
  }, 4000)
}

// Add input focus effects
document.addEventListener("DOMContentLoaded", () => {
  const inputs = document.querySelectorAll(".input-group input")

  inputs.forEach((input) => {
    input.addEventListener("focus", () => {
      input.parentElement.classList.add("focused")
    })

    input.addEventListener("blur", () => {
      input.parentElement.classList.remove("focused")
    })
  })
})
