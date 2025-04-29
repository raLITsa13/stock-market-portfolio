const { getUserPortfolio, updateUserPortfolio } = require("../models/portfolioModel");

// Get user's portfolio
exports.getPortfolio = async (req, res) => {
  try {
    const userId = req.user.uid;
    const portfolio = await getUserPortfolio(userId);
    res.json({ success: true, portfolio });
  } catch (error) {
    res.status(500).json({ message: "Error fetching portfolio", error: error.message });
  }
};

// Add stock to portfolio
exports.addStock = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { symbol, quantity, price } = req.body;

    const portfolio = await getUserPortfolio(userId);
    portfolio.stocks.push({ symbol, quantity, price, date: new Date().toISOString() });

    await updateUserPortfolio(userId, portfolio);
    res.json({ success: true, message: "Stock added successfully", portfolio });
  } catch (error) {
    res.status(500).json({ message: "Error adding stock", error: error.message });
  }
};

// Remove stock from portfolio
exports.removeStock = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { symbol } = req.body;

    let portfolio = await getUserPortfolio(userId);
    portfolio.stocks = portfolio.stocks.filter(stock => stock.symbol !== symbol);

    await updateUserPortfolio(userId, portfolio);
    res.json({ success: true, message: "Stock removed successfully", portfolio });
  } catch (error) {
    res.status(500).json({ message: "Error removing stock", error: error.message });
  }
};