import os
import numpy as np
import pandas as pd
import yfinance as yf
import joblib
import tensorflow as tf
from sklearn.preprocessing import MinMaxScaler
from keras.models import Sequential
from keras.layers import Dense, LSTM
from datetime import datetime

# Create model directory
MODEL_DIR = "model"
os.makedirs(MODEL_DIR, exist_ok=True)

# Stock list
STOCKS = ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "NVDA", "META"]
start_date = "2000-01-01"
end_date = datetime.now().strftime("%Y-%m-%d")

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

# Train model for a stock
def train_model(stock_symbol):
    print(f"\nDownloading data for {stock_symbol}...")
    df = yf.download(stock_symbol, start=start_date, end=end_date)
    df = df[['Close']].dropna()
    df['SMA_50'] = df['Close'].rolling(window=50).mean()
    df['EMA_20'] = df['Close'].ewm(span=20, adjust=False).mean()
    df['RSI'] = compute_rsi(df['Close'])
    df['MACD'] = compute_macd(df['Close'])
    df.dropna(inplace=True)

    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(df.values)
    joblib.dump(scaler, os.path.join(MODEL_DIR, f"{stock_symbol}_scaler.pkl"))

    train_size = int(len(scaled_data) * 0.95)
    train_data = scaled_data[:train_size]

    x_train, y_train = [], []
    for i in range(60, len(train_data)):
        x_train.append(train_data[i-60:i])
        y_train.append(train_data[i, 0])

    x_train, y_train = np.array(x_train), np.array(y_train)

    model = Sequential([
        LSTM(128, return_sequences=True, input_shape=(x_train.shape[1], x_train.shape[2])),
        LSTM(64, return_sequences=True),
        LSTM(32, return_sequences=False),
        Dense(64, activation="relu"),
        Dense(32, activation="relu"),
        Dense(1)
    ])

    model.compile(optimizer="adam", loss="mean_squared_error")

    early_stopping = tf.keras.callbacks.EarlyStopping(monitor='loss', patience=5, restore_best_weights=True)
    model.fit(x_train, y_train, batch_size=32, epochs=5, callbacks=[early_stopping], verbose=1)

    model.save(os.path.join(MODEL_DIR, f"{stock_symbol}_model.h5"))
    print(f"Model for {stock_symbol} saved.")

# Train all stocks
for stock in STOCKS:
    train_model(stock)
