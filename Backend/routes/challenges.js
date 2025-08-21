const express = require("express")
const { body, validationResult } = require("express-validator")
const mongoose = require("mongoose") // Import mongoose
const Challenge = require("../models/Challenge")
const ChallengeAttempt = require("../models/ChallengeAttempt")
const User = require("../models/User")
const { auth, instructorAuth } = require("../middleware/auth")

const router = express.Router()

// Get all challenges
router.get("/", async (req, res) => {
  try {
    const { type, difficulty, category, page = 1, limit = 10 } = req.query

    const query = { isActive: true }

    if (type) query.type = type
    if (difficulty) query.difficulty = difficulty
    if (category) query.category = category

    const challenges = await Challenge.find(query)
      .populate("author", "firstName lastName")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Challenge.countDocuments(query)

    res.json({
      challenges,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    })
  } catch (error) {
    console.error("Get challenges error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get single challenge
router.get("/:id", async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id).populate("author", "firstName lastName")

    if (!challenge || !challenge.isActive) {
      return res.status(404).json({ message: "Challenge not found" })
    }

    // Remove solution from response for security
    const challengeData = challenge.toObject()
    delete challengeData.content.solution

    res.json({ challenge: challengeData })
  } catch (error) {
    console.error("Get challenge error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Create challenge (instructor/admin only)
router.post(
  "/",
  instructorAuth,
  [
    body("title").notEmpty().trim().escape(),
    body("description").notEmpty().trim(),
    body("type").isIn(["phishing-detection", "password-strength", "network-analysis", "malware-identification"]),
    body("difficulty").isIn(["easy", "medium", "hard"]),
    body("points").isInt({ min: 10 }),
    body("category").notEmpty().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const challenge = new Challenge({
        ...req.body,
        author: req.user._id,
      })

      await challenge.save()
      await challenge.populate("author", "firstName lastName")

      res.status(201).json({ message: "Challenge created successfully", challenge })
    } catch (error) {
      console.error("Create challenge error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Submit challenge attempt
router.post(
  "/:id/attempt",
  auth,
  [body("answers").exists(), body("timeSpent").isInt({ min: 0 }), body("startedAt").isISO8601()],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { answers, timeSpent, startedAt, hintsUsed = 0 } = req.body
      const challengeId = req.params.id

      const challenge = await Challenge.findById(challengeId)
      if (!challenge || !challenge.isActive) {
        return res.status(404).json({ message: "Challenge not found" })
      }

      // Validate solution (this would be challenge-type specific)
      const { score, isSuccessful, feedback } = validateChallengeAnswer(
        challenge.type,
        answers,
        challenge.content.solution,
      )

      // Create attempt record
      const attempt = new ChallengeAttempt({
        user: req.user._id,
        challenge: challengeId,
        answers,
        score,
        timeSpent,
        isSuccessful,
        hintsUsed,
        feedback,
        startedAt: new Date(startedAt),
      })

      await attempt.save()

      // Update challenge stats
      challenge.stats.attempts += 1
      if (isSuccessful) {
        challenge.stats.successes += 1
      }

      // Update average time and score
      const allAttempts = await ChallengeAttempt.find({ challenge: challengeId })
      challenge.stats.averageTime = allAttempts.reduce((sum, att) => sum + att.timeSpent, 0) / allAttempts.length
      challenge.stats.averageScore = allAttempts.reduce((sum, att) => sum + att.score, 0) / allAttempts.length

      await challenge.save()

      // Update user stats if successful
      if (isSuccessful) {
        await User.findByIdAndUpdate(req.user._id, {
          $inc: {
            "stats.totalChallengesCompleted": 1,
            "stats.totalPoints": challenge.points,
          },
        })
      }

      res.json({
        message: "Challenge attempt submitted",
        score,
        isSuccessful,
        feedback,
        pointsEarned: isSuccessful ? challenge.points : 0,
      })
    } catch (error) {
      console.error("Submit challenge attempt error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Get user's challenge attempts
router.get("/attempts/me", auth, async (req, res) => {
  try {
    const attempts = await ChallengeAttempt.find({ user: req.user._id })
      .populate("challenge", "title type difficulty points")
      .sort({ completedAt: -1 })

    res.json({ attempts })
  } catch (error) {
    console.error("Get user attempts error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get leaderboard for a challenge
router.get("/:id/leaderboard", async (req, res) => {
  try {
    const leaderboard = await ChallengeAttempt.aggregate([
      {
        $match: {
          challenge: mongoose.Types.ObjectId(req.params.id),
          isSuccessful: true,
        },
      },
      {
        $group: {
          _id: "$user",
          bestScore: { $max: "$score" },
          bestTime: { $min: "$timeSpent" },
          attempts: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          username: "$user.username",
          firstName: "$user.firstName",
          lastName: "$user.lastName",
          bestScore: 1,
          bestTime: 1,
          attempts: 1,
        },
      },
      {
        $sort: { bestScore: -1, bestTime: 1 },
      },
      {
        $limit: 10,
      },
    ])

    res.json({ leaderboard })
  } catch (error) {
    console.error("Get leaderboard error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Helper function to validate challenge answers
function validateChallengeAnswer(type, answers, solution) {
  let score = 0
  let isSuccessful = false
  let feedback = ""

  switch (type) {
    case "phishing-detection":
      // Compare identified phishing indicators
      const correctIndicators = solution.indicators || []
      const userIndicators = answers.indicators || []

      const correctCount = userIndicators.filter((indicator) => correctIndicators.includes(indicator)).length

      score = Math.round((correctCount / correctIndicators.length) * 100)
      isSuccessful = score >= 70
      feedback = `You identified ${correctCount} out of ${correctIndicators.length} phishing indicators correctly.`
      break

    case "password-strength":
      // Evaluate password strength assessment
      const expectedStrength = solution.strength
      const userAssessment = answers.strength

      score = userAssessment === expectedStrength ? 100 : 0
      isSuccessful = score === 100
      feedback =
        score === 100
          ? "Correct password strength assessment!"
          : `Incorrect. The password strength should be: ${expectedStrength}`
      break

    case "network-analysis":
      // Analyze network traffic patterns
      const suspiciousIPs = solution.suspiciousIPs || []
      const userIPs = answers.suspiciousIPs || []

      const correctIPs = userIPs.filter((ip) => suspiciousIPs.includes(ip)).length
      score = Math.round((correctIPs / suspiciousIPs.length) * 100)
      isSuccessful = score >= 80
      feedback = `You correctly identified ${correctIPs} out of ${suspiciousIPs.length} suspicious IP addresses.`
      break

    case "malware-identification":
      // Identify malware characteristics
      const malwareType = solution.type
      const userType = answers.type

      score = userType === malwareType ? 100 : 0
      isSuccessful = score === 100
      feedback = score === 100 ? "Correct malware identification!" : `Incorrect. This is ${malwareType} malware.`
      break

    default:
      score = 0
      isSuccessful = false
      feedback = "Unknown challenge type"
  }

  return { score, isSuccessful, feedback }
}

module.exports = router
