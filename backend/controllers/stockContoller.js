const {db} = require("../config/firebase");

// Get real-time stock prices
const getStocks = async (req, res) => {
    try {
      console.log("📦 Fetching stocks...");
  
      const stocksSnapshot = await db.ref("stocks").once("value");
  
      const data = stocksSnapshot.val();
      console.log("✅ Stocks fetched:", data);
  
      res.json(data);
    } catch (error) {
      console.error("❌ Error in getStocks:", error);
      res.status(500).json({ error: "Failed to fetch stocks" });
    }
  };
  

// Get user portfolio
const getUserPortfolio = async (req, res) => {
  try {
    const { userId } = req.params;
    const portfolioSnapshot = await db.ref(`portfolios/${userId}`).once("value");
    let portfolio = portfolioSnapshot.val() || { userId, stocks: [], totalValue: 0, profitLoss: 0 };

    // Get current prices for all stocks in portfolio
    const stocksSnapshot = await db.ref("stocks").once("value");
    const stocksData = stocksSnapshot.val();

    let totalProfitLoss = 0;
    let totalInvestment = 0;

    // Calculate profit/loss for each stock
    portfolio.stocks = portfolio.stocks.map(stock => {
      const currentPrice = stocksData[stock.symbol]?.latest?.price || 0;
      const currentValue = currentPrice * stock.shares;
      const investment = stock.price * stock.shares;
      const profitLoss = currentValue - investment;
      const profitLossPercentage = (profitLoss / investment) * 100;

      totalProfitLoss += profitLoss;
      totalInvestment += investment;

      return {
        ...stock,
        currentPrice,
        currentValue,
        profitLoss,
        profitLossPercentage: profitLossPercentage.toFixed(2)
      };
    });

    // Update portfolio totals
    portfolio.totalValue = portfolio.stocks.reduce((sum, stock) => sum + stock.currentValue, 0);
    portfolio.totalProfitLoss = totalProfitLoss;
    portfolio.totalProfitLossPercentage = totalInvestment > 0 
      ? ((totalProfitLoss / totalInvestment) * 100).toFixed(2)
      : "0.00";

    res.json(portfolio);
  } catch (error) {
    console.error("Error in getUserPortfolio:", error);
    res.status(500).json({ error: "Failed to fetch portfolio", details: error.message });
  }
};

// Get user transactions
const getTransactions = async (req, res) => {
  try {
    const { userId } = req.params;
    const transactionsSnapshot = await db.ref(`transactions/${userId}`).once("value");
    res.json(transactionsSnapshot.val() || []);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
};

const getStockHistory = async (req, res) => {
    const { symbol } = req.params;
    const { from, to } = req.query; // 🆕 get date filters from query params
  
    try {
      const historySnapshot = await db.ref(`stocks/${symbol}/history`).once("value");
      const history = historySnapshot.val();
  
      if (!history) {
        return res.status(404).json({ error: `History not found for ${symbol}` });
      }
  
      // 🧠 Filter based on from/to if provided
      const filteredHistory = {};
      for (const date in history) {
        if (
          (!from || date >= from) &&
          (!to || date <= to)
        ) {
          filteredHistory[date] = history[date];
        }
      }
  
      res.json({ symbol, history: filteredHistory });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stock history", details: error.message });
    }
  };
  

  const getLatestStockPrice = async (req, res) => {
    const { symbol } = req.params;
    try {
      const latestSnapshot = await db.ref(`stocks/${symbol}/latest`).once("value");
      const latest = latestSnapshot.val();
  
      if (!latest) {
        return res.status(404).json({ error: `Latest data not found for ${symbol}` });
      }
  
      res.json({ symbol, latest });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch latest stock data", details: error.message });
    }
  };

  const getAllLatestStockPrices = async (req, res) => {
    try {
      const stocksSnapshot = await db.ref("stocks").once("value");
      const stocksData = stocksSnapshot.val();
  
      if (!stocksData) {
        return res.status(404).json({ error: "No stock data found" });
      }
  
      const latestPrices = {};
      const gainLossData = {};
  
      for (const symbol in stocksData) {
        if (stocksData[symbol].latest) {
          const latest = stocksData[symbol].latest;
          const history = stocksData[symbol].history || {};
          
          // Get the first historical price for gain/loss calculation
          const firstDate = Object.keys(history).sort()[0];
          const firstPrice = firstDate ? history[firstDate].close : latest.price;
          
          const priceChange = latest.price - firstPrice;
          const percentChange = (priceChange / firstPrice) * 100;
  
          latestPrices[symbol] = {
            ...latest,
            priceChange,
            percentChange: percentChange.toFixed(2),
            direction: priceChange > 0 ? 'gain' : priceChange < 0 ? 'loss' : 'no change'
          };
  
          gainLossData[symbol] = {
            change: priceChange.toFixed(2),
            percentChange: percentChange.toFixed(2),
            direction: priceChange > 0 ? 'gain' : priceChange < 0 ? 'loss' : 'no change'
          };
        }
      }
  
      res.json({
        latestPrices,
        gainLoss: gainLossData
      });
    } catch (error) {
      console.error("Error in getAllLatestStockPrices:", error);
      res.status(500).json({ error: "Failed to fetch latest stock prices", details: error.message });
    }
  };

  const getAllHistoricalStockPrices = async (req, res) => {
    try {
      const { from, to } = req.query;
      console.log("📊 Fetching historical data with params:", { from, to });

      const stocksSnapshot = await db.ref("stocks").once("value");
      const stocksData = stocksSnapshot.val();

      if (!stocksData) {
        console.log("❌ No stock data found in Firebase");
        return res.status(404).json({ error: "No stock data found" });
      }

      console.log("📈 Found stocks:", Object.keys(stocksData));

      const historyData = {};
      const gainLossData = {};

      for (const symbol in stocksData) {
        const history = stocksData[symbol].history || {};
        const formattedHistory = {};

        // Get the latest price for gain/loss calculation
        const latestPrice = stocksData[symbol].latest?.price || 0;
        console.log(`💰 ${symbol} - Latest price:`, latestPrice);

        // Convert the history object to the expected format
        for (const date in history) {
          if (
            (!from || date >= from) &&
            (!to || date <= to)
          ) {
            // Extract the actual price data from the nested structure
            const priceData = history[date].close || history[date];
            formattedHistory[date] = {
              open: typeof priceData === 'object' ? priceData.open : priceData,
              high: typeof priceData === 'object' ? priceData.high : priceData,
              low: typeof priceData === 'object' ? priceData.low : priceData,
              close: typeof priceData === 'object' ? priceData.close : priceData,
              volume: typeof priceData === 'object' ? priceData.volume : 0
            };
          }
        }

        console.log(`📅 ${symbol} - Historical data points:`, Object.keys(formattedHistory).length);

        // Calculate gain/loss if we have historical data
        if (Object.keys(formattedHistory).length > 0) {
          const firstDate = Object.keys(formattedHistory).sort()[0];
          const firstPrice = formattedHistory[firstDate].close;
          const priceChange = latestPrice - firstPrice;
          const percentChange = (priceChange / firstPrice) * 100;

          gainLossData[symbol] = {
            change: priceChange.toFixed(2),
            percentChange: percentChange.toFixed(2),
            direction: priceChange > 0 ? 'gain' : priceChange < 0 ? 'loss' : 'no change'
          };
        }

        historyData[symbol] = formattedHistory;
      }

      const response = {
        history: historyData,
        gainLoss: gainLossData
      };

      console.log("✅ Sending response with data for symbols:", Object.keys(historyData));
      res.json(response);
    } catch (error) {
      console.error("❌ Error in getAllHistoricalStockPrices:", error);
      res.status(500).json({ error: "Failed to fetch historical stock prices", details: error.message });
    }
  };
  

// Buy stock (uses stocks/{symbol}/latest/price)
const buyStock = async (req, res) => {
  try {
    const { userId, symbol, shares } = req.body;

    // Validate input
    if (!userId || !symbol || !shares || shares <= 0) {
      return res.status(400).json({ error: "Invalid input parameters" });
    }

    // ✅ Get current price from latest node
    const latestPriceSnapshot = await db.ref(`stocks/${symbol}/latest/price`).once("value");
    const currentPrice = latestPriceSnapshot.val();

    if (!currentPrice) {
      return res.status(400).json({ error: `Price not available for ${symbol}` });
    }

    const totalCost = currentPrice * shares;

    // 🔐 Check user balance
    const userSnapshot = await db.ref(`users/${userId}`).once("value");
    const user = userSnapshot.val();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.balance < totalCost) {
      return res.status(400).json({ error: "Insufficient funds" });
    }

    const newBalance = user.balance - totalCost;
    await db.ref(`users/${userId}`).update({ balance: newBalance });

    // 💼 Update portfolio
    const portfolioRef = db.ref(`portfolios/${userId}`);
    const portfolioSnapshot = await portfolioRef.once("value");
    let portfolio = portfolioSnapshot.val() || { userId, stocks: [], totalValue: 0, profitLoss: 0 };

    const existingStock = portfolio.stocks.find((s) => s.symbol === symbol);
    if (existingStock) {
      existingStock.shares += shares;
    } else {
      portfolio.stocks.push({ symbol, shares, price: currentPrice });
    }

    portfolio.totalValue += totalCost;
    await portfolioRef.set(portfolio);

    // 🧾 Save transaction
    const transaction = {
      id: Date.now().toString(),
      userId,
      symbol,
      type: "buy",
      shares,
      price: currentPrice,
      total: totalCost,
      date: new Date().toISOString(),
    };

    await db.ref(`transactions/${userId}`).push(transaction);

    // Return success response with all updated data
    res.status(200).json({
      success: true,
      message: "Stock purchase successful",
      data: {
        updatedPortfolio: portfolio,
        updatedTransactions: transaction,
        newBalance,
        stock: {
          symbol,
          shares,
          price: currentPrice,
          totalCost
        }
      }
    });
  } catch (error) {
    console.error("Error in buyStock:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to buy stock", 
      details: error.message 
    });
  }
};

// Placeholder for sellStock logic
const sellStock = async (req, res) => {
  try {
    const { userId, symbol, shares } = req.body;

    // Get current price
    const latestPriceSnapshot = await db.ref(`stocks/${symbol}/latest/price`).once("value");
    const currentPrice = latestPriceSnapshot.val();

    if (!currentPrice) {
      return res.status(400).json({ error: `Price not available for ${symbol}` });
    }

    // Get user portfolio
    const portfolioRef = db.ref(`portfolios/${userId}`);
    const portfolioSnapshot = await portfolioRef.once("value");
    const portfolio = portfolioSnapshot.val();

    if (!portfolio) {
      return res.status(400).json({ error: "Portfolio not found" });
    }

    // Find the stock in portfolio
    const stockIndex = portfolio.stocks.findIndex(s => s.symbol === symbol);
    if (stockIndex === -1) {
      return res.status(400).json({ error: `Stock ${symbol} not found in portfolio` });
    }

    const stock = portfolio.stocks[stockIndex];
    if (stock.shares < shares) {
      return res.status(400).json({ error: "Insufficient shares to sell" });
    }

    // Calculate sale value
    const saleValue = currentPrice * shares;
    
    // Update user balance
    const userRef = db.ref(`users/${userId}`);
    const userSnapshot = await userRef.once("value");
    const user = userSnapshot.val();
    
    const newBalance = user.balance + saleValue;
    await userRef.update({ balance: newBalance });

    // Update portfolio
    stock.shares -= shares;
    if (stock.shares === 0) {
      portfolio.stocks.splice(stockIndex, 1);
    }
    
    portfolio.totalValue -= saleValue;
    await portfolioRef.set(portfolio);

    // Save transaction
    const transaction = {
      id: Date.now().toString(),
      userId,
      symbol,
      type: "sell",
      shares,
      price: currentPrice,
      total: saleValue,
      date: new Date().toISOString(),
      status: "completed"
    };

    await db.ref(`transactions/${userId}`).push(transaction);

    res.json({ 
      updatedPortfolio: portfolio, 
      updatedTransactions: transaction, 
      newBalance 
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to sell stock", details: error.message });
  }
};

// Add prediction endpoint
const getStockPrediction = async (req, res) => {
  try {
    const { symbol, future_days } = req.body;
    
    // This is a placeholder for actual ML prediction
    // In a real implementation, you would call your ML service here
    const currentPriceSnapshot = await db.ref(`stocks/${symbol}/latest/price`).once("value");
    const currentPrice = currentPriceSnapshot.val();
    
    if (!currentPrice) {
      return res.status(404).json({ error: `Price not found for ${symbol}` });
    }

    // Generate some dummy predictions
    const predictedPrices = Array.from({ length: future_days }, (_, i) => {
      const randomChange = (Math.random() - 0.5) * 0.1; // Random change between -5% and +5%
      return currentPrice * (1 + randomChange);
    });

    res.json({
      predicted_prices: predictedPrices
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get prediction", details: error.message });
  }
};

module.exports = { getStocks, getUserPortfolio, getTransactions, buyStock, sellStock, getStockHistory, getLatestStockPrice, getAllLatestStockPrices, getAllHistoricalStockPrices, getStockPrediction };
