import { useState, useEffect } from "react";
import { getHistoricalData, processHistoricalDataForCharts } from "../service/stockService";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import StockChart from "@/components/StockChart";
import TimeRangeSelector from "@/components/TimeRangeSelector";
import { TimeRange } from "@/types/stock";
import { useDashboard } from "@/contexts/DashboardContext";

interface StockHistoryChartProps {
  symbol: string;
  name: string;
  useGlobalTimeRange?: boolean;
}

const StockHistoryChart = ({ 
  symbol, 
  name, 
  useGlobalTimeRange = false 
}: StockHistoryChartProps) => {
  const { globalTimeRange } = useDashboard();
  const [historicalData, setHistoricalData] = useState<{ date: string; price: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [gainLossInfo, setGainLossInfo] = useState<{ 
    change: string;
    percentChange: string;
    direction: 'gain' | 'loss' | 'no change';
  } | null>(null);

  // If useGlobalTimeRange is true, we'll use the global time range
  const effectiveTimeRange = useGlobalTimeRange ? globalTimeRange : timeRange;

  useEffect(() => {
    const fetchHistoricalData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log(`🔄 Fetching historical data for ${symbol} with time range:`, effectiveTimeRange);
        const data = await getHistoricalData(effectiveTimeRange);
        console.log(`📊 Raw historical data for ${symbol}:`, data);
        
        const processedData = processHistoricalDataForCharts(data, symbol);
        console.log(`📈 Processed chart data for ${symbol}:`, processedData);
        console.log(`📊 Data points count for ${symbol}:`, processedData.length);
        
        if (processedData.length === 0) {
          console.warn(`⚠️ No data points found for ${symbol}`);
        }
        
        setHistoricalData(processedData);
        
        // Set gain/loss information if available
        if (data.gainLoss && data.gainLoss[symbol]) {
          console.log(`💰 Gain/Loss info for ${symbol}:`, data.gainLoss[symbol]);
          setGainLossInfo({
            change: data.gainLoss[symbol].change,
            percentChange: data.gainLoss[symbol].percentChange,
            direction: data.gainLoss[symbol].direction
          });
        } else {
          console.warn(`⚠️ No gain/loss info found for ${symbol}`);
        }
      } catch (err) {
        console.error(`❌ Failed to fetch historical data for ${symbol}:`, err);
        setError("Failed to load historical data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistoricalData();
  }, [symbol, effectiveTimeRange]);

  const handleTimeRangeChange = (newRange: TimeRange) => {
    setTimeRange(newRange);
  };

  return (
    <div className="h-full">
      {!useGlobalTimeRange && (
        <div className="flex justify-end mb-2">
          <TimeRangeSelector
            selectedRange={timeRange}
            onRangeChange={handleTimeRangeChange}
          />
        </div>
      )}
      {isLoading ? (
        <div className="flex justify-center items-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : historicalData.length > 0 ? (
        <StockChart 
          data={historicalData} 
          height={200} 
          showAxis={true}
          gainLossInfo={gainLossInfo || undefined}
        />
      ) : (
        <div className="flex justify-center items-center h-full text-muted-foreground">
          No historical data available for this stock
        </div>
      )}
    </div>
  );
};

export default StockHistoryChart;
