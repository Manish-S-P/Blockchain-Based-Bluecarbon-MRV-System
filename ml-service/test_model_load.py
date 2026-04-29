import joblib
import numpy as np
import os

model_path = "/home/manish/Coding/blue-carbon-registry/ml-service/ecosystem_rf_model.pkl"
try:
    model = joblib.load(model_path)
    print("Model loaded successfully")
    X = np.array([[0.5, 0.2, 0.4, 5.0]])
    pred = model.predict(X)
    print(f"Prediction test: {pred}")
except Exception as e:
    print(f"Error: {e}")
