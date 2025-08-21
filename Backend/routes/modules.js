const express = require("express")
const { body, validationResult } = require("express-validator")
const Module = require("../models/Module")
const Progress = require("../models/Progress")
const jwt = require("jsonwebtoken") // Import jwt
const { auth, instructorAuth } = require("../middleware/auth")

const router = express.Router()

// Get all modules
router.get("/", async (req, res) => {
  try {
    const { category, difficulty, search, page = 1, limit = 10 } = req.query

    const query = { isPublished: true }

    if (category) query.category = category
    if (difficulty) query.difficulty = difficulty
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ]
    }

    const modules = await Module.find(query)
      .populate("author", "firstName lastName")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Module.countDocuments(query)

    res.json({
      modules,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    })
  } catch (error) {
    console.error("Get modules error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get single module
router.get("/:slug", async (req, res) => {
  try {
    const module = await Module.findOne({
      slug: req.params.slug,
      isPublished: true,
    }).populate("author", "firstName lastName")

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
        })
      } catch (err) {
        // Token invalid, continue without progress
      }
    }

    res.json({ module, userProgress })
  } catch (error) {
    console.error("Get module error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Create module (instructor/admin only)
router.post(
  "/",
  instructorAuth,
  [
    body("title").notEmpty().trim().escape(),
    body("description").notEmpty().trim(),
    body("category").isIn(["phishing", "malware", "passwords", "network", "cryptography", "social-engineering"]),
    body("estimatedTime").isInt({ min: 1 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { title, description, category, difficulty, estimatedTime, content, quiz, tags } = req.body

      // Generate slug from title
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")

      // Check if slug already exists
      const existingModule = await Module.findOne({ slug })
      if (existingModule) {
        return res.status(400).json({ message: "Module with this title already exists" })
      }

      const module = new Module({
        title,
        slug,
        description,
        category,
        difficulty,
        estimatedTime,
        content,
        quiz,
        tags,
        author: req.user._id,
      })

      await module.save()
      await module.populate("author", "firstName lastName")

      res.status(201).json({ message: "Module created successfully", module })
    } catch (error) {
      console.error("Create module error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Update module
router.put("/:id", instructorAuth, async (req, res) => {
  try {
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
    ).populate("author", "firstName lastName")

    res.json({ message: "Module updated successfully", module: updatedModule })
  } catch (error) {
    console.error("Update module error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete module
router.delete("/:id", instructorAuth, async (req, res) => {
  try {
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
    res.status(500).json({ message: "Server error" })
  }
})

// Enroll in module
router.post("/:id/enroll", auth, async (req, res) => {
  try {
    const module = await Module.findById(req.params.id)

    if (!module || !module.isPublished) {
      return res.status(404).json({ message: "Module not found" })
    }

    // Check if already enrolled
    const existingProgress = await Progress.findOne({
      user: req.user._id,
      module: req.params.id,
    })

    if (existingProgress) {
      return res.status(400).json({ message: "Already enrolled in this module" })
    }

    // Create progress record
    const progress = new Progress({
      user: req.user._id,
      module: req.params.id,
      status: "in-progress",
    })

    await progress.save()

    // Update module enrollment stats
    module.stats.enrollments += 1
    await module.save()

    res.json({ message: "Enrolled successfully", progress })
  } catch (error) {
    console.error("Enroll error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
