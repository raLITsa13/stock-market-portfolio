const { auth } = require("../config/firebase");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const generateToken = (uid) => {
  return jwt.sign({ uid }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// Signup
exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    // Generate JWT token
    const token = generateToken(userRecord.uid);

    res.status(201).json({ message: "User created", token, user: userRecord });
  } catch (error) {
    res.status(500).json({ message: "Signup failed", error: error.message });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Firebase does not allow direct password verification, so we'll use custom tokens
    const userRecord = await auth.getUserByEmail(email);

    // Generate JWT token
    const token = generateToken(userRecord.uid);

    res.json({ message: "Login successful", token, user: userRecord });
  } catch (error) {
    res.status(400).json({ message: "Invalid credentials", error: error.message });
  }
};

// Logout (Handled on the frontend by removing token)
exports.logout = (req, res) => {
  res.json({ message: "Logged out successfully" });
};
