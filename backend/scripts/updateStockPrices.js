const axios = require("axios");
const { db } = require("../config/firebase");

const RAPIDAPI_KEY = "f7cb703737mshd47bec5d827ba3bp1fc2a8jsn20391340db76";
const RAPIDAPI_HOST = "apidojo-yahoo-finance-v1.p.rapidapi.com";

const stockSymbols = ["AAPL", "GOOGL", "TSLA", "AMZN", "MSFT"];

const updateStockPrices = async () => {
  try {
    const response = await axios.get("https://apidojo-yahoo-finance-v1.p.rapidapi.com/market/v2/get-quotes", {
      params: {
        region: "US",
        symbols: stockSymbols.join(","),
      },
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
      },
    });

    const quotes = response.data.quoteResponse.result;

    for (const quote of quotes) {
      const symbol = quote.symbol;
      const currentPrice = quote.regularMarketPrice;

      if (!currentPrice) {
        console.warn(`⚠️ No price data for ${symbol}`);
        continue;
      }

      const timestamp = new Date().toISOString();

      // Store latest price
      await db.ref(`stocks/${symbol}/latest`).set({
        price: currentPrice,
        updatedAt: timestamp,
      });

      console.log(`✅ Stored ${symbol}: $${currentPrice} @ ${timestamp}`);
    }
  } catch (error) {
    console.error("❌ Error fetching stock prices", error.message);
  } finally {
    db.app?.delete?.();
  }
};

updateStockPrices();
