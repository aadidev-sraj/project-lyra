const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const User = require("../models/User")
const Module = require("../models/Module")
const Challenge = require("../models/Challenge")
require("dotenv").config()

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("Connected to MongoDB for seeding...")

    // Clear existing data
    await User.deleteMany({})
    await Module.deleteMany({})
    await Challenge.deleteMany({})

    // Create admin user
    const adminUser = new User({
      username: "admin",
      email: "admin@projectlyra.com",
      password: "admin123",
      firstName: "System",
      lastName: "Administrator",
      role: "admin",
      isEmailVerified: true,
    })
    await adminUser.save()

    // Create instructor user
    const instructorUser = new User({
      username: "instructor",
      email: "instructor@projectlyra.com",
      password: "instructor123",
      firstName: "John",
      lastName: "Instructor",
      role: "instructor",
      isEmailVerified: true,
    })
    await instructorUser.save()

    // Create sample modules
    const phishingModule = new Module({
      title: "Phishing Detection Fundamentals",
      slug: "phishing-detection-fundamentals",
      description: "Learn to identify and defend against phishing attacks",
      category: "phishing",
      difficulty: "beginner",
      estimatedTime: 45,
      points: 100,
      content: {
        sections: [
          {
            id: "intro",
            title: "Introduction to Phishing",
            type: "text",
            content: "Phishing is a cybercrime where attackers impersonate legitimate entities...",
            order: 1,
          },
          {
            id: "types",
            title: "Types of Phishing Attacks",
            type: "interactive",
            content: "Learn about different phishing attack vectors...",
            order: 2,
          },
        ],
      },
      quiz: {
        questions: [
          {
            id: "q1",
            question: "What is the primary goal of phishing attacks?",
            type: "multiple-choice",
            options: [
              "To steal sensitive information",
              "To crash computer systems",
              "To spread viruses",
              "To slow down networks",
            ],
            correctAnswer: "To steal sensitive information",
            explanation:
              "Phishing attacks primarily aim to steal sensitive information like passwords and personal data.",
            points: 10,
          },
        ],
        passingScore: 70,
      },
      isPublished: true,
      publishedAt: new Date(),
      author: instructorUser._id,
      tags: ["phishing", "email-security", "social-engineering"],
    })
    await phishingModule.save()

    const malwareModule = new Module({
      title: "Malware Analysis Basics",
      slug: "malware-analysis-basics",
      description: "Understanding different types of malware and analysis techniques",
      category: "malware",
      difficulty: "intermediate",
      estimatedTime: 60,
      points: 150,
      content: {
        sections: [
          {
            id: "intro",
            title: "What is Malware?",
            type: "text",
            content: "Malware is malicious software designed to harm computer systems...",
            order: 1,
          },
        ],
      },
      quiz: {
        questions: [
          {
            id: "q1",
            question: "Which of the following is NOT a type of malware?",
            type: "multiple-choice",
            options: ["Virus", "Trojan", "Firewall", "Ransomware"],
            correctAnswer: "Firewall",
            explanation: "A firewall is a security tool, not malware.",
            points: 10,
          },
        ],
        passingScore: 70,
      },
      isPublished: true,
      publishedAt: new Date(),
      author: instructorUser._id,
      tags: ["malware", "analysis", "security"],
    })
    await malwareModule.save()

    // Create sample challenges
    const phishingChallenge = new Challenge({
      title: "Spot the Phishing Email",
      description: "Analyze this email and identify phishing indicators",
      type: "phishing-detection",
      difficulty: "easy",
      points: 50,
      timeLimit: 300,
      content: {
        scenario: "You received this email claiming to be from your bank...",
        data: {
          email: {
            from: "security@bank-update.com",
            subject: "Urgent: Account Verification Required",
            body: "Your account will be suspended unless you verify immediately...",
          },
        },
        hints: ["Check the sender domain carefully", "Look for urgent language", "Examine any links in the email"],
        solution: {
          indicators: ["suspicious-domain", "urgent-language", "generic-greeting"],
        },
      },
      category: "phishing",
      tags: ["email", "detection", "analysis"],
      author: instructorUser._id,
    })
    await phishingChallenge.save()

    console.log("Sample data seeded successfully!")
    console.log("Admin credentials: admin@projectlyra.com / admin123")
    console.log("Instructor credentials: instructor@projectlyra.com / instructor123")

    process.exit(0)
  } catch (error) {
    console.error("Seeding error:", error)
    process.exit(1)
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedData()
}

module.exports = seedData
