const yahooFinance = require("yahoo-finance2").default; // Make sure you imported this!
const { db } = require("../config/firebase");

const stockSymbols = ["AAPL", "GOOGL", "TSLA", "AMZN", "MSFT"];

const fetchAndStoreHistoricalData = async () => {
  for (const symbol of stockSymbols) {
    try {
      const startDate = new Date("2025-04-05"); // You have data till 4th
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1); // safer to fetch till yesterday

      const chartData = await yahooFinance.chart(symbol, {
        period1: Math.floor(startDate.getTime() / 1000),
        period2: Math.floor(endDate.getTime() / 1000),
        interval: "1d",
      });

      const quotes = chartData.quotes;

      if (!quotes || quotes.length === 0) {
        console.error(`❌ No quotes data for ${symbol}`);
        continue;
      }

      for (const quote of quotes) {
        const date = new Date(quote.date).toISOString().split("T")[0];

        await db.ref(`stocks/${symbol}/history/${date}`).set({
          open: quote.open,
          close: quote.close,
          high: quote.high,
          low: quote.low,
          volume: quote.volume,
        });
      }

      console.log(`✅ Stored historical data for ${symbol}`);
    } catch (error) {
      console.error(`❌ Error fetching chart for ${symbol}`, error.message);
    }
  }

  db.app.delete();
};

fetchAndStoreHistoricalData();
