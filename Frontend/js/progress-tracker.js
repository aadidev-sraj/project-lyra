/**
 * Progress Tracking System for Project Lyra
 * Handles real-time progress updates and analytics
 */

class ProgressTracker {
  constructor() {
    this.currentModule = null
    this.startTime = null
    this.lastActivityTime = null
    this.progressData = {}
    this.achievements = []

    this.init()
  }

  init() {
    // Initialize progress tracking
    this.bindEvents()
    this.startActivityMonitoring()
  }

  bindEvents() {
    // Track page visibility changes
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.pauseTracking()
      } else {
        this.resumeTracking()
      }
    })

    // Track beforeunload to save progress
    window.addEventListener("beforeunload", () => {
      this.saveCurrentProgress()
    })

    // Track scroll progress for reading comprehension
    window.addEventListener(
      "scroll",
      this.throttle(() => {
        this.trackScrollProgress()
      }, 1000),
    )
  }

  // Start tracking a module
  async startModule(moduleId, moduleTitle) {
    this.currentModule = { id: moduleId, title: moduleTitle }
    this.startTime = Date.now()
    this.lastActivityTime = Date.now()

    try {
      await this.updateProgress("start", {
        moduleId: moduleId,
        startTime: new Date().toISOString(),
      })

      // Track with activity system
      await window.LyraAuth.trackUserActivity("module_started", {
        moduleId: moduleId,
        moduleTitle: moduleTitle,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Failed to start module tracking:", error)
    }
  }

  // Mark section as completed
  async completeSection(sectionId, sectionTitle) {
    if (!this.currentModule) return

    const timeSpent = this.calculateTimeSpent()

    try {
      const response = await this.updateProgress("section_complete", {
        moduleId: this.currentModule.id,
        sectionId: sectionId,
        timeSpent: timeSpent,
      })

      // Check for achievements
      if (response.achievements && response.achievements.length > 0) {
        this.showAchievements(response.achievements)
      }

      // Track with activity system
      await window.LyraAuth.trackUserActivity("section_completed", {
        moduleId: this.currentModule.id,
        sectionId: sectionId,
        sectionTitle: sectionTitle,
        timeSpent: timeSpent,
        timestamp: new Date().toISOString(),
      })

      // Update UI progress indicators
      this.updateProgressUI(response.progress)
    } catch (error) {
      console.error("Failed to complete section:", error)
    }
  }

  // Pause tracking
  async pauseTracking() {
    if (!this.currentModule) return

    const timeSpent = this.calculateTimeSpent()

    try {
      await this.updateProgress("pause", {
        moduleId: this.currentModule.id,
        timeSpent: timeSpent,
      })
    } catch (error) {
      console.error("Failed to pause tracking:", error)
    }
  }

  // Resume tracking
  async resumeTracking() {
    if (!this.currentModule) return

    this.lastActivityTime = Date.now()

    try {
      await this.updateProgress("resume", {
        moduleId: this.currentModule.id,
      })
    } catch (error) {
      console.error("Failed to resume tracking:", error)
    }
  }

  // Save current progress
  async saveCurrentProgress() {
    if (!this.currentModule) return

    const timeSpent = this.calculateTimeSpent()

    try {
      await window.LyraAuth.trackUserActivity("module_time_spent", {
        moduleId: this.currentModule.id,
        timeSpent: timeSpent,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Failed to save progress:", error)
    }
  }

  // Track scroll progress for reading comprehension
  trackScrollProgress() {
    const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100)

    if (scrollPercent > 0 && scrollPercent % 25 === 0) {
      window.LyraAuth.trackUserActivity("scroll_milestone", {
        moduleId: this.currentModule?.id,
        scrollPercent: scrollPercent,
        timestamp: new Date().toISOString(),
      })
    }
  }

  // Update progress via API
  async updateProgress(action, data) {
    const token = window.LyraAuth.getToken()
    if (!token) return

    const response = await fetch(`${window.LyraAuth.API_BASE}/api/progress/update`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: action,
        ...data,
      }),
    })

    if (!response.ok) {
      throw new Error(`Progress update failed: ${response.status}`)
    }

    return await response.json()
  }

  // Get progress analytics
  async getAnalytics(timeframe = "30d") {
    const token = window.LyraAuth.getToken()
    if (!token) return null

    try {
      const response = await fetch(`${window.LyraAuth.API_BASE}/api/progress/analytics?timeframe=${timeframe}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      console.error("Failed to get progress analytics:", error)
    }

    return null
  }

  // Get learning recommendations
  async getRecommendations() {
    const token = window.LyraAuth.getToken()
    if (!token) return []

    try {
      const response = await fetch(`${window.LyraAuth.API_BASE}/api/progress/recommendations`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        return data.data.recommendations || []
      }
    } catch (error) {
      console.error("Failed to get recommendations:", error)
    }

    return []
  }

  // Calculate time spent since last activity
  calculateTimeSpent() {
    if (!this.lastActivityTime) return 0
    return Math.floor((Date.now() - this.lastActivityTime) / 1000)
  }

  // Update progress UI elements
  updateProgressUI(progressData) {
    // Update progress bars
    const progressBars = document.querySelectorAll(".progress-bar")
    progressBars.forEach((bar) => {
      const fill = bar.querySelector(".progress-fill")
      if (fill) {
        fill.style.width = `${progressData.progress || 0}%`
      }
    })

    // Update progress percentages
    const progressTexts = document.querySelectorAll(".progress-percentage")
    progressTexts.forEach((text) => {
      text.textContent = `${progressData.progress || 0}%`
    })

    // Update completion status
    if (progressData.status === "completed") {
      document.body.classList.add("module-completed")
      this.showCompletionMessage()
    }
  }

  // Show achievement notifications
  showAchievements(achievements) {
    achievements.forEach((achievement) => {
      this.showNotification({
        type: "achievement",
        title: achievement.title,
        message: achievement.description,
        points: achievement.points,
      })
    })
  }

  // Show completion message
  showCompletionMessage() {
    this.showNotification({
      type: "success",
      title: "Module Completed!",
      message: `Congratulations on completing ${this.currentModule.title}!`,
      duration: 5000,
    })
  }

  // Show notification
  showNotification({ type, title, message, points, duration = 3000 }) {
    const notification = document.createElement("div")
    notification.className = `progress-notification ${type}`
    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
        ${points ? `<div class="notification-points">+${points} points</div>` : ""}
      </div>
      <button class="notification-close">&times;</button>
    `

    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 255, 0, 0.1);
      border: 1px solid #00ff00;
      color: #00ff00;
      padding: 15px;
      border-radius: 8px;
      max-width: 300px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `

    document.body.appendChild(notification)

    // Auto remove
    setTimeout(() => {
      notification.remove()
    }, duration)

    // Manual close
    notification.querySelector(".notification-close").addEventListener("click", () => {
      notification.remove()
    })
  }

  // Start activity monitoring
  startActivityMonitoring() {
    // Monitor user interactions
    ;["click", "keydown", "scroll", "mousemove"].forEach((event) => {
      document.addEventListener(
        event,
        this.throttle(() => {
          this.lastActivityTime = Date.now()
        }, 5000),
      )
    })

    // Periodic progress saves
    setInterval(() => {
      if (this.currentModule) {
        this.saveCurrentProgress()
      }
    }, 60000) // Save every minute
  }

  // Throttle function to limit API calls
  throttle(func, limit) {
    let inThrottle
    return function () {
      const args = arguments
      
      if (!inThrottle) {
        func.apply(this, args)
        inThrottle = true
        setTimeout(() => (inThrottle = false), limit)
      }
    }
  }
}

// Initialize global progress tracker
window.ProgressTracker = new ProgressTracker()

// Export for module use
if (typeof module !== "undefined" && module.exports) {
  module.exports = ProgressTracker
}
