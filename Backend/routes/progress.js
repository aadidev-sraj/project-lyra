const express = require("express")
const { body, validationResult } = require("express-validator")
const Progress = require("../models/Progress")
const Module = require("../models/Module")
const User = require("../models/User")
const { auth } = require("../middleware/auth")

const router = express.Router()

// Get user's progress for all modules
router.get("/", auth, async (req, res) => {
  try {
    const progress = await Progress.find({ user: req.user._id })
      .populate("module", "title slug category difficulty estimatedTime points")
      .sort({ updatedAt: -1 })

    res.json({ progress })
  } catch (error) {
    console.error("Get progress error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get progress for specific module
router.get("/module/:moduleId", auth, async (req, res) => {
  try {
    const progress = await Progress.findOne({
      user: req.user._id,
      module: req.params.moduleId,
    }).populate("module", "title slug category difficulty estimatedTime points content quiz")

    if (!progress) {
      return res.status(404).json({ message: "Progress not found" })
    }

    res.json({ progress })
  } catch (error) {
    console.error("Get module progress error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Update section progress
router.post("/section", auth, [body("moduleId").isMongoId(), body("sectionId").notEmpty()], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { moduleId, sectionId } = req.body

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
      })
    }

    // Check if section already completed
    const sectionExists = progress.sectionsCompleted.some((section) => section.sectionId === sectionId)

    if (!sectionExists) {
      progress.sectionsCompleted.push({
        sectionId,
        completedAt: new Date(),
      })

      // Get module to calculate progress
      const module = await Module.findById(moduleId)
      if (module) {
        const totalSections = module.content.sections.length
        progress.progress = progress.calculateProgress(totalSections)

        // Check if module is completed
        if (progress.progress === 100 && progress.status !== "completed") {
          progress.status = "completed"
          progress.completedAt = new Date()

          // Update user stats
          await User.findByIdAndUpdate(req.user._id, {
            $inc: {
              "stats.totalModulesCompleted": 1,
              "stats.totalPoints": module.points,
            },
          })

          // Update module stats
          module.stats.completions += 1
          await module.save()
        }
      }

      await progress.save()
    }

    res.json({ message: "Section progress updated", progress })
  } catch (error) {
    console.error("Update section progress error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Submit quiz attempt
router.post(
  "/quiz",
  auth,
  [body("moduleId").isMongoId(), body("answers").isArray(), body("timeSpent").isInt({ min: 0 })],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { moduleId, answers, timeSpent } = req.body

      const module = await Module.findById(moduleId)
      if (!module) {
        return res.status(404).json({ message: "Module not found" })
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
        })
      }

      // Calculate score
      let correctAnswers = 0
      const gradedAnswers = answers.map((answer, index) => {
        const question = module.quiz.questions[index]
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

      // Check if quiz is passed
      const isPassed = score >= (module.quiz.passingScore || 70)

      if (isPassed && progress.status !== "completed") {
        progress.status = "completed"
        progress.completedAt = new Date()

        // Update user stats
        await User.findByIdAndUpdate(req.user._id, {
          $inc: {
            "stats.totalModulesCompleted": 1,
            "stats.totalPoints": module.points,
          },
        })

        // Update module stats
        module.stats.completions += 1
        await module.save()
      }

      await progress.save()

      res.json({
        message: "Quiz submitted successfully",
        score,
        isPassed,
        correctAnswers,
        totalQuestions: module.quiz.questions.length,
        progress,
      })
    } catch (error) {
      console.error("Submit quiz error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Add bookmark
router.post(
  "/bookmark",
  auth,
  [body("moduleId").isMongoId(), body("sectionId").notEmpty(), body("note").optional().trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
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
        })
      }

      // Check if bookmark already exists
      const existingBookmark = progress.bookmarks.find((bookmark) => bookmark.sectionId === sectionId)

      if (existingBookmark) {
        existingBookmark.note = note || existingBookmark.note
      } else {
        progress.bookmarks.push({
          sectionId,
          note: note || "",
          createdAt: new Date(),
        })
      }

      await progress.save()

      res.json({ message: "Bookmark added successfully", progress })
    } catch (error) {
      console.error("Add bookmark error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Remove bookmark
router.delete("/bookmark/:moduleId/:sectionId", auth, async (req, res) => {
  try {
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

    res.json({ message: "Bookmark removed successfully", progress })
  } catch (error) {
    console.error("Remove bookmark error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
