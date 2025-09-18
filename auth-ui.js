/**
 * Main Auth helper for Project Lyra
 * Handles authentication with MongoDB backend
 */

;(() => {
  const API_BASE = window.LYRA_API_BASE || "http://localhost:3001"

  function saveToken(token) {
    try {
      localStorage.setItem("lyra_token", token)
    } catch {}
  }

  function getToken() {
    try {
      return localStorage.getItem("lyra_token")
    } catch {
      return null
    }
  }

  function clearAuth() {
    try {
      localStorage.removeItem("lyra_token")
    } catch {}
  }

  async function api(path, options = {}) {
    console.log(`[v0] Making API call to: ${API_BASE}${path}`)

    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      method: options.method || "GET",
      body: options.body ? JSON.stringify(options.body) : undefined,
    })

    console.log(`[v0] API response status: ${res.status}`)

    const data = await res.json().catch(() => ({}))
    console.log(`[v0] API response data:`, data)

    if (!res.ok) {
      const message =
        data?.message || (data?.errors && data.errors.map((e) => e.msg).join(", ")) || `Request failed (${res.status})`
      throw new Error(message)
    }
    return data
  }

  async function login({ email, password }) {
    console.log("[v0] Attempting login for:", email)
    const data = await api("/api/auth/login", {
      method: "POST",
      body: { email, password },
    })
    if (data?.token) {
      console.log("[v0] Login successful, saving token")
      saveToken(data.token)
    }
    return data
  }

  async function register({ username, email, password, firstName, lastName }) {
    console.log("[v0] Frontend registration attempt:", { username, email, firstName, lastName })

    const name = username || `${firstName || ""} ${lastName || ""}`.trim() || "User"
    console.log("[v0] Processed name:", name)
    console.log("[v0] API endpoint:", `${API_BASE}/api/auth/register`)

    try {
      const data = await api("/api/auth/register", {
        method: "POST",
        body: { name, email, password },
      })
      console.log("[v0] Registration response:", data)

      if (data?.token) {
        console.log("[v0] Token received, saving to localStorage")
        saveToken(data.token)
      }
      return data
    } catch (error) {
      console.error("[v0] Registration error:", error)
      throw error
    }
  }

  async function me() {
    const token = getToken()
    if (!token) throw new Error("Not authenticated")
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`)
    return data?.user
  }

  async function checkHealth() {
    try {
      const data = await api("/api/health")
      console.log("[v0] Backend health check:", data)
      return data
    } catch (error) {
      console.error("[v0] Backend health check failed:", error)
      throw error
    }
  }

  // Expose to window
  window.LyraAuth = { login, register, me, getToken, clearAuth, checkHealth, API_BASE }
})()

document.addEventListener("DOMContentLoaded", async () => {
  console.log("[v0] Checking backend connection...")
  try {
    await window.LyraAuth.checkHealth()
    console.log("[v0] Backend connection successful")
  } catch (error) {
    console.error("[v0] Backend connection failed:", error)
    showTerminalMessage("ERROR: Backend connection failed", "error")
  }

  const authTabs = document.querySelectorAll(".auth-tab")
  const authForms = document.querySelectorAll(".auth-form")

  // Tab switching functionality
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

  // Form validation and submission
  const loginForm = document.getElementById("login-form")
  const signupForm = document.getElementById("signup-form")

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault()
      handleLogin()
    })
  }

  if (signupForm) {
    signupForm.addEventListener("submit", (e) => {
      e.preventDefault()
      handleSignup()
    })
  }
})

async function handleLogin() {
  const email = document.getElementById("login-email").value
  const password = document.getElementById("login-password").value

  // Basic validation
  if (!email || !password) {
    showTerminalMessage("ERROR: All fields required", "error")
    return
  }

  if (!isValidEmail(email)) {
    showTerminalMessage("ERROR: Invalid email format", "error")
    return
  }

  // Real login process with backend
  showTerminalMessage("INITIALIZING CONNECTION...", "info")

  try {
    const result = await window.LyraAuth.login({ email, password })
    showTerminalMessage("ACCESS GRANTED", "success")
    setTimeout(() => {
      window.location.href = "frontend/pages/dashboard.html"
    }, 1500)
  } catch (error) {
    showTerminalMessage(`ERROR: ${error.message}`, "error")
  }
}

async function handleSignup() {
  console.log("[v0] Starting signup process...")

  const username = document.getElementById("signup-username").value
  const email = document.getElementById("signup-email").value
  const password = document.getElementById("signup-password").value
  const confirmPassword = document.getElementById("signup-confirm").value

  console.log("[v0] Form values:", { username, email, passwordLength: password.length })

  // Basic validation
  if (!username || !email || !password || !confirmPassword) {
    showTerminalMessage("ERROR: All fields required", "error")
    return
  }

  if (!isValidEmail(email)) {
    showTerminalMessage("ERROR: Invalid email format", "error")
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

  if (username.length < 3) {
    showTerminalMessage("ERROR: Username must be at least 3 characters", "error")
    return
  }

  // Real signup process with backend
  showTerminalMessage("ESTABLISHING PROFILE...", "info")

  try {
    console.log("[v0] Calling register function...")
    const result = await window.LyraAuth.register({
      username,
      email,
      password,
    })
    console.log("[v0] Registration successful:", result)
    showTerminalMessage("PROFILE CREATED SUCCESSFULLY", "success")
    setTimeout(() => {
      // Switch to login tab
      document.querySelector('[data-tab="login"]').click()
      showTerminalMessage("Please login with your new credentials", "info")
    }, 1500)
  } catch (error) {
    console.error("[v0] Registration failed:", error)
    showTerminalMessage(`ERROR: ${error.message}`, "error")
  }
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function showTerminalMessage(message, type = "info") {
  // Remove existing messages
  const existingMessage = document.querySelector(".terminal-message")
  if (existingMessage) {
    existingMessage.remove()
  }

  // Create message element
  const messageElement = document.createElement("div")
  messageElement.className = `terminal-message ${type}`
  messageElement.textContent = message

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
    `

  // Add CSS animation
  const style = document.createElement("style")
  style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `
  document.head.appendChild(style)

  document.body.appendChild(messageElement)

  // Auto remove after 3 seconds
  setTimeout(() => {
    messageElement.style.animation = "slideOut 0.3s ease"
    setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.remove()
      }
    }, 300)
  }, 3000)
}

function getMessageColor(type) {
  switch (type) {
    case "error":
      return "#ff0000"
    case "success":
      return "#00ff00"
    case "info":
      return "#00aaff"
    default:
      return "#00ff00"
  }
}

// Add terminal-style input effects
document.addEventListener("DOMContentLoaded", () => {
  const inputs = document.querySelectorAll("input")

  inputs.forEach((input) => {
    // Add focus effects
    input.addEventListener("focus", () => {
      input.style.borderColor = "#00ff00"
      input.style.boxShadow = "0 0 15px rgba(0, 255, 0, 0.5)"
    })

    input.addEventListener("blur", () => {
      input.style.borderColor = "#00ff00"
      input.style.boxShadow = "none"
    })

    // Add typing effects
    input.addEventListener("input", () => {
      input.style.textShadow = "0 0 5px #00ff00"
      setTimeout(() => {
        input.style.textShadow = "none"
      }, 100)
    })
  })
})
