const express = require("express")
const { body, validationResult } = require("express-validator")
const User = require("../models/User")
const { auth, adminAuth } = require("../middleware/auth")

const router = express.Router()

// Get user profile
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password")
    res.json({ user })
  } catch (error) {
    console.error("Get profile error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Update user profile
router.put(
  "/profile",
  auth,
  [
    body("firstName").optional().trim().escape(),
    body("lastName").optional().trim().escape(),
    body("email").optional().isEmail().normalizeEmail(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { firstName, lastName, email, preferences } = req.body
      const updateData = {}

      if (firstName) updateData.firstName = firstName
      if (lastName) updateData.lastName = lastName
      if (email) updateData.email = email
      if (preferences) updateData.preferences = { ...req.user.preferences, ...preferences }

      // Check if email is already taken by another user
      if (email && email !== req.user.email) {
        const existingUser = await User.findOne({ email })
        if (existingUser) {
          return res.status(400).json({ message: "Email already in use" })
        }
      }

      const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true, runValidators: true }).select(
        "-password",
      )

      res.json({ message: "Profile updated successfully", user })
    } catch (error) {
      console.error("Update profile error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Change password
router.put(
  "/password",
  auth,
  [body("currentPassword").exists(), body("newPassword").isLength({ min: 6 })],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { currentPassword, newPassword } = req.body

      const user = await User.findById(req.user._id)
      const isMatch = await user.comparePassword(currentPassword)

      if (!isMatch) {
        return res.status(400).json({ message: "Current password is incorrect" })
      }

      user.password = newPassword
      await user.save()

      res.json({ message: "Password updated successfully" })
    } catch (error) {
      console.error("Change password error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Get all users (admin only)
router.get("/", adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role } = req.query

    const query = {}
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ]
    }
    if (role) query.role = role

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await User.countDocuments(query)

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    })
  } catch (error) {
    console.error("Get users error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Update user role (admin only)
router.put("/:id/role", adminAuth, [body("role").isIn(["student", "instructor", "admin"])], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { role } = req.body

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true, runValidators: true }).select(
      "-password",
    )

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json({ message: "User role updated successfully", user })
  } catch (error) {
    console.error("Update user role error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Deactivate user (admin only)
router.put("/:id/deactivate", adminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true }).select("-password")

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json({ message: "User deactivated successfully", user })
  } catch (error) {
    console.error("Deactivate user error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Activate user (admin only)
router.put("/:id/activate", adminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true }).select("-password")

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json({ message: "User activated successfully", user })
  } catch (error) {
    console.error("Activate user error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
