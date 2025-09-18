const mongoose = require("mongoose")

const moduleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["phishing", "malware", "passwords", "network", "cryptography", "social-engineering"],
    },
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    estimatedTime: {
      type: Number, // in minutes
      required: true,
    },
    points: {
      type: Number,
      default: 100,
    },
    prerequisites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Module",
      },
    ],
    content: {
      sections: [
        {
          id: String,
          title: String,
          type: {
            type: String,
            enum: ["text", "video", "interactive", "quiz", "lab"],
          },
          content: mongoose.Schema.Types.Mixed,
          order: Number,
        },
      ],
    },
    quiz: {
      questions: [
        {
          id: String,
          question: String,
          type: {
            type: String,
            enum: ["multiple-choice", "true-false", "fill-blank"],
          },
          options: [String],
          correctAnswer: mongoose.Schema.Types.Mixed,
          explanation: String,
          points: { type: Number, default: 10 },
        },
      ],
      passingScore: { type: Number, default: 70 },
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishedAt: Date,
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tags: [String],
    resources: [
      {
        title: String,
        url: String,
        type: {
          type: String,
          enum: ["article", "video", "tool", "documentation"],
        },
      },
    ],
    stats: {
      enrollments: { type: Number, default: 0 },
      completions: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      totalRatings: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  },
)

// Indexes
moduleSchema.index({ slug: 1 })
moduleSchema.index({ category: 1 })
moduleSchema.index({ difficulty: 1 })
moduleSchema.index({ isPublished: 1 })

// Calculate completion rate
moduleSchema.virtual("completionRate").get(function () {
  if (this.stats.enrollments === 0) return 0
  return (this.stats.completions / this.stats.enrollments) * 100
})

module.exports = mongoose.model("Module", moduleSchema)
