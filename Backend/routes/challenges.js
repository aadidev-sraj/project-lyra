const express = require("express")
const { body, validationResult, param } = require("express-validator")
const mongoose = require("mongoose")
const Challenge = require("../models/Challenge")
const ChallengeAttempt = require("../models/ChallengeAttempt")
const User = require("../models/User")
const { authMiddleware, instructorAuth } = require("../middleware/authMiddleware")

const router = express.Router()

// Get all challenges with filtering
router.get("/", async (req, res) => {
  try {
    const { type, difficulty, category, page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc" } = req.query

    const query = { isActive: true }

    if (type) query.type = type
    if (difficulty) query.difficulty = difficulty
    if (category) query.category = category

    const sort = {}
    sort[sortBy] = sortOrder === "asc" ? 1 : -1

    const challenges = await Challenge.find(query)
      .populate("author", "firstName lastName username")
      .sort(sort)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean()

    const total = await Challenge.countDocuments(query)

    // Remove solution from response for security
    const safeChallenges = challenges.map((challenge) => {
      const { content, ...safeChallenge } = challenge
      return {
        ...safeChallenge,
        content: {
          scenario: content.scenario,
          data: content.data,
          hints: content.hints,
          // solution is excluded
        },
      }
    })

    res.json({
      challenges: safeChallenges,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        total,
      },
    })
  } catch (error) {
    console.error("Get challenges error:", error)
    res.status(500).json({ message: "Server error fetching challenges" })
  }
})

// Get single challenge
router.get("/:id", [param("id").isMongoId().withMessage("Invalid challenge ID")], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array(),
      })
    }

    const challenge = await Challenge.findById(req.params.id).populate("author", "firstName lastName username").lean()

    if (!challenge || !challenge.isActive) {
      return res.status(404).json({ message: "Challenge not found" })
    }

    // Remove solution from response for security
    const { content, ...safeChallenge } = challenge
    const safeChallengeData = {
      ...safeChallenge,
      content: {
        scenario: content.scenario,
        data: content.data,
        hints: content.hints,
        // solution is excluded
      },
    }

    res.json({ challenge: safeChallengeData })
  } catch (error) {
    console.error("Get challenge error:", error)
    res.status(500).json({ message: "Server error fetching challenge" })
  }
})

// Create challenge (instructor/admin only)
router.post(
  "/",
  instructorAuth,
  [
    body("title").notEmpty().trim().isLength({ min: 3, max: 100 }).withMessage("Title must be 3-100 characters"),
    body("description")
      .notEmpty()
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage("Description must be 10-500 characters"),
    body("type")
      .isIn(["phishing-detection", "password-strength", "network-analysis", "malware-identification"])
      .withMessage("Invalid challenge type"),
    body("difficulty").isIn(["easy", "medium", "hard"]).withMessage("Invalid difficulty level"),
    body("points").isInt({ min: 10, max: 1000 }).withMessage("Points must be between 10-1000"),
    body("timeLimit").optional().isInt({ min: 60, max: 3600 }).withMessage("Time limit must be 60-3600 seconds"),
    body("category").notEmpty().trim().withMessage("Category is required"),
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

      const challenge = new Challenge({
        ...req.body,
        author: req.user._id,
      })

      await challenge.save()
      await challenge.populate("author", "firstName lastName username")

      res.status(201).json({
        message: "Challenge created successfully",
        challenge,
      })
    } catch (error) {
      console.error("Create challenge error:", error)
      res.status(500).json({ message: "Server error creating challenge" })
    }
  },
)

// Submit challenge attempt
router.post(
  "/:id/attempt",
  authMiddleware,
  [
    param("id").isMongoId().withMessage("Invalid challenge ID"),
    body("answers").exists().withMessage("Answers are required"),
    body("timeSpent").isInt({ min: 0 }).withMessage("Time spent must be a positive number"),
    body("startedAt").isISO8601().withMessage("Started time must be a valid date"),
    body("hintsUsed").optional().isInt({ min: 0 }).withMessage("Hints used must be a positive number"),
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

      const { answers, timeSpent, startedAt, hintsUsed = 0 } = req.body
      const challengeId = req.params.id

      const challenge = await Challenge.findById(challengeId)
      if (!challenge || !challenge.isActive) {
        return res.status(404).json({ message: "Challenge not found" })
      }

      // Validate time limit
      const timeTaken = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
      if (timeTaken > challenge.timeLimit) {
        return res.status(400).json({
          message: "Time limit exceeded",
          timeLimit: challenge.timeLimit,
          timeTaken,
        })
      }

      // Validate solution (this would be challenge-type specific)
      const { score, isSuccessful, feedback } = validateChallengeAnswer(
        challenge.type,
        answers,
        challenge.content.solution,
      )

      // Apply hint penalty
      const finalScore = Math.max(0, score - hintsUsed * 5) // 5 points penalty per hint

      // Create attempt record
      const attempt = new ChallengeAttempt({
        user: req.user._id,
        challenge: challengeId,
        answers,
        score: finalScore,
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
      challenge.stats.averageTime = Math.round(
        allAttempts.reduce((sum, att) => sum + att.timeSpent, 0) / allAttempts.length,
      )
      challenge.stats.averageScore = Math.round(
        allAttempts.reduce((sum, att) => sum + att.score, 0) / allAttempts.length,
      )

      await challenge.save()

      // Update user stats if successful
      if (isSuccessful) {
        await User.findByIdAndUpdate(req.user._id, {
          $inc: {
            "stats.totalChallengesCompleted": 1,
            "stats.totalPoints": challenge.points,
          },
          $set: {
            "stats.lastActivityDate": new Date(),
          },
        })
      }

      await req.user.updateActivity()

      res.json({
        message: "Challenge attempt submitted successfully",
        results: {
          score: finalScore,
          originalScore: score,
          isSuccessful,
          feedback,
          pointsEarned: isSuccessful ? challenge.points : 0,
          hintsUsed,
          timeSpent,
          rank: await calculateUserRank(challengeId, finalScore),
        },
      })
    } catch (error) {
      console.error("Submit challenge attempt error:", error)
      res.status(500).json({ message: "Server error submitting challenge attempt" })
    }
  },
)

// Get user's challenge attempts
router.get("/attempts/me", authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, challengeId } = req.query

    const query = { user: req.user._id }
    if (challengeId) query.challenge = challengeId

    const attempts = await ChallengeAttempt.find(query)
      .populate("challenge", "title type difficulty points")
      .sort({ completedAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean()

    const total = await ChallengeAttempt.countDocuments(query)

    res.json({
      attempts,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        total,
      },
    })
  } catch (error) {
    console.error("Get user attempts error:", error)
    res.status(500).json({ message: "Server error fetching attempts" })
  }
})

// Get leaderboard for a challenge
router.get("/:id/leaderboard", [param("id").isMongoId().withMessage("Invalid challenge ID")], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array(),
      })
    }

    const { limit = 10 } = req.query

    const leaderboard = await ChallengeAttempt.aggregate([
      {
        $match: {
          challenge: new mongoose.Types.ObjectId(req.params.id),
          isSuccessful: true,
        },
      },
      {
        $group: {
          _id: "$user",
          bestScore: { $max: "$score" },
          bestTime: { $min: "$timeSpent" },
          attempts: { $sum: 1 },
          lastAttempt: { $max: "$completedAt" },
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
          lastAttempt: 1,
        },
      },
      {
        $sort: { bestScore: -1, bestTime: 1, lastAttempt: 1 },
      },
      {
        $limit: Number(limit),
      },
    ])

    res.json({ leaderboard })
  } catch (error) {
    console.error("Get leaderboard error:", error)
    res.status(500).json({ message: "Server error fetching leaderboard" })
  }
})

// Get challenge statistics
router.get("/:id/stats", [param("id").isMongoId().withMessage("Invalid challenge ID")], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array(),
      })
    }

    const challenge = await Challenge.findById(req.params.id).lean()
    if (!challenge) {
      return res.status(404).json({ message: "Challenge not found" })
    }

    const stats = await ChallengeAttempt.aggregate([
      { $match: { challenge: new mongoose.Types.ObjectId(req.params.id) } },
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          successfulAttempts: { $sum: { $cond: ["$isSuccessful", 1, 0] } },
          averageScore: { $avg: "$score" },
          averageTime: { $avg: "$timeSpent" },
          highestScore: { $max: "$score" },
          lowestTime: { $min: "$timeSpent" },
        },
      },
    ])

    const challengeStats = stats[0] || {
      totalAttempts: 0,
      successfulAttempts: 0,
      averageScore: 0,
      averageTime: 0,
      highestScore: 0,
      lowestTime: 0,
    }

    res.json({
      challenge: {
        id: challenge._id,
        title: challenge.title,
        difficulty: challenge.difficulty,
        points: challenge.points,
      },
      stats: {
        ...challengeStats,
        successRate:
          challengeStats.totalAttempts > 0
            ? Math.round((challengeStats.successfulAttempts / challengeStats.totalAttempts) * 100)
            : 0,
      },
    })
  } catch (error) {
    console.error("Get challenge stats error:", error)
    res.status(500).json({ message: "Server error fetching challenge statistics" })
  }
})

// Helper function to validate challenge answers
function validateChallengeAnswer(type, answers, solution) {
  let score = 0
  let isSuccessful = false
  let feedback = ""

  try {
    switch (type) {
      case "phishing-detection":
        // Compare identified phishing indicators
        const correctIndicators = solution.indicators || []
        const userIndicators = answers.indicators || []

        const correctCount = userIndicators.filter((indicator) => correctIndicators.includes(indicator)).length
        const incorrectCount = userIndicators.length - correctCount

        score = Math.max(0, Math.round((correctCount / correctIndicators.length) * 100 - incorrectCount * 10))
        isSuccessful = score >= 70
        feedback = `You identified ${correctCount} out of ${correctIndicators.length} phishing indicators correctly.`
        if (incorrectCount > 0) {
          feedback += ` You had ${incorrectCount} false positive(s).`
        }
        break

      case "password-strength":
        // Evaluate password strength assessment
        const expectedStrengths = solution.assessments || []
        const userAssessments = answers.assessments || []

        let correctAssessments = 0
        for (let i = 0; i < Math.min(expectedStrengths.length, userAssessments.length); i++) {
          if (expectedStrengths[i] === userAssessments[i]) {
            correctAssessments++
          }
        }

        score = Math.round((correctAssessments / expectedStrengths.length) * 100)
        isSuccessful = score >= 80
        feedback = `You correctly assessed ${correctAssessments} out of ${expectedStrengths.length} passwords.`
        break

      case "network-analysis":
        // Analyze network traffic patterns
        const suspiciousIPs = solution.suspiciousIPs || []
        const userIPs = answers.suspiciousIPs || []

        const correctIPs = userIPs.filter((ip) => suspiciousIPs.includes(ip)).length
        const falsePositives = userIPs.length - correctIPs

        score = Math.max(0, Math.round((correctIPs / suspiciousIPs.length) * 100 - falsePositives * 5))
        isSuccessful = score >= 75
        feedback = `You correctly identified ${correctIPs} out of ${suspiciousIPs.length} suspicious IP addresses.`
        break

      case "malware-identification":
        // Identify malware characteristics
        const expectedType = solution.type
        const userType = answers.type

        score = userType === expectedType ? 100 : 0
        isSuccessful = score === 100
        feedback = score === 100 ? "Correct malware identification!" : `Incorrect. This is ${expectedType} malware.`
        break

      default:
        score = 0
        isSuccessful = false
        feedback = "Unknown challenge type"
    }
  } catch (error) {
    console.error("Error validating challenge answer:", error)
    score = 0
    isSuccessful = false
    feedback = "Error processing your answer. Please try again."
  }

  return { score, isSuccessful, feedback }
}

// Helper function to calculate user rank
async function calculateUserRank(challengeId, userScore) {
  try {
    const betterScores = await ChallengeAttempt.countDocuments({
      challenge: challengeId,
      score: { $gt: userScore },
      isSuccessful: true,
    })
    return betterScores + 1
  } catch (error) {
    console.error("Error calculating rank:", error)
    return null
  }
}

module.exports = router
