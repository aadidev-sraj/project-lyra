const express = require("express")
const User = require("../models/User")
const Module = require("../models/Module")
const Progress = require("../models/Progress")
const ChallengeAttempt = require("../models/ChallengeAttempt")
const { authMiddleware } = require("../middleware/authMiddleware")

const router = express.Router()

// Get dashboard data
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id

    // Get user stats
    const user = await User.findById(userId).select("stats preferences")

    // Get recent progress
    const recentProgress = await Progress.find({ user: userId })
      .populate("module", "title slug category difficulty points")
      .sort({ updatedAt: -1 })
      .limit(5)

    // Get completed modules count
    const completedModulesCount = await Progress.countDocuments({
      user: userId,
      status: "completed",
    })

    // Get in-progress modules count
    const inProgressModulesCount = await Progress.countDocuments({
      user: userId,
      status: "in-progress",
    })

    // Get recent challenge attempts
    const recentChallenges = await ChallengeAttempt.find({ user: userId })
      .populate("challenge", "title type difficulty points")
      .sort({ completedAt: -1 })
      .limit(5)

    // Get challenge stats
    const totalChallengeAttempts = await ChallengeAttempt.countDocuments({ user: userId })
    const successfulChallenges = await ChallengeAttempt.countDocuments({
      user: userId,
      isSuccessful: true,
    })

    // Calculate weekly progress
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const weeklyProgress = await Progress.find({
      user: userId,
      updatedAt: { $gte: oneWeekAgo },
    }).populate("module", "title category")

    // Get recommended modules (not started, matching user's interests)
    const userProgress = await Progress.find({ user: userId }).select("module")
    const completedModuleIds = userProgress.map((p) => p.module)

    const recommendedModules = await Module.find({
      _id: { $nin: completedModuleIds },
      isPublished: true,
    })
      .populate("author", "firstName lastName")
      .limit(3)

    // Calculate learning streak
    const calculateStreak = async (userId) => {
      const activities = await Progress.find({ user: userId }).sort({ updatedAt: -1 }).select("updatedAt")

      let streak = 0
      const currentDate = new Date()
      currentDate.setHours(0, 0, 0, 0)

      for (const activity of activities) {
        const activityDate = new Date(activity.updatedAt)
        activityDate.setHours(0, 0, 0, 0)

        const diffTime = currentDate - activityDate
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays === streak) {
          streak++
          currentDate.setDate(currentDate.getDate() - 1)
        } else if (diffDays > streak + 1) {
          break
        }
      }

      return streak
    }

    const currentStreak = await calculateStreak(userId)

    // Update user streak if different
    if (user.stats.currentStreak !== currentStreak) {
      user.stats.currentStreak = currentStreak
      if (currentStreak > user.stats.longestStreak) {
        user.stats.longestStreak = currentStreak
      }
      await user.save()
    }

    const dashboardData = {
      user: {
        stats: user.stats,
        preferences: user.preferences,
      },
      overview: {
        completedModules: completedModulesCount,
        inProgressModules: inProgressModulesCount,
        totalChallengeAttempts,
        successfulChallenges,
        successRate: totalChallengeAttempts > 0 ? Math.round((successfulChallenges / totalChallengeAttempts) * 100) : 0,
        currentStreak,
      },
      recentActivity: {
        modules: recentProgress,
        challenges: recentChallenges,
      },
      weeklyProgress: weeklyProgress.length,
      recommendedModules,
    }

    res.json(dashboardData)
  } catch (error) {
    console.error("Dashboard error:", error)
    res.status(500).json({ message: "Server error loading dashboard" })
  }
})

// Get learning analytics
router.get("/analytics", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id
    const { period = "30" } = req.query // days

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - Number.parseInt(period))

    // Get progress over time
    const progressOverTime = await Progress.aggregate([
      {
        $match: {
          user: userId,
          updatedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$updatedAt",
            },
          },
          count: { $sum: 1 },
          avgProgress: { $avg: "$progress" },
        },
      },
      { $sort: { _id: 1 } },
    ])

    // Get category breakdown
    const categoryBreakdown = await Progress.aggregate([
      {
        $match: { user: userId },
      },
      {
        $lookup: {
          from: "modules",
          localField: "module",
          foreignField: "_id",
          as: "moduleData",
        },
      },
      {
        $unwind: "$moduleData",
      },
      {
        $group: {
          _id: "$moduleData.category",
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] },
          },
          totalTime: { $sum: "$timeSpent" },
          avgScore: { $avg: "$bestQuizScore" },
        },
      },
    ])

    // Get time spent analysis
    const timeAnalysis = await Progress.aggregate([
      {
        $match: { user: userId },
      },
      {
        $group: {
          _id: null,
          totalTime: { $sum: "$timeSpent" },
          avgTimePerModule: { $avg: "$timeSpent" },
          totalModules: { $sum: 1 },
        },
      },
    ])

    res.json({
      progressOverTime,
      categoryBreakdown,
      timeAnalysis: timeAnalysis[0] || {
        totalTime: 0,
        avgTimePerModule: 0,
        totalModules: 0,
      },
    })
  } catch (error) {
    console.error("Analytics error:", error)
    res.status(500).json({ message: "Server error loading analytics" })
  }
})

module.exports = router
