const mongoose = require("mongoose")

const progressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true,
    },
    status: {
      type: String,
      enum: ["not-started", "in-progress", "completed"],
      default: "not-started",
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    sectionsCompleted: [
      {
        sectionId: String,
        completedAt: { type: Date, default: Date.now },
      },
    ],
    quizAttempts: [
      {
        attemptNumber: Number,
        score: Number,
        answers: [
          {
            questionId: String,
            answer: mongoose.Schema.Types.Mixed,
            isCorrect: Boolean,
            timeSpent: Number, // in seconds
          },
        ],
        timeSpent: Number, // total time in seconds
        completedAt: { type: Date, default: Date.now },
      },
    ],
    bestQuizScore: {
      type: Number,
      default: 0,
    },
    timeSpent: {
      type: Number, // total time in seconds
      default: 0,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: Date,
    certificateIssued: {
      type: Boolean,
      default: false,
    },
    certificateId: String,
    notes: String,
    bookmarks: [
      {
        sectionId: String,
        note: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  },
)

// Compound indexes
progressSchema.index({ user: 1, module: 1 }, { unique: true })
progressSchema.index({ user: 1, status: 1 })
progressSchema.index({ module: 1, status: 1 })

// Calculate completion percentage
progressSchema.methods.calculateProgress = function (totalSections) {
  if (!totalSections || totalSections === 0) return 0
  return Math.round((this.sectionsCompleted.length / totalSections) * 100)
}

// Check if quiz is passed
progressSchema.methods.isQuizPassed = function (passingScore = 70) {
  return this.bestQuizScore >= passingScore
}

module.exports = mongoose.model("Progress", progressSchema)
