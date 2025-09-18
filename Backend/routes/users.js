const express = require("express")
const { body, validationResult, param } = require("express-validator")
const User = require("../models/User")
const Progress = require("../models/Progress")
const ChallengeAttempt = require("../models/ChallengeAttempt")
const Activity = require("../models/Activity")
const { authMiddleware, adminAuth } = require("../middleware/authMiddleware")

const router = express.Router()

// Get user profile
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean()
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Get additional stats
    const completedModules = await Progress.countDocuments({
      user: req.user._id,
      status: "completed",
    })

    const totalChallenges = await ChallengeAttempt.countDocuments({
      user: req.user._id,
      isSuccessful: true,
    })

    res.json({
      user: {
        ...user,
        stats: {
          ...user.stats,
          completedModules,
          totalChallenges,
        },
      },
    })
  } catch (error) {
    console.error("Get profile error:", error)
    res.status(500).json({ message: "Server error fetching profile" })
  }
})

// Update user profile
router.put(
  "/profile",
  authMiddleware,
  [
    body("name").optional().trim().isLength({ min: 1, max: 100 }).withMessage("Name must be 1-100 characters"),
    body("email").optional().isEmail().normalizeEmail().withMessage("Please provide a valid email"),
    body("preferences.theme").optional().isIn(["light", "dark", "auto"]).withMessage("Invalid theme"),
    body("preferences.language").optional().isLength({ min: 2, max: 5 }).withMessage("Invalid language code"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const { name, email, preferences } = req.body
      const updateData = {}

      if (name) updateData.name = name
      if (email) updateData.email = email
      if (preferences) {
        updateData.preferences = {
          ...req.user.preferences,
          ...preferences,
        }
      }

      // Check if email is already taken by another user
      if (email && email !== req.user.email) {
        const existingUser = await User.findOne({ email })
        if (existingUser) {
          return res.status(400).json({ message: "Email already in use by another account" })
        }
      }

      const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true, runValidators: true }).lean()

      res.json({
        message: "Profile updated successfully",
        user,
      })
    } catch (error) {
      console.error("Update profile error:", error)
      res.status(500).json({ message: "Server error updating profile" })
    }
  },
)

// Change password
router.put(
  "/password",
  authMiddleware,
  [
    body("currentPassword").notEmpty().withMessage("Current password is required"),
    body("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 characters"),
    body("confirmPassword").custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error("Password confirmation does not match")
      }
      return true
    }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const { currentPassword, newPassword } = req.body

      const user = await User.findById(req.user._id).select("+password")
      const isMatch = await user.comparePassword(currentPassword)

      if (!isMatch) {
        return res.status(400).json({ message: "Current password is incorrect" })
      }

      user.password = newPassword
      await user.save()

      res.json({ message: "Password updated successfully" })
    } catch (error) {
      console.error("Change password error:", error)
      res.status(500).json({ message: "Server error changing password" })
    }
  },
)

// Get user statistics
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id

    // Get progress stats
    const progressStats = await Progress.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalTime: { $sum: "$timeSpent" },
          avgScore: { $avg: "$bestQuizScore" },
        },
      },
    ])

    // Get challenge stats
    const challengeStats = await ChallengeAttempt.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: "$isSuccessful",
          count: { $sum: 1 },
          avgScore: { $avg: "$score" },
          totalTime: { $sum: "$timeSpent" },
        },
      },
    ])

    // Get category breakdown
    const categoryStats = await Progress.aggregate([
      { $match: { user: userId } },
      {
        $lookup: {
          from: "modules",
          localField: "module",
          foreignField: "_id",
          as: "moduleData",
        },
      },
      { $unwind: "$moduleData" },
      {
        $group: {
          _id: "$moduleData.category",
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] } },
          totalTime: { $sum: "$timeSpent" },
        },
      },
    ])

    res.json({
      progress: progressStats,
      challenges: challengeStats,
      categories: categoryStats,
      summary: {
        totalModulesStarted: progressStats.reduce((sum, stat) => sum + stat.count, 0),
        totalChallengeAttempts: challengeStats.reduce((sum, stat) => sum + stat.count, 0),
        totalTimeSpent: progressStats.reduce((sum, stat) => sum + stat.totalTime, 0),
      },
    })
  } catch (error) {
    console.error("Get user stats error:", error)
    res.status(500).json({ message: "Server error fetching statistics" })
  }
})

// Get all users (admin only)
router.get("/", adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role, isActive, sortBy = "createdAt", sortOrder = "desc" } = req.query

    const query = {}

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ]
    }

    if (role) query.role = role
    if (isActive !== undefined) query.isActive = isActive === "true"

    const sort = {}
    sort[sortBy] = sortOrder === "asc" ? 1 : -1

    const users = await User.find(query)
      .sort(sort)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean()

    const total = await User.countDocuments(query)

    res.json({
      users,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        total,
        hasNext: Number(page) < Math.ceil(total / Number(limit)),
        hasPrev: Number(page) > 1,
      },
    })
  } catch (error) {
    console.error("Get users error:", error)
    res.status(500).json({ message: "Server error fetching users" })
  }
})

// Get user by ID (admin only)
router.get("/:id", adminAuth, [param("id").isMongoId().withMessage("Invalid user ID")], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array(),
      })
    }

    const user = await User.findById(req.params.id).lean()
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Get user's progress and challenge stats
    const progressCount = await Progress.countDocuments({ user: req.params.id })
    const completedModules = await Progress.countDocuments({
      user: req.params.id,
      status: "completed",
    })
    const challengeAttempts = await ChallengeAttempt.countDocuments({ user: req.params.id })
    const successfulChallenges = await ChallengeAttempt.countDocuments({
      user: req.params.id,
      isSuccessful: true,
    })

    res.json({
      user: {
        ...user,
        stats: {
          ...user.stats,
          progressCount,
          completedModules,
          challengeAttempts,
          successfulChallenges,
        },
      },
    })
  } catch (error) {
    console.error("Get user by ID error:", error)
    res.status(500).json({ message: "Server error fetching user" })
  }
})

// Update user role (admin only)
router.put(
  "/:id/role",
  adminAuth,
  [
    param("id").isMongoId().withMessage("Invalid user ID"),
    body("role").isIn(["student", "instructor", "admin"]).withMessage("Invalid role"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const { role } = req.body

      // Prevent admin from changing their own role
      if (req.params.id === req.user._id.toString()) {
        return res.status(400).json({ message: "Cannot change your own role" })
      }

      const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true, runValidators: true }).lean()

      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }

      res.json({
        message: "User role updated successfully",
        user,
      })
    } catch (error) {
      console.error("Update user role error:", error)
      res.status(500).json({ message: "Server error updating user role" })
    }
  },
)

// Deactivate user (admin only)
router.put("/:id/deactivate", adminAuth, [param("id").isMongoId().withMessage("Invalid user ID")], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array(),
      })
    }

    // Prevent admin from deactivating themselves
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot deactivate your own account" })
    }

    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true }).lean()

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json({
      message: "User deactivated successfully",
      user,
    })
  } catch (error) {
    console.error("Deactivate user error:", error)
    res.status(500).json({ message: "Server error deactivating user" })
  }
})

// Activate user (admin only)
router.put("/:id/activate", adminAuth, [param("id").isMongoId().withMessage("Invalid user ID")], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array(),
      })
    }

    const user = await User.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true }).lean()

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json({
      message: "User activated successfully",
      user,
    })
  } catch (error) {
    console.error("Activate user error:", error)
    res.status(500).json({ message: "Server error activating user" })
  }
})

// Delete user (admin only)
router.delete("/:id", adminAuth, [param("id").isMongoId().withMessage("Invalid user ID")], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array(),
      })
    }

    // Prevent admin from deleting themselves
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot delete your own account" })
    }

    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Delete user and all related data
    await Promise.all([
      User.findByIdAndDelete(req.params.id),
      Progress.deleteMany({ user: req.params.id }),
      ChallengeAttempt.deleteMany({ user: req.params.id }),
    ])

    res.json({ message: "User and all related data deleted successfully" })
  } catch (error) {
    console.error("Delete user error:", error)
    res.status(500).json({ message: "Server error deleting user" })
  }
})

// Track user activity
router.post(
  "/activity",
  authMiddleware,
  [
    body("action").notEmpty().withMessage("Action is required"),
    body("page").notEmpty().withMessage("Page is required"),
    body("timestamp").optional().isISO8601().withMessage("Invalid timestamp format"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const { action, data = {}, page, timestamp, duration } = req.body

      // Create activity record
      const activity = new Activity({
        user: req.user._id,
        action,
        data,
        page,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        duration,
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip || req.connection.remoteAddress,
        sessionId: req.sessionID || req.headers["x-session-id"],
      })

      await activity.save()

      // Update user's last activity timestamp
      await User.findByIdAndUpdate(req.user._id, {
        "stats.lastActivity": new Date(),
      })

      res.json({
        success: true,
        message: "Activity tracked successfully",
        activityId: activity._id,
      })
    } catch (error) {
      console.error("Track activity error:", error)
      res.status(500).json({ message: "Server error tracking activity" })
    }
  },
)

// Get user activity history
router.get("/activity", authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 50, action, startDate, endDate, timeframe = "7d" } = req.query

    const activities = await Activity.getUserActivities(req.user._id, {
      limit: Number(limit),
      skip: (Number(page) - 1) * Number(limit),
      action,
      startDate,
      endDate,
    })

    const stats = await Activity.getActivityStats(req.user._id, timeframe)

    const total = await Activity.countDocuments({
      user: req.user._id,
      ...(action && { action }),
      ...((startDate || endDate) && {
        timestamp: {
          ...(startDate && { $gte: new Date(startDate) }),
          ...(endDate && { $lte: new Date(endDate) }),
        },
      }),
    })

    res.json({
      success: true,
      data: {
        activities,
        stats,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          total,
          hasNext: Number(page) < Math.ceil(total / Number(limit)),
          hasPrev: Number(page) > 1,
        },
      },
    })
  } catch (error) {
    console.error("Get activity history error:", error)
    res.status(500).json({ message: "Server error fetching activity history" })
  }
})

// Get all user activities (admin only)
router.get("/activity/all", adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 100, userId, action, startDate, endDate } = req.query

    const query = {}
    if (userId) query.user = userId
    if (action) query.action = action
    if (startDate || endDate) {
      query.timestamp = {}
      if (startDate) query.timestamp.$gte = new Date(startDate)
      if (endDate) query.timestamp.$lte = new Date(endDate)
    }

    const activities = await Activity.find(query)
      .populate("user", "name email role")
      .sort({ timestamp: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean()

    const total = await Activity.countDocuments(query)

    // Get activity summary stats
    const summaryStats = await Activity.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$action",
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: "$user" },
        },
      },
      {
        $project: {
          action: "$_id",
          count: 1,
          uniqueUsers: { $size: "$uniqueUsers" },
        },
      },
      { $sort: { count: -1 } },
    ])

    res.json({
      success: true,
      data: {
        activities,
        summary: summaryStats,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          total,
          hasNext: Number(page) < Math.ceil(total / Number(limit)),
          hasPrev: Number(page) > 1,
        },
      },
    })
  } catch (error) {
    console.error("Get all activities error:", error)
    res.status(500).json({ message: "Server error fetching activities" })
  }
})

module.exports = router
