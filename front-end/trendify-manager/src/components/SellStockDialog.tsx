import { useState, useEffect } from "react";
import { Stock, useStock } from "@/contexts/StockContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import StockChart from "./StockChart";
import { getHistoricalData, processHistoricalDataForCharts } from "../service/stockService";
import { TimeRange } from "@/types/stock";

interface SellStockDialogProps {
  stock: Stock | null;
  isOpen: boolean;
  onClose: () => void;
  ownedShares: number;
}

const SellStockDialog = ({ stock, isOpen, onClose, ownedShares }: SellStockDialogProps) => {
  const [shares, setShares] = useState<number>(1);
  const { sellStock } = useStock();
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [gainLossInfo, setGainLossInfo] = useState<{ 
    change: string;
    percentChange: string;
    direction: 'gain' | 'loss' | 'no change';
  } | null>(null);
  const [historicalData, setHistoricalData] = useState<{ date: string; price: number }[]>([]);

  useEffect(() => {
    if (stock && isOpen) {
      const fetchData = async () => {
        try {
          const data = await getHistoricalData(timeRange);
          
          // Process historical data
          if (data.history && data.history[stock.symbol]) {
            const processedData = processHistoricalDataForCharts(data, stock.symbol);
            setHistoricalData(processedData);
          }
          
          // Set gain/loss information
          if (data.gainLoss && data.gainLoss[stock.symbol]) {
            setGainLossInfo({
              change: data.gainLoss[stock.symbol].change,
              percentChange: data.gainLoss[stock.symbol].percentChange,
              direction: data.gainLoss[stock.symbol].direction
            });
          }
        } catch (error) {
          console.error("Failed to fetch data:", error);
        }
      };

      fetchData();
    }
  }, [stock, isOpen, timeRange]);

  if (!stock) return null;

  const total = shares * stock.price;
  const canSell = shares <= ownedShares;

  const handleSell = async () => {
    if (!user) return;
    
    try {
      // Try to sell the stock
      await sellStock(stock.symbol, shares);
      onClose();
    } catch (error) {
      console.error("Error during sale:", error);
      alert("An error occurred during sale. Please try again.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Sell {stock.symbol} Stock</DialogTitle>
          <DialogDescription>
            {stock.name} - Current price: ${stock.price.toFixed(2)}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-2 h-40">
          <StockChart 
            data={historicalData}
            height={160}
            gainLossInfo={gainLossInfo || undefined}
          />
        </div>
        
        <div className="space-y-3 max-h-[50vh] overflow-y-auto py-2 pr-1">
          <div className="space-y-2">
            <Label htmlFor="shares">Number of shares to sell</Label>
            <Input
              id="shares"
              type="number"
              min="1"
              max={ownedShares}
              value={shares}
              onChange={(e) => setShares(parseInt(e.target.value) || 1)}
            />
            <p className="text-sm text-muted-foreground">
              You own {ownedShares} shares
            </p>
          </div>
          
          <div className="flex justify-between text-sm">
            <span>Total value:</span>
            <span className="font-semibold">${total.toFixed(2)}</span>
          </div>
          
          {!canSell && (
            <p className="text-sm text-danger">
              You can't sell more shares than you own
            </p>
          )}

          {gainLossInfo && (
            <div className="py-1">
              <h4 className="text-sm font-medium mb-1">Performance</h4>
              <div className={`p-2 rounded-md ${gainLossInfo.direction === 'gain' ? 'bg-green-100/10' : 'bg-red-100/10'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Change:</span>
                  <span className={`font-semibold ${gainLossInfo.direction === 'gain' ? 'text-success' : 'text-danger'}`}>
                    {gainLossInfo.direction === 'gain' ? '+' : ''}{gainLossInfo.change}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm">Percentage:</span>
                  <span className={`font-semibold ${gainLossInfo.direction === 'gain' ? 'text-success' : 'text-danger'}`}>
                    {gainLossInfo.direction === 'gain' ? '+' : ''}{gainLossInfo.percentChange}%
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <div className="py-1">
            <h4 className="text-sm font-medium mb-1">Prediction</h4>
            <div className="bg-muted/50 p-2 rounded-md">
              <div className="flex justify-between items-center">
                <span className="text-sm">Predicted price:</span>
                <span className="font-semibold">${stock.prediction.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm">Confidence:</span>
                <span className="font-semibold">{(stock.prediction.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSell} disabled={!canSell}>
            Sell {shares} share{shares !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SellStockDialog; 