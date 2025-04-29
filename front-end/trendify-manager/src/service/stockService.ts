import axios from "axios";
import { HistoricalDataResponse, TimeRange } from "@/types/stock";

const API_URL = 'http://localhost:4000/api';

export const getHistoricalData = async (range: TimeRange): Promise<HistoricalDataResponse> => {
  const { from, to } = getDateRangeForQuery(range);
  try {
    const response = await axios.get(
      `${API_URL}/stocks/history?from=${from}&to=${to}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching historical data:", error);
    return { history: {} };
  }
};

const getDateRangeForQuery = (range: TimeRange): { from: string; to: string } => {
  const to = new Date();
  const from = new Date();

  switch (range) {
    case "7d":
      from.setDate(to.getDate() - 7);
      break;
    case "14d":
      from.setDate(to.getDate() - 14);
      break;
    case "1m":
      from.setMonth(to.getMonth() - 1);
      break;
    case "2m":
      from.setMonth(to.getMonth() - 2);
      break;
    case "3m":
      from.setMonth(to.getMonth() - 3);
      break;
    default:
      from.setDate(to.getDate() - 7);
  }

  return {
    from: formatDateForAPI(from),
    to: formatDateForAPI(to),
  };
};

const formatDateForAPI = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const processHistoricalDataForCharts = (
  data: HistoricalDataResponse,
  symbol: string
): { date: string; price: number }[] => {
  console.log("Processing historical data for symbol:", symbol);
  console.log("Raw data received:", data);

  if (!data || !data.history || !data.history[symbol]) {
    console.warn(`No historical data found for symbol: ${symbol}`);
    return [];
  }

  const symbolData = data.history[symbol];
  console.log(`Raw data for ${symbol}:`, symbolData);

  try {
    const processedData = Object.entries(symbolData)
      .map(([date, values]) => {
        // Handle OHLCV format
        if (typeof values === 'object' && values !== null) {
          const price = values.close;
          if (isNaN(price)) {
            console.warn(`Invalid price value for ${symbol} on ${date}:`, values);
            return null;
          }
          return {
            date,
            price: Number(price)
          };
        }
        return null;
      })
      .filter((item): item is { date: string; price: number } => item !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log(`Processed data for ${symbol}:`, processedData);
    return processedData;
  } catch (error) {
    console.error(`Error processing data for ${symbol}:`, error);
    return [];
  }
};

export const processGainLossData = (data: HistoricalDataResponse): {
  symbol: string;
  change: string;
  percentChange: string;
  direction: 'gain' | 'loss' | 'no change';
}[] => {
  if (!data || !data.gainLoss) return [];

  return Object.entries(data.gainLoss).map(([symbol, gainLoss]) => ({
    symbol,
    change: gainLoss.change,
    percentChange: gainLoss.percentChange,
    direction: gainLoss.direction,
  }));
};
