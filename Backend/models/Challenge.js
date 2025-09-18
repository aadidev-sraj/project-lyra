const mongoose = require("mongoose")

const challengeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["phishing-detection", "password-strength", "network-analysis", "malware-identification"],
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "easy",
    },
    points: {
      type: Number,
      required: true,
      min: 10,
    },
    timeLimit: {
      type: Number, // in seconds
      default: 300, // 5 minutes
    },
    content: {
      scenario: String,
      data: mongoose.Schema.Types.Mixed, // Challenge-specific data
      hints: [String],
      solution: mongoose.Schema.Types.Mixed,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    category: {
      type: String,
      required: true,
    },
    tags: [String],
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    stats: {
      attempts: { type: Number, default: 0 },
      successes: { type: Number, default: 0 },
      averageTime: { type: Number, default: 0 },
      averageScore: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  },
)

// Indexes
challengeSchema.index({ type: 1 })
challengeSchema.index({ difficulty: 1 })
challengeSchema.index({ category: 1 })
challengeSchema.index({ isActive: 1 })

// Calculate success rate
challengeSchema.virtual("successRate").get(function () {
  if (this.stats.attempts === 0) return 0
  return (this.stats.successes / this.stats.attempts) * 100
})

module.exports = mongoose.model("Challenge", challengeSchema)
