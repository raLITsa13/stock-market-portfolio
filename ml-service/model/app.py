from flask import Flask, request, jsonify
import numpy as np
import pandas as pd
import yfinance as yf
import tensorflow as tf
from sklearn.preprocessing import MinMaxScaler
import joblib
import os

app = Flask(__name__)

# Load the trained model and scaler
model_path = "model/stock_price_model.h5"
scaler_path = "model/scaler.pkl"

if os.path.exists(model_path) and os.path.exists(scaler_path):
    model = tf.keras.models.load_model(model_path)
    scaler = joblib.load(scaler_path)
else:
    raise FileNotFoundError("Trained model or scaler not found!")

@app.route('/')
def home():
    return "Stock Market Prediction API is Running!"

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        stock_symbol = data.get("symbol", "AAPL")
        future_days = int(data.get("future_days", 7))  # Days to predict

        days = 60  # The model was trained on 60 days of past data

        # Fetch stock data
        df = yf.download(stock_symbol, period="90d")["Close"]

        if df.empty:
            return jsonify({"error": f"No data found for {stock_symbol}. Try a different stock symbol."}), 400

        scaled_data = scaler.transform(df.values.reshape(-1, 1))
        available_days = len(scaled_data)

        if available_days < days:
            return jsonify({"error": f"Not enough historical data. Model needs {days} days, but only {available_days} available."}), 400

        x_input = scaled_data[-days:].reshape(1, days, 1)  # Ensure correct shape

        future_predictions = []
        for _ in range(future_days):
            predicted_value = model.predict(x_input)
            future_price = scaler.inverse_transform(predicted_value)[0][0]

            future_predictions.append(float(future_price))

            # Update input: Remove first, add new prediction
            x_input = np.append(x_input[:, 1:, :], predicted_value.reshape(1, 1, 1), axis=1)

        return jsonify({"symbol": stock_symbol, "predicted_prices": future_predictions})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=4000)
