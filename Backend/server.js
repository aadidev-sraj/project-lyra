const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
const path = require("path")
require("dotenv").config()

// Import route files
const authRoutes = require("./routes/auth")
const userRoutes = require("./routes/users")
const moduleRoutes = require("./routes/modules")
const progressRoutes = require("./routes/progress")
const challengeRoutes = require("./routes/challenges")
const dashboardRoutes = require("./routes/dashboard")

const app = express()

// Trust proxy for rate limiting
app.set("trust proxy", 1)

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow inline scripts for Matrix effects
    crossOriginEmbedderPolicy: false,
  }),
)

// CORS configuration
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3001",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
)

// Rate limiting
const limiter = rateLimit({
  windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for static files
    return (
      req.url.endsWith(".html") ||
      req.url.endsWith(".css") ||
      req.url.endsWith(".js") ||
      req.url.endsWith(".png") ||
      req.url.endsWith(".jpg") ||
      req.url.endsWith(".jpeg") ||
      req.url.endsWith(".gif") ||
      req.url.endsWith(".ico") ||
      req.url.endsWith(".svg")
    )
  },
})
app.use("/api/", limiter)

// Body parsing middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Serve static files from project root directory (where your files are)
app.use(
  express.static(path.join(__dirname, ".."), {
    maxAge: "1d", // Cache static files for 1 day
    etag: false,
  }),
)

const connectDB = async () => {
  const maxRetries = 5
  let retries = 0

  // Check if MONGODB_URI is set
  if (!process.env.MONGODB_URI) {
    console.error("❌ MONGODB_URI environment variable is not set!")
    console.log("💡 Please create a .env file in the backend directory with:")
    console.log("   MONGODB_URI=mongodb://localhost:27017/project-lyra")
    console.log("   JWT_SECRET=your-secret-key")
    process.exit(1)
  }

  console.log("🔍 Attempting to connect to MongoDB...")
  console.log("🔍 MongoDB URI:", process.env.MONGODB_URI.replace(/\/\/.*@/, "//***:***@"))

  while (retries < maxRetries) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        family: 4,
      })

      console.log(`✅ MongoDB Connected: ${conn.connection.host}`)
      console.log(`📊 Database: ${conn.connection.name}`)

      console.log("🔍 Testing database operations...")
      const User = require("./models/User")
      const testCount = await User.countDocuments()
      console.log(`✅ Database test successful. Current user count: ${testCount}`)

      break
    } catch (error) {
      retries++
      console.error(`❌ MongoDB connection attempt ${retries} failed:`, error.message)

      if (retries === maxRetries) {
        console.error("❌ Max retries reached. Please check:")
        console.log("   1. MongoDB is running (mongod service)")
        console.log("   2. MONGODB_URI is correct in .env file")
        console.log("   3. Database permissions are set correctly")
        process.exit(1)
      }

      console.log(`⏳ Retrying in 5 seconds... (${retries}/${maxRetries})`)
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }
  }
}

// Initialize database connection
connectDB()

// Handle MongoDB connection events
mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB connection error:", err)
})

mongoose.connection.on("disconnected", () => {
  console.log("⚠️  MongoDB disconnected. Attempting to reconnect...")
})

mongoose.connection.on("reconnected", () => {
  console.log("✅ MongoDB reconnected")
})

// API Routes with proper error handling
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/modules", moduleRoutes)
app.use("/api/progress", progressRoutes)
app.use("/api/challenges", challengeRoutes)
app.use("/api/dashboard", dashboardRoutes)

// Health check endpoint with detailed status
app.get("/api/health", async (req, res) => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"

    // Get basic stats
    const User = require("./models/User")
    const Module = require("./models/Module")

    const userCount = await User.countDocuments()
    const moduleCount = await Module.countDocuments({ isPublished: true })

    res.status(200).json({
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || "development",
      port: process.env.PORT || 3001,
      database: {
        status: dbStatus,
        name: mongoose.connection.name || "Unknown",
      },
      stats: {
        users: userCount,
        modules: moduleCount,
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + " MB",
      },
    })
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      message: error.message,
      timestamp: new Date().toISOString(),
    })
  }
})

// API status endpoint
app.get("/api/status", (req, res) => {
  res.json({
    api: "Project Lyra Backend",
    version: "1.0.0",
    status: "Active",
    endpoints: {
      auth: "/api/auth/*",
      users: "/api/users/*",
      modules: "/api/modules/*",
      progress: "/api/progress/*",
      challenges: "/api/challenges/*",
      dashboard: "/api/dashboard/*",
    },
  })
})

// Serve the main page at root - your index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../index.html"))
})

// Handle specific routes for your existing files
app.get("/dashboard", (req, res) => {
  // If you have a dashboard.html in root, serve it
  const dashboardPath = path.join(__dirname, "../dashboard.html")
  res.sendFile(dashboardPath, (err) => {
    if (err) {
      // Fallback to a simple dashboard page
      res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Dashboard - Project Lyra</title></head>
        <body>
          <h1>Dashboard</h1>
          <p>Dashboard page not found. Please create dashboard.html in your root directory.</p>
          <a href="/">Back to Home</a>
        </body>
        </html>
      `)
    }
  })
})

app.get("/login", (req, res) => {
  // If you have a login.html in root, serve it, otherwise redirect to main page
  const loginPath = path.join(__dirname, "../login.html")
  res.sendFile(loginPath, (err) => {
    if (err) {
      res.redirect("/")
    }
  })
})

app.get("/signup", (req, res) => {
  // If you have a signup.html in root, serve it, otherwise redirect to main page
  const signupPath = path.join(__dirname, "../signup.html")
  res.sendFile(signupPath, (err) => {
    if (err) {
      res.redirect("/")
    }
  })
})

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error("🚨 Global Error Handler:", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  })

  // Handle specific error types
  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation Error",
      message: err.message,
      details: Object.values(err.errors).map((e) => e.message),
    })
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      error: "Invalid ID format",
      message: "The provided ID is not valid",
    })
  }

  if (err.code === 11000) {
    return res.status(400).json({
      error: "Duplicate Entry",
      message: "A record with this information already exists",
    })
  }

  res.status(err.status || 500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "production" ? "Something went wrong!" : err.message,
    timestamp: new Date().toISOString(),
  })
})

// 404 handler for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({
    error: "API route not found",
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
    availableEndpoints: [
      "GET /api/health",
      "GET /api/status",
      "POST /api/auth/login",
      "POST /api/auth/register",
      "GET /api/dashboard",
      "GET /api/modules",
      "GET /api/challenges",
    ],
  })
})

// Serve any other HTML files from root directory
app.get("*.html", (req, res) => {
  const filePath = path.join(__dirname, "..", req.path)
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).send("Page not found")
    }
  })
})

// Fallback for any other routes - serve your main index.html
app.get("*", (req, res) => {
  // Check if it's a file request (has extension)
  if (req.url.includes(".")) {
    return res.status(404).send("File not found")
  }
  // For routes without extensions, serve your main page
  res.sendFile(path.join(__dirname, "../index.html"))
})

const PORT = process.env.PORT || 3001

const server = app.listen(PORT, () => {
  console.log("\n🚀 ================================")
  console.log("🚀 PROJECT LYRA SERVER STARTED")
  console.log("🚀 ================================")
  console.log(`🌐 Server: http://localhost:${PORT}`)
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`)
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || `http://localhost:${PORT}`}`)
  console.log(`🛡️  Security: Helmet, CORS, Rate Limiting enabled`)
  console.log(`📡 API Status: http://localhost:${PORT}/api/status`)
  console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`)
  console.log(`📁 Serving static files from: ${path.join(__dirname, "..")}`)
  console.log("🚀 ================================\n")
})

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\n🔄 Received ${signal}. Starting graceful shutdown...`)

  server.close(async () => {
    console.log("🔌 HTTP server closed")

    try {
      await mongoose.connection.close()
      console.log("✅ MongoDB connection closed")
    } catch (error) {
      console.error("❌ Error closing MongoDB connection:", error)
    }

    console.log("✅ Graceful shutdown completed")
    process.exit(0)
  })

  // Force close after 10 seconds
  setTimeout(() => {
    console.error("❌ Could not close connections in time, forcefully shutting down")
    process.exit(1)
  }, 10000)
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
process.on("SIGINT", () => gracefulShutdown("SIGINT"))

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("🚨 Uncaught Exception:", error)
  gracefulShutdown("UNCAUGHT_EXCEPTION")
})

process.on("unhandledRejection", (reason, promise) => {
  console.error("🚨 Unhandled Rejection at:", promise, "reason:", reason)
  gracefulShutdown("UNHANDLED_REJECTION")
})

module.exports = app
