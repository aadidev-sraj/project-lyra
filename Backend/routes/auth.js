const express = require("express")
const jwt = require("jsonwebtoken")
const { body, validationResult } = require("express-validator")
const User = require("../models/User")
const { authMiddleware } = require("../middleware/authMiddleware")

const router = express.Router()

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  })
}

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
  "/register",
  [
    body("name").isLength({ min: 2, max: 50 }).withMessage("Name must be between 2 and 50 characters").trim(),
    body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
  ],
  async (req, res) => {
    try {
      console.log("🔥 ===== REGISTRATION DEBUG START =====")
      console.log("📝 Request body:", JSON.stringify(req.body, null, 2))
      console.log("📝 Request headers:", JSON.stringify(req.headers, null, 2))

      const mongoose = require("mongoose")
      console.log("🔍 Database connection state:", mongoose.connection.readyState)
      console.log("🔍 Database name:", mongoose.connection.name)
      console.log("🔍 Database host:", mongoose.connection.host)

      if (mongoose.connection.readyState !== 1) {
        console.log("❌ Database not connected!")
        return res.status(500).json({
          success: false,
          message: "Database connection error",
        })
      }

      // Check for validation errors
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        console.log("❌ Validation errors:", errors.array())
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const { name, email, password } = req.body

      console.log("🔍 Checking if user exists with email:", email.toLowerCase())
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
      })

      if (existingUser) {
        console.log("❌ User already exists:", email)
        return res.status(400).json({
          success: false,
          message: "Email already registered",
        })
      }

      console.log("✅ Email is available, creating new user...")

      // Create new user
      const user = new User({
        name: name.trim(),
        email: email.toLowerCase(),
        password,
        role: "student",
        isActive: true,
        stats: {
          totalPoints: 0,
          modulesCompleted: 0,
          challengesCompleted: 0,
          currentStreak: 0,
          lastActivity: new Date(),
        },
      })

      console.log("🔍 User object before save:", {
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        hasPassword: !!user.password,
      })

      // Validate the user object
      const validationError = user.validateSync()
      if (validationError) {
        console.log("❌ User validation failed:", validationError.errors)
        return res.status(400).json({
          success: false,
          message: "User validation failed",
          errors: Object.values(validationError.errors).map((err) => err.message),
        })
      }

      console.log("💾 Attempting to save user to database...")
      console.log("🔍 Collection name:", User.collection.name)

      const savedUser = await user.save()
      console.log("✅ User saved successfully!")
      console.log("🔍 Saved user ID:", savedUser._id)
      console.log("🔍 Saved user data:", {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        createdAt: savedUser.createdAt,
      })

      console.log("🔍 Verifying user in database...")
      const verifyUser = await User.findById(savedUser._id)
      if (!verifyUser) {
        console.log("❌ CRITICAL: User was not found after saving!")
        return res.status(500).json({
          success: false,
          message: "User creation verification failed",
        })
      }
      console.log("✅ User verified in database:", verifyUser.email)

      const totalUsers = await User.countDocuments()
      console.log("📊 Total users in database:", totalUsers)

      // Generate token
      const token = generateToken(savedUser._id)

      // Update last login
      savedUser.lastLogin = new Date()
      await savedUser.save()

      console.log("✅ Registration completed successfully!")
      console.log("🔥 ===== REGISTRATION DEBUG END =====")

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        token,
        user: {
          id: savedUser._id,
          name: savedUser.name,
          email: savedUser.email,
          role: savedUser.role,
          stats: savedUser.stats,
          createdAt: savedUser.createdAt,
        },
      })
    } catch (error) {
      console.error("❌ Registration error:", error)
      console.error("❌ Error stack:", error.stack)

      // Handle specific MongoDB errors
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        })
      }

      if (error.name === "ValidationError") {
        const messages = Object.values(error.errors).map((err) => err.message)
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: messages,
        })
      }

      res.status(500).json({
        success: false,
        message: "Server error during registration",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      })
    }
  },
)

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    try {
      console.log("🔐 Login attempt for:", req.body.email)

      // Check for validation errors
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        console.log("❌ Login validation errors:", errors.array())
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const { email, password } = req.body

      // Find user by email
      const user = await User.findOne({ email: email.toLowerCase() }).select("+password")
      if (!user) {
        console.log("❌ User not found")
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        })
      }

      console.log("✅ User found:", user.name)

      // Check if account is active
      if (!user.isActive) {
        console.log("❌ Account is deactivated")
        return res.status(401).json({
          success: false,
          message: "Account has been deactivated",
        })
      }

      // Verify password
      const isMatch = await user.comparePassword(password)
      if (!isMatch) {
        console.log("❌ Password does not match")
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        })
      }

      console.log("✅ Password verified, updating last login...")

      // Generate token
      const token = generateToken(user._id)

      // Update last login and activity
      user.lastLogin = new Date()
      user.stats.lastActivity = new Date()
      await user.save()

      console.log("✅ Login successful, token generated")

      res.json({
        success: true,
        message: "Login successful",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          stats: user.stats,
          lastLogin: user.lastLogin,
        },
      })
    } catch (error) {
      console.error("❌ Login error:", error)
      res.status(500).json({
        success: false,
        message: "Server error during login",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      })
    }
  },
)

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get("/me", authMiddleware, async (req, res) => {
  try {
    console.log("👤 Getting user profile for ID:", req.user._id)

    res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        stats: req.user.stats,
        lastLogin: req.user.lastLogin,
        createdAt: req.user.createdAt,
      },
    })
  } catch (error) {
    console.error("❌ Get user error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
})

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post("/logout", authMiddleware, async (req, res) => {
  try {
    // Update last activity
    await User.findByIdAndUpdate(req.user._id, {
      "stats.lastActivity": new Date(),
    })

    console.log("👋 User logged out:", req.user.name)

    res.json({
      success: true,
      message: "Logged out successfully",
    })
  } catch (error) {
    console.error("❌ Logout error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
    })
  }
})

// @route   GET /api/auth/verify
// @desc    Verify token
// @access  Private
router.get("/verify", authMiddleware, (req, res) => {
  res.json({
    success: true,
    valid: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  })
})

module.exports = router
