import os
import numpy as np
import pandas as pd
import yfinance as yf
import joblib
import tensorflow as tf
import matplotlib.pyplot as plt
from sklearn.metrics import mean_squared_error, mean_absolute_percentage_error

MODEL_DIR = "model"
STOCKS = ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "NVDA", "META"]

# Compute RSI
def compute_rsi(data, window=14):
    delta = data.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=window).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

# Compute MACD
def compute_macd(data, short_window=12, long_window=26, signal_window=9):
    short_ema = data.ewm(span=short_window, adjust=False).mean()
    long_ema = data.ewm(span=long_window, adjust=False).mean()
    macd = short_ema - long_ema
    signal_line = macd.ewm(span=signal_window, adjust=False).mean()
    return macd - signal_line

# Predict future stock prices
def predict(stock_symbol, future_days=7):
    model_path = os.path.join(MODEL_DIR, f"{stock_symbol}_model.h5")
    scaler_path = os.path.join(MODEL_DIR, f"{stock_symbol}_scaler.pkl")

    if not os.path.exists(model_path) or not os.path.exists(scaler_path):
        print("Model or scaler not found!")
        return

    model = tf.keras.models.load_model(model_path)
    scaler = joblib.load(scaler_path)
    df = yf.download(stock_symbol, period="100d")["Close"]
    df = df.dropna()
    scaled_data = scaler.transform(df.values.reshape(-1, 1))
    x_input = scaled_data[-60:].reshape(1, 60, 1)

    future_preds = []
    for _ in range(future_days):
        pred = model.predict(x_input)
        future_preds.append(scaler.inverse_transform(pred)[0][0])
        x_input = np.append(x_input[:, 1:, :], pred.reshape(1, 1, 1), axis=1)

    print(f"Predictions for {stock_symbol}: {future_preds}")
    return future_preds

# Evaluate model performance
def evaluate(stock_symbol):
    model_path = os.path.join(MODEL_DIR, f"{stock_symbol}_model.h5")
    scaler_path = os.path.join(MODEL_DIR, f"{stock_symbol}_scaler.pkl")

    if not os.path.exists(model_path) or not os.path.exists(scaler_path):
        print(f"Model or scaler not found for {stock_symbol}!")
        return

    model = tf.keras.models.load_model(model_path)
    scaler = joblib.load(scaler_path)

    df = yf.download(stock_symbol, period="1000d")[["Close"]]
    df['SMA_50'] = df['Close'].rolling(window=50).mean()
    df['EMA_20'] = df['Close'].ewm(span=20, adjust=False).mean()
    df['RSI'] = compute_rsi(df['Close'])
    df['MACD'] = compute_macd(df['Close'])
    df.dropna(inplace=True)

    scaled_data = scaler.transform(df)

    x_test = scaled_data[-60:].reshape(1, 60, df.shape[1])
    y_test = df['Close'].values[-7:]

    predictions = []
    for _ in range(len(y_test)):
        pred = model.predict(x_test)
        padded_pred = np.zeros((1, 1, df.shape[1]))
        padded_pred[:, :, 0] = pred
        predictions.append(scaler.inverse_transform(padded_pred.reshape(1, df.shape[1]))[0, 0])
        x_test = np.append(x_test[:, 1:, :], padded_pred, axis=1)

    mse = mean_squared_error(y_test, predictions)
    mape = mean_absolute_percentage_error(y_test, predictions)
    print(f"{stock_symbol} Evaluation -> MSE: {mse}, MAPE: {mape * 100:.2f}%")

    plt.figure(figsize=(10, 5))
    plt.plot(y_test, label="Actual", color="blue")
    plt.plot(predictions, label="Predicted", color="red")
    plt.legend()
    plt.title(f"{stock_symbol} - Actual vs Predicted")
    plt.show()

# Run evaluation for all stocks
for stock in STOCKS:
    evaluate(stock)
