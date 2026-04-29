import csv
from pathlib import Path
import numpy as np
from app.model_manager import ModelManager

def evaluate_blind():
    """
    Evaluates the model by ensuring the test point is NOT in the training set
    during its own prediction (Leave-One-Out style for the test split).
    """
    dataset_path = Path(__file__).resolve().parent / "training_labels.csv"
    if not dataset_path.exists():
        print("Dataset not found!")
        return

    samples = []
    with dataset_path.open("r", encoding="utf-8") as fp:
        reader = csv.DictReader(fp)
        for row in reader:
            samples.append({
                "class_name": row["class_name"],
                "lat": float(row["latitude"]),
                "lon": float(row["longitude"]),
                "split": row.get("split", "train")
            })

    test_samples = [s for s in samples if s["split"] == "test"]
    train_samples = [s for s in samples if s["split"] != "test"]

    if not test_samples:
        print("No test samples found, using all samples for cross-validation...")
        test_samples = samples
        train_samples = samples

    manager = ModelManager()
    
    y_true = []
    y_pred = []
    confidences = []

    for test_s in test_samples:
        noise_lat = np.random.normal(0, 0.02)
        noise_lon = np.random.normal(0, 0.02)
        
        query_lat = test_s["lat"] + noise_lat
        query_lon = test_s["lon"] + noise_lon

        temp_features = []
        temp_labels = []
        for train_s in train_samples:
            if train_s["lat"] == test_s["lat"] and train_s["lon"] == test_s["lon"]:
                continue
            temp_features.append([train_s["lat"], train_s["lon"]])
            temp_labels.append(train_s["class_name"])
        
        manager._train_features = np.array(temp_features)
        manager._train_labels = temp_labels
        
        coords = [[query_lat, query_lon]]
        prediction = manager._predict_ecosystem_from_location(coords)
        
        if prediction:
            pred_class, conf, _ = prediction
            y_true.append(test_s["class_name"])
            y_pred.append(pred_class)
            confidences.append(conf)

    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    
    accuracy = np.mean(y_true == y_pred)
    
    print(f"--- BLIND EVALUATION RESULTS ---")
    print(f"Total Test Samples: {len(y_true)}")
    print(f"Overall Accuracy: {accuracy:.4f}")
    print(f"Average Confidence: {np.mean(confidences):.4f}")
    
    classes = sorted(list(set(y_true)))
    print("\nPer-class Metrics:")
    print(f"{'Class':12} | {'Precision':10} | {'Recall':10} | {'F1-Score':10}")
    print("-" * 50)
    for cls in classes:
        tp = np.sum((y_true == cls) & (y_pred == cls))
        fp = np.sum((y_true != cls) & (y_pred == cls))
        fn = np.sum((y_true == cls) & (y_pred != cls))
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        print(f"{cls:12} | {precision:10.4f} | {recall:10.4f} | {f1:10.4f}")

    print("\nConfusion Matrix:")
    print(f"{'':12}", end="")
    for cls in classes:
        print(f"{cls[:4]:>6}", end="")
    print()
    for r_cls in classes:
        print(f"{r_cls:12}", end="")
        for c_cls in classes:
            count = np.sum((y_true == r_cls) & (y_pred == c_cls))
            print(f"{count:6}", end="")
        print()

if __name__ == "__main__":
    evaluate_blind()
