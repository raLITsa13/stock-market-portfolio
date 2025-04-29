import os
import numpy as np
import pandas as pd
import yfinance as yf
import joblib
import tensorflow as tf

MODEL_DIR = "model"

def load_model_and_scaler(stock_symbol):
    """ Load trained model and scaler for a given stock symbol """
    model_path = os.path.join(MODEL_DIR, f"{stock_symbol}_model.h5")
    scaler_path = os.path.join(MODEL_DIR, f"{stock_symbol}_scaler.pkl")

    if not os.path.exists(model_path) or not os.path.exists(scaler_path):
        raise FileNotFoundError(f"Model or scaler for {stock_symbol} not found!")

    model = tf.keras.models.load_model(model_path)
    scaler = joblib.load(scaler_path)

    return model, scaler

def predict_stock(stock_symbol, future_days=7):
    """ Predict future stock prices """
    try:
        model, scaler = load_model_and_scaler(stock_symbol)

        # Get recent stock data
        df = yf.download(stock_symbol, period="100d")["Close"]
        df = df.dropna()

        if df.empty:
            raise ValueError(f"No recent data available for {stock_symbol}")

        # Transform data using the same scaler
        scaled_data = scaler.transform(df.values.reshape(-1, 1))
        x_input = scaled_data[-60:].reshape(1, 60, 1)

        # Predict future stock prices
        future_predictions = []
        for _ in range(future_days):
            pred = model.predict(x_input)
            future_price = scaler.inverse_transform(pred)[0][0]
            future_predictions.append(future_price)

            # Update input for the next prediction
            x_input = np.append(x_input[:, 1:, :], pred.reshape(1, 1, 1), axis=1)

        return future_predictions

    except Exception as e:
        return str(e)

if __name__ == "__main__":
    stock = input("Enter stock symbol (e.g., AAPL, GOOGL): ").upper()
    days = int(input("Enter number of future days to predict: "))

    predictions = predict_stock(stock, days)
    if isinstance(predictions, list):
        print(f"Predicted prices for {stock} for the next {days} days: {predictions}")
    else:
        print(f"Error: {predictions}")
