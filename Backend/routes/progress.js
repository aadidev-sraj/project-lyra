const express = require("express")
const { body, validationResult, param } = require("express-validator")
const Progress = require("../models/Progress")
const Module = require("../models/Module")
const User = require("../models/User")
const { authMiddleware } = require("../middleware/authMiddleware")

const router = express.Router()

// Get user's progress for all modules
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { status, category, page = 1, limit = 10 } = req.query

    const query = { user: req.user._id }
    if (status) query.status = status

    let progress = await Progress.find(query)
      .populate({
        path: "module",
        select: "title slug category difficulty estimatedTime points stats",
        match: category ? { category } : {},
      })
      .sort({ updatedAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean()

    // Filter out progress records where module is null (due to category filter)
    progress = progress.filter((p) => p.module !== null)

    const total = await Progress.countDocuments(query)

    res.json({
      progress,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        total,
      },
    })
  } catch (error) {
    console.error("Get progress error:", error)
    res.status(500).json({ message: "Server error fetching progress" })
  }
})

// Get progress for specific module
router.get(
  "/module/:moduleId",
  authMiddleware,
  [param("moduleId").isMongoId().withMessage("Invalid module ID")],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const progress = await Progress.findOne({
        user: req.user._id,
        module: req.params.moduleId,
      })
        .populate("module", "title slug category difficulty estimatedTime points content quiz")
        .lean()

      if (!progress) {
        return res.status(404).json({ message: "Progress not found for this module" })
      }

      res.json({ progress })
    } catch (error) {
      console.error("Get module progress error:", error)
      res.status(500).json({ message: "Server error fetching module progress" })
    }
  },
)

// Update section progress
router.post(
  "/section",
  authMiddleware,
  [
    body("moduleId").isMongoId().withMessage("Invalid module ID"),
    body("sectionId").notEmpty().withMessage("Section ID is required"),
    body("timeSpent").optional().isInt({ min: 0 }).withMessage("Time spent must be a positive number"),
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

      const { moduleId, sectionId, timeSpent = 0 } = req.body

      // Verify module exists
      const module = await Module.findById(moduleId)
      if (!module) {
        return res.status(404).json({ message: "Module not found" })
      }

      let progress = await Progress.findOne({
        user: req.user._id,
        module: moduleId,
      })

      if (!progress) {
        // Create new progress if doesn't exist
        progress = new Progress({
          user: req.user._id,
          module: moduleId,
          status: "in-progress",
          startedAt: new Date(),
        })

        // Update module enrollment stats
        module.stats.enrollments += 1
        await module.save()
      }

      // Check if section already completed
      const sectionExists = progress.sectionsCompleted.some((section) => section.sectionId === sectionId)

      if (!sectionExists) {
        progress.sectionsCompleted.push({
          sectionId,
          completedAt: new Date(),
        })

        // Update time spent
        progress.timeSpent += timeSpent

        // Calculate progress percentage
        const totalSections = module.content.sections.length
        progress.progress = progress.calculateProgress(totalSections)

        // Check if module is completed (all sections done)
        if (progress.progress === 100 && progress.status !== "completed") {
          progress.status = "completed"
          progress.completedAt = new Date()

          // Update user stats
          await User.findByIdAndUpdate(req.user._id, {
            $inc: {
              "stats.totalModulesCompleted": 1,
              "stats.totalPoints": module.points,
            },
            $set: {
              "stats.lastActivityDate": new Date(),
            },
          })

          // Update module stats
          module.stats.completions += 1
          await module.save()
        }

        await progress.save()
        await req.user.updateActivity()
      }

      res.json({
        message: "Section progress updated successfully",
        progress: {
          ...progress.toObject(),
          isNewCompletion: !sectionExists,
        },
      })
    } catch (error) {
      console.error("Update section progress error:", error)
      res.status(500).json({ message: "Server error updating section progress" })
    }
  },
)

// Submit quiz attempt
router.post(
  "/quiz",
  authMiddleware,
  [
    body("moduleId").isMongoId().withMessage("Invalid module ID"),
    body("answers").isArray().withMessage("Answers must be an array"),
    body("timeSpent").isInt({ min: 0 }).withMessage("Time spent must be a positive number"),
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

      const { moduleId, answers, timeSpent } = req.body

      const module = await Module.findById(moduleId)
      if (!module) {
        return res.status(404).json({ message: "Module not found" })
      }

      if (!module.quiz || !module.quiz.questions.length) {
        return res.status(400).json({ message: "This module has no quiz" })
      }

      let progress = await Progress.findOne({
        user: req.user._id,
        module: moduleId,
      })

      if (!progress) {
        progress = new Progress({
          user: req.user._id,
          module: moduleId,
          status: "in-progress",
          startedAt: new Date(),
        })
      }

      // Calculate score
      let correctAnswers = 0
      const gradedAnswers = answers.map((answer, index) => {
        const question = module.quiz.questions[index]
        if (!question) {
          return {
            questionId: `q${index + 1}`,
            answer: answer.answer,
            isCorrect: false,
            timeSpent: answer.timeSpent || 0,
          }
        }

        const isCorrect = JSON.stringify(answer.answer) === JSON.stringify(question.correctAnswer)
        if (isCorrect) correctAnswers++

        return {
          questionId: question.id,
          answer: answer.answer,
          isCorrect,
          timeSpent: answer.timeSpent || 0,
        }
      })

      const score = Math.round((correctAnswers / module.quiz.questions.length) * 100)
      const attemptNumber = progress.quizAttempts.length + 1

      // Add quiz attempt
      progress.quizAttempts.push({
        attemptNumber,
        score,
        answers: gradedAnswers,
        timeSpent,
        completedAt: new Date(),
      })

      // Update best score
      if (score > progress.bestQuizScore) {
        progress.bestQuizScore = score
      }

      // Update total time spent
      progress.timeSpent += timeSpent

      // Check if quiz is passed
      const passingScore = module.quiz.passingScore || 70
      const isPassed = score >= passingScore

      if (isPassed && progress.status !== "completed") {
        progress.status = "completed"
        progress.completedAt = new Date()

        // Update user stats
        await User.findByIdAndUpdate(req.user._id, {
          $inc: {
            "stats.totalModulesCompleted": 1,
            "stats.totalPoints": module.points,
          },
          $set: {
            "stats.lastActivityDate": new Date(),
          },
        })

        // Update module stats
        module.stats.completions += 1
        await module.save()
      }

      await progress.save()
      await req.user.updateActivity()

      res.json({
        message: "Quiz submitted successfully",
        results: {
          score,
          isPassed,
          correctAnswers,
          totalQuestions: module.quiz.questions.length,
          passingScore,
          attemptNumber,
          timeSpent,
        },
        progress,
      })
    } catch (error) {
      console.error("Submit quiz error:", error)
      res.status(500).json({ message: "Server error submitting quiz" })
    }
  },
)

// Add bookmark
router.post(
  "/bookmark",
  authMiddleware,
  [
    body("moduleId").isMongoId().withMessage("Invalid module ID"),
    body("sectionId").notEmpty().withMessage("Section ID is required"),
    body("note").optional().trim().isLength({ max: 500 }).withMessage("Note cannot exceed 500 characters"),
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

      const { moduleId, sectionId, note } = req.body

      let progress = await Progress.findOne({
        user: req.user._id,
        module: moduleId,
      })

      if (!progress) {
        progress = new Progress({
          user: req.user._id,
          module: moduleId,
          status: "in-progress",
          startedAt: new Date(),
        })
      }

      // Check if bookmark already exists
      const existingBookmarkIndex = progress.bookmarks.findIndex((bookmark) => bookmark.sectionId === sectionId)

      if (existingBookmarkIndex !== -1) {
        // Update existing bookmark
        progress.bookmarks[existingBookmarkIndex].note = note || progress.bookmarks[existingBookmarkIndex].note
        progress.bookmarks[existingBookmarkIndex].createdAt = new Date()
      } else {
        // Add new bookmark
        progress.bookmarks.push({
          sectionId,
          note: note || "",
          createdAt: new Date(),
        })
      }

      await progress.save()
      await req.user.updateActivity()

      res.json({
        message: "Bookmark saved successfully",
        progress,
      })
    } catch (error) {
      console.error("Add bookmark error:", error)
      res.status(500).json({ message: "Server error adding bookmark" })
    }
  },
)

// Remove bookmark
router.delete(
  "/bookmark/:moduleId/:sectionId",
  authMiddleware,
  [
    param("moduleId").isMongoId().withMessage("Invalid module ID"),
    param("sectionId").notEmpty().withMessage("Section ID is required"),
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

      const { moduleId, sectionId } = req.params

      const progress = await Progress.findOne({
        user: req.user._id,
        module: moduleId,
      })

      if (!progress) {
        return res.status(404).json({ message: "Progress not found" })
      }

      progress.bookmarks = progress.bookmarks.filter((bookmark) => bookmark.sectionId !== sectionId)

      await progress.save()

      res.json({
        message: "Bookmark removed successfully",
        progress,
      })
    } catch (error) {
      console.error("Remove bookmark error:", error)
      res.status(500).json({ message: "Server error removing bookmark" })
    }
  },
)

// Get user's bookmarks
router.get("/bookmarks", authMiddleware, async (req, res) => {
  try {
    const progressRecords = await Progress.find({
      user: req.user._id,
      bookmarks: { $exists: true, $not: { $size: 0 } },
    })
      .populate("module", "title slug category")
      .lean()

    const bookmarks = progressRecords
      .flatMap((progress) =>
        progress.bookmarks.map((bookmark) => ({
          ...bookmark,
          module: progress.module,
        })),
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    res.json({ bookmarks })
  } catch (error) {
    console.error("Get bookmarks error:", error)
    res.status(500).json({ message: "Server error fetching bookmarks" })
  }
})

// Get comprehensive progress analytics
router.get("/analytics", authMiddleware, async (req, res) => {
  try {
    const { timeframe = "30d" } = req.query
    const userId = req.user._id

    // Calculate date range
    const now = new Date()
    let startDate
    switch (timeframe) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    // Get progress statistics
    const progressStats = await Progress.aggregate([
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
          _id: "$status",
          count: { $sum: 1 },
          totalTime: { $sum: "$timeSpent" },
          avgScore: { $avg: "$bestQuizScore" },
          totalPoints: { $sum: "$moduleData.points" },
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
          avgScore: { $avg: "$bestQuizScore" },
        },
      },
    ])

    // Get recent activity
    const recentProgress = await Progress.find({
      user: userId,
      updatedAt: { $gte: startDate },
    })
      .populate("module", "title category")
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean()

    // Get learning streak
    const learningStreak = await calculateLearningStreak(userId)

    // Get time-based analytics
    const dailyProgress = await Progress.aggregate([
      { $match: { user: userId, updatedAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: "$updatedAt" },
            month: { $month: "$updatedAt" },
            day: { $dayOfMonth: "$updatedAt" },
          },
          activitiesCount: { $sum: 1 },
          timeSpent: { $sum: "$timeSpent" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ])

    res.json({
      success: true,
      data: {
        progressStats,
        categoryStats,
        recentProgress,
        learningStreak,
        dailyProgress,
        summary: {
          totalModulesStarted: progressStats.reduce((sum, stat) => sum + stat.count, 0),
          totalTimeSpent: progressStats.reduce((sum, stat) => sum + stat.totalTime, 0),
          totalPointsEarned: progressStats.reduce((sum, stat) => sum + stat.totalPoints, 0),
          averageScore: progressStats.reduce((sum, stat) => sum + (stat.avgScore || 0), 0) / progressStats.length || 0,
        },
      },
    })
  } catch (error) {
    console.error("Get progress analytics error:", error)
    res.status(500).json({ message: "Server error fetching progress analytics" })
  }
})

// Update progress with detailed tracking
router.post(
  "/update",
  authMiddleware,
  [
    body("moduleId").isMongoId().withMessage("Invalid module ID"),
    body("action").isIn(["start", "section_complete", "pause", "resume"]).withMessage("Invalid action"),
    body("data").optional().isObject().withMessage("Data must be an object"),
    body("timeSpent").optional().isInt({ min: 0 }).withMessage("Time spent must be a positive number"),
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

      const { moduleId, action, data = {}, timeSpent = 0 } = req.body
      const userId = req.user._id

      // Verify module exists
      const module = await Module.findById(moduleId)
      if (!module) {
        return res.status(404).json({ message: "Module not found" })
      }

      let progress = await Progress.findOne({ user: userId, module: moduleId })

      if (!progress && action === "start") {
        // Create new progress record
        progress = new Progress({
          user: userId,
          module: moduleId,
          status: "in-progress",
          startedAt: new Date(),
          lastAccessedAt: new Date(),
        })

        // Update module enrollment stats
        module.stats.enrollments += 1
        await module.save()
      } else if (!progress) {
        return res.status(404).json({ message: "Progress not found. Start the module first." })
      }

      // Update progress based on action
      switch (action) {
        case "start":
          progress.status = "in-progress"
          progress.startedAt = progress.startedAt || new Date()
          break

        case "section_complete":
          if (data.sectionId) {
            const sectionExists = progress.sectionsCompleted.some((section) => section.sectionId === data.sectionId)

            if (!sectionExists) {
              progress.sectionsCompleted.push({
                sectionId: data.sectionId,
                completedAt: new Date(),
                timeSpent: timeSpent,
              })

              // Calculate overall progress
              const totalSections = module.content?.sections?.length || 1
              progress.progress = Math.round((progress.sectionsCompleted.length / totalSections) * 100)

              // Check if module is completed
              if (progress.progress >= 100 && progress.status !== "completed") {
                progress.status = "completed"
                progress.completedAt = new Date()

                // Update user stats
                await User.findByIdAndUpdate(userId, {
                  $inc: {
                    "stats.modulesCompleted": 1,
                    "stats.totalPoints": module.points,
                  },
                  $set: {
                    "stats.lastActivity": new Date(),
                  },
                })

                // Update module completion stats
                module.stats.completions += 1
                await module.save()
              }
            }
          }
          break

        case "pause":
          progress.lastPausedAt = new Date()
          break

        case "resume":
          progress.lastResumedAt = new Date()
          break
      }

      // Update common fields
      progress.timeSpent += timeSpent
      progress.lastAccessedAt = new Date()

      // Add activity log entry
      progress.activityLog.push({
        action,
        timestamp: new Date(),
        data,
        timeSpent,
      })

      await progress.save()
      await req.user.updateActivity()

      // Populate module data for response
      await progress.populate("module", "title slug category difficulty points")

      res.json({
        success: true,
        message: `Progress ${action} recorded successfully`,
        progress,
        achievements: await checkForAchievements(userId, progress),
      })
    } catch (error) {
      console.error("Update progress error:", error)
      res.status(500).json({ message: "Server error updating progress" })
    }
  },
)

// Get learning path recommendations
router.get("/recommendations", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id

    // Get user's completed modules and preferences
    const userProgress = await Progress.find({ user: userId }).populate("module", "category difficulty").lean()

    const completedCategories = [
      ...new Set(userProgress.filter((p) => p.status === "completed").map((p) => p.module.category)),
    ]

    const inProgressCategories = [
      ...new Set(userProgress.filter((p) => p.status === "in-progress").map((p) => p.module.category)),
    ]

    // Find recommended modules
    const recommendations = await Module.find({
      _id: { $nin: userProgress.map((p) => p.module._id) },
      isActive: true,
      $or: [
        { category: { $in: completedCategories } },
        { category: { $in: inProgressCategories } },
        { difficulty: "easy" }, // Always recommend easy modules for beginners
      ],
    })
      .sort({ "stats.enrollments": -1, difficulty: 1 })
      .limit(10)
      .lean()

    res.json({
      success: true,
      data: {
        recommendations,
        completedCategories,
        inProgressCategories,
      },
    })
  } catch (error) {
    console.error("Get recommendations error:", error)
    res.status(500).json({ message: "Server error fetching recommendations" })
  }
})

// Helper function to calculate learning streak
async function calculateLearningStreak(userId) {
  try {
    const progressRecords = await Progress.find({ user: userId }).sort({ updatedAt: -1 }).lean()

    if (!progressRecords.length) return { current: 0, longest: 0 }

    const activityDates = [...new Set(progressRecords.map((p) => p.updatedAt.toDateString()))].sort(
      (a, b) => new Date(b) - new Date(a),
    )

    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0

    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString()

    // Calculate current streak
    if (activityDates.includes(today) || activityDates.includes(yesterday)) {
      let checkDate = new Date()
      if (!activityDates.includes(today)) {
        checkDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
      }

      while (activityDates.includes(checkDate.toDateString())) {
        currentStreak++
        checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000)
      }
    }

    // Calculate longest streak
    for (let i = 0; i < activityDates.length; i++) {
      const currentDate = new Date(activityDates[i])
      const nextDate = i < activityDates.length - 1 ? new Date(activityDates[i + 1]) : null

      tempStreak++

      if (!nextDate || currentDate - nextDate > 24 * 60 * 60 * 1000) {
        longestStreak = Math.max(longestStreak, tempStreak)
        tempStreak = 0
      }
    }

    return { current: currentStreak, longest: Math.max(longestStreak, currentStreak) }
  } catch (error) {
    console.error("Calculate learning streak error:", error)
    return { current: 0, longest: 0 }
  }
}

// Helper function to check for achievements
async function checkForAchievements(userId, progress) {
  try {
    const achievements = []

    // Check for completion achievements
    if (progress.status === "completed") {
      achievements.push({
        type: "module_completed",
        title: "Module Master",
        description: `Completed ${progress.module.title}`,
        points: 50,
      })
    }

    // Check for streak achievements
    const streak = await calculateLearningStreak(userId)
    if (streak.current === 7) {
      achievements.push({
        type: "week_streak",
        title: "Week Warrior",
        description: "7-day learning streak!",
        points: 100,
      })
    }

    return achievements
  } catch (error) {
    console.error("Check achievements error:", error)
    return []
  }
}

module.exports = router
