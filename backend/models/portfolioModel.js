const { db } = require("../config/firebase");

// Get user portfolio from Realtime Database
const getUserPortfolio = async (userId) => {
  const snapshot = await db.ref(`portfolios/${userId}`).once("value");
  return snapshot.exists() ? snapshot.val() : { stocks: [] };
};

// Update user portfolio in Realtime Database
const updateUserPortfolio = async (userId, portfolioData) => {
  await db.ref(`portfolios/${userId}`).update(portfolioData);
};

module.exports = { getUserPortfolio, updateUserPortfolio };
