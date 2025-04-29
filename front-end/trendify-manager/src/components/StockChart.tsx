import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Stock } from "@/types/stock";

interface ChartDataPoint {
  date: string;
  price: number;
}

interface StockChartProps {
  data?: ChartDataPoint[];
  stock?: Stock;
  height?: number;
  showAxis?: boolean;
  color?: string;
  gainLossInfo?: {
    change: string;
    percentChange: string;
    direction: 'gain' | 'loss' | 'no change';
  };
}

const StockChart = ({ 
  data: propData, 
  stock,
  height = 300, 
  showAxis = true,
  color = "#8B5CF6",
  gainLossInfo
}: StockChartProps) => {
  console.log("📊 StockChart received props:", { 
    propDataLength: propData?.length, 
    stockSymbol: stock?.symbol,
    height,
    showAxis,
    color,
    gainLossInfo
  });

  // Use propData if provided, otherwise use stock.historicalData
  const rawData = propData || (stock?.historicalData || []);
  console.log("📈 Raw data received by chart:", rawData);
  
  // Filter out any invalid data points
  const validData = rawData.filter(item => {
    const isValid = item && 
      typeof item.price === 'number' && 
      !isNaN(item.price) && 
      item.date;
    
    if (!isValid) {
      console.warn("❌ Invalid data point filtered out:", item);
    }
    
    return isValid;
  });

  console.log("✅ Valid data points after filtering:", validData.length);
  console.log("📊 Sample of valid data:", validData.slice(0, 3));
  
  // Determine if the stock is trending up or down
  const positiveChange = gainLossInfo 
    ? gainLossInfo.direction === 'gain'
    : (validData.length >= 2 ? validData[validData.length - 1]?.price >= validData[0]?.price : true);
  
  const lineColor = color || (positiveChange ? "#10B981" : "#EF4444");

  // Make sure we have valid data before rendering
  if (!validData || validData.length === 0) {
    console.warn("⚠️ No valid data available for chart rendering");
    return (
      <div className="flex justify-center items-center" style={{ height: height }}>
        <p className="text-muted-foreground">No chart data available</p>
      </div>
    );
  }

  // Format dates for better display
  const formattedData = validData.map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString()
  }));

  console.log("📅 Formatted data for chart:", formattedData.slice(0, 3));

  return (
    <div className="relative">
      {gainLossInfo && (
        <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs z-10 ${gainLossInfo.direction === 'gain' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          <span>{gainLossInfo.percentChange}%</span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={formattedData}
          margin={{
            top: 5,
            right: 5,
            left: showAxis ? 20 : 0,
            bottom: showAxis ? 20 : 0,
          }}
        >
          {showAxis && <CartesianGrid strokeDasharray="3 3" opacity={0.2} />}
          {showAxis && <XAxis dataKey="date" tick={{ fontSize: 12 }} />}
          {showAxis && (
            <YAxis
              tick={{ fontSize: 12 }}
              domain={['auto', 'auto']}
              tickFormatter={(value) => `$${value.toFixed(2)}`}
            />
          )}
          <Tooltip
            formatter={(value: number) => {
              return isNaN(value) ? ["No data", "Price"] : [`$${value.toFixed(2)}`, 'Price'];
            }}
            labelFormatter={(label) => `Date: ${label}`}
            contentStyle={{ 
              backgroundColor: 'hsl(240 10% 16%)', 
              borderColor: 'hsl(240 3.7% 15.9%)',
              color: '#fff' 
            }}
          />
          {showAxis && <Legend />}
          <Line
            type="monotone"
            dataKey="price"
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockChart;
