const express = require("express")
const { body, validationResult, param } = require("express-validator")
const Module = require("../models/Module")
const Progress = require("../models/Progress")
const jwt = require("jsonwebtoken") // Import jwt
const { authMiddleware, instructorAuth } = require("../middleware/authMiddleware")

const router = express.Router()

// Get all modules with filtering and pagination
router.get("/", async (req, res) => {
  try {
    const { category, difficulty, search, page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc" } = req.query

    const query = { isPublished: true }

    // Apply filters
    if (category) query.category = category
    if (difficulty) query.difficulty = difficulty
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ]
    }

    // Build sort object
    const sort = {}
    sort[sortBy] = sortOrder === "asc" ? 1 : -1

    const modules = await Module.find(query)
      .populate("author", "firstName lastName username")
      .sort(sort)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean()

    const total = await Module.countDocuments(query)

    // If user is authenticated, get their progress for each module
    let userProgress = {}
    if (req.header("Authorization")) {
      try {
        const token = req.header("Authorization").replace("Bearer ", "")
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        const progressRecords = await Progress.find({
          user: decoded.userId,
          module: { $in: modules.map((m) => m._id) },
        }).lean()

        userProgress = progressRecords.reduce((acc, progress) => {
          acc[progress.module.toString()] = progress
          return acc
        }, {})
      } catch (err) {
        // Token invalid, continue without progress
      }
    }

    // Add progress to modules
    const modulesWithProgress = modules.map((module) => ({
      ...module,
      userProgress: userProgress[module._id.toString()] || null,
    }))

    res.json({
      modules: modulesWithProgress,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalModules: total,
        hasNext: Number(page) < Math.ceil(total / Number(limit)),
        hasPrev: Number(page) > 1,
      },
    })
  } catch (error) {
    console.error("Get modules error:", error)
    res.status(500).json({ message: "Server error fetching modules" })
  }
})

// Get single module by slug
router.get("/:slug", async (req, res) => {
  try {
    const module = await Module.findOne({
      slug: req.params.slug,
      isPublished: true,
    })
      .populate("author", "firstName lastName username")
      .lean()

    if (!module) {
      return res.status(404).json({ message: "Module not found" })
    }

    // If user is authenticated, get their progress
    let userProgress = null
    if (req.header("Authorization")) {
      try {
        const token = req.header("Authorization").replace("Bearer ", "")
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        userProgress = await Progress.findOne({
          user: decoded.userId,
          module: module._id,
        }).lean()
      } catch (err) {
        // Token invalid, continue without progress
      }
    }

    res.json({
      module: {
        ...module,
        userProgress,
      },
    })
  } catch (error) {
    console.error("Get module error:", error)
    res.status(500).json({ message: "Server error fetching module" })
  }
})

// Create module (instructor/admin only)
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
    body("category")
      .isIn(["phishing", "malware", "passwords", "network", "cryptography", "social-engineering"])
      .withMessage("Invalid category"),
    body("difficulty")
      .optional()
      .isIn(["beginner", "intermediate", "advanced"])
      .withMessage("Invalid difficulty level"),
    body("estimatedTime").isInt({ min: 1, max: 300 }).withMessage("Estimated time must be 1-300 minutes"),
    body("points").optional().isInt({ min: 10, max: 1000 }).withMessage("Points must be 10-1000"),
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

      const { title, description, category, difficulty, estimatedTime, content, quiz, tags, points } = req.body

      // Generate slug from title
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")

      // Check if slug already exists
      const existingModule = await Module.findOne({ slug })
      if (existingModule) {
        return res.status(400).json({ message: "A module with this title already exists" })
      }

      const module = new Module({
        title,
        slug,
        description,
        category,
        difficulty: difficulty || "beginner",
        estimatedTime,
        points: points || 100,
        content: content || { sections: [] },
        quiz: quiz || { questions: [], passingScore: 70 },
        tags: tags || [],
        author: req.user._id,
      })

      await module.save()
      await module.populate("author", "firstName lastName username")

      res.status(201).json({
        message: "Module created successfully",
        module,
      })
    } catch (error) {
      console.error("Create module error:", error)
      res.status(500).json({ message: "Server error creating module" })
    }
  },
)

// Update module
router.put("/:id", instructorAuth, [param("id").isMongoId().withMessage("Invalid module ID")], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array(),
      })
    }

    const module = await Module.findById(req.params.id)

    if (!module) {
      return res.status(404).json({ message: "Module not found" })
    }

    // Check if user is the author or admin
    if (module.author.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to update this module" })
    }

    const updatedModule = await Module.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true },
    ).populate("author", "firstName lastName username")

    res.json({
      message: "Module updated successfully",
      module: updatedModule,
    })
  } catch (error) {
    console.error("Update module error:", error)
    res.status(500).json({ message: "Server error updating module" })
  }
})

// Delete module
router.delete("/:id", instructorAuth, [param("id").isMongoId().withMessage("Invalid module ID")], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array(),
      })
    }

    const module = await Module.findById(req.params.id)

    if (!module) {
      return res.status(404).json({ message: "Module not found" })
    }

    // Check if user is the author or admin
    if (module.author.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to delete this module" })
    }

    await Module.findByIdAndDelete(req.params.id)

    // Also delete all progress records for this module
    await Progress.deleteMany({ module: req.params.id })

    res.json({ message: "Module deleted successfully" })
  } catch (error) {
    console.error("Delete module error:", error)
    res.status(500).json({ message: "Server error deleting module" })
  }
})

// Enroll in module
router.post(
  "/:id/enroll",
  authMiddleware,
  [param("id").isMongoId().withMessage("Invalid module ID")],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const module = await Module.findById(req.params.id)

      if (!module || !module.isPublished) {
        return res.status(404).json({ message: "Module not found or not published" })
      }

      // Check if already enrolled
      const existingProgress = await Progress.findOne({
        user: req.user._id,
        module: req.params.id,
      })

      if (existingProgress) {
        return res.status(400).json({
          message: "Already enrolled in this module",
          progress: existingProgress,
        })
      }

      // Create progress record
      const progress = new Progress({
        user: req.user._id,
        module: req.params.id,
        status: "in-progress",
        startedAt: new Date(),
      })

      await progress.save()

      // Update module enrollment stats
      module.stats.enrollments += 1
      await module.save()

      // Update user activity
      await req.user.updateActivity()

      res.json({
        message: "Enrolled successfully",
        progress,
      })
    } catch (error) {
      console.error("Enroll error:", error)
      res.status(500).json({ message: "Server error during enrollment" })
    }
  },
)

// Get module categories
router.get("/meta/categories", async (req, res) => {
  try {
    const categories = await Module.distinct("category", { isPublished: true })
    const categoryStats = await Module.aggregate([
      { $match: { isPublished: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])

    res.json({
      categories,
      stats: categoryStats,
    })
  } catch (error) {
    console.error("Get categories error:", error)
    res.status(500).json({ message: "Server error fetching categories" })
  }
})

module.exports = router
