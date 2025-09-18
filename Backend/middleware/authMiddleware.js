const jwt = require("jsonwebtoken")
const User = require("../models/User")

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      })
    }

    const token = authHeader.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId).select("-password")

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Token is not valid - user not found.",
      })
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account has been deactivated.",
      })
    }

    // Attach full user object to request
    req.user = user
    next()
  } catch (error) {
    console.error("❌ Auth middleware error:", error.message)

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token.",
      })
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired.",
      })
    }

    res.status(401).json({
      success: false,
      message: "Token verification failed.",
    })
  }
}

const adminAuth = async (req, res, next) => {
  try {
    await authMiddleware(req, res, () => {
      if (req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Admin access required.",
        })
      }
      next()
    })
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Authorization failed.",
    })
  }
}

const instructorAuth = async (req, res, next) => {
  try {
    await authMiddleware(req, res, () => {
      if (req.user.role !== "instructor" && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Instructor or admin access required.",
        })
      }
      next()
    })
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Authorization failed.",
    })
  }
}

module.exports = { authMiddleware, adminAuth, instructorAuth }
