const express = require('express');
const router = express.Router();
const {
  getStocks,
  getUserPortfolio,
  getTransactions,
  buyStock,
  sellStock,
  getStockHistory,
  getLatestStockPrice,
  getAllLatestStockPrices,
  getAllHistoricalStockPrices,
  getStockPrediction
} = require('../controllers/stockContoller');

// Get all stocks
router.get('/stocks', getStocks);

// Get user portfolio
router.get('/portfolio/:userId', getUserPortfolio);

// Get user transactions
router.get('/transactions/:userId', getTransactions);

// Buy stock
router.post('/buy', buyStock);

// Sell stock
router.post('/sell', sellStock);

// Get stock history
router.get('/stocks/:symbol/history', getStockHistory);

// Get latest stock price
router.get('/stocks/:symbol/latest', getLatestStockPrice);

// Get all latest stock prices
router.get('/stocks/latest', getAllLatestStockPrices);

// Get all historical stock prices
router.get('/stocks/history', getAllHistoricalStockPrices);

// Get stock prediction
router.post('/predict', getStockPrediction);

module.exports = router;
