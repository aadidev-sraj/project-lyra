const mongoose = require("mongoose")

const activitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    page: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    sessionId: {
      type: String,
      index: true,
    },
    userAgent: String,
    ipAddress: String,
    duration: Number, // For time-based activities
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Compound indexes for efficient queries
activitySchema.index({ user: 1, timestamp: -1 })
activitySchema.index({ user: 1, action: 1, timestamp: -1 })
activitySchema.index({ action: 1, timestamp: -1 })

// TTL index to automatically delete old activities after 90 days
activitySchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 }) // 90 days

// Static methods for common queries
activitySchema.statics.getUserActivities = function (userId, options = {}) {
  const { limit = 50, skip = 0, action, startDate, endDate } = options

  const query = { user: userId }

  if (action) query.action = action
  if (startDate || endDate) {
    query.timestamp = {}
    if (startDate) query.timestamp.$gte = new Date(startDate)
    if (endDate) query.timestamp.$lte = new Date(endDate)
  }

  return this.find(query).sort({ timestamp: -1 }).limit(limit).skip(skip).lean()
}

activitySchema.statics.getActivityStats = function (userId, timeframe = "7d") {
  const now = new Date()
  let startDate

  switch (timeframe) {
    case "1d":
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      break
    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case "30d":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  }

  return this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        timestamp: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: "$action",
        count: { $sum: 1 },
        lastActivity: { $max: "$timestamp" },
        totalDuration: { $sum: "$duration" },
      },
    },
    {
      $sort: { count: -1 },
    },
  ])
}

module.exports = mongoose.model("Activity", activitySchema)
