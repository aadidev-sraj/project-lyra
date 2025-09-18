const mongoose = require("mongoose")

const challengeAttemptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    challenge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Challenge",
      required: true,
    },
    answers: mongoose.Schema.Types.Mixed,
    score: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    timeSpent: {
      type: Number, // in seconds
      required: true,
    },
    isSuccessful: {
      type: Boolean,
      required: true,
    },
    hintsUsed: {
      type: Number,
      default: 0,
    },
    feedback: String,
    startedAt: {
      type: Date,
      required: true,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// Indexes
challengeAttemptSchema.index({ user: 1, challenge: 1 })
challengeAttemptSchema.index({ user: 1, completedAt: -1 })
challengeAttemptSchema.index({ challenge: 1, isSuccessful: 1 })

module.exports = mongoose.model("ChallengeAttempt", challengeAttemptSchema)
