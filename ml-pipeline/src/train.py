import os
import pickle
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import log_loss, brier_score_loss
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from collector import generate_historical_data

def calculate_multiclass_brier_score(y_true, y_prob):
    """
    Calculates the multiclass Brier score: (1/N) * sum_i(sum_j((p_ij - y_ij)^2))
    """
    n_classes = y_prob.shape[1]
    y_true_one_hot = np.zeros_like(y_prob)
    for i, val in enumerate(y_true):
        y_true_one_hot[i, val] = 1
    return np.mean(np.sum((y_prob - y_true_one_hot) ** 2, axis=1))

def train_and_evaluate():
    # Ensure data directory exists
    os.makedirs("ml-pipeline/data", exist_ok=True)

    print("Generating simulated historical dataset...")
    df = generate_historical_data(n_matches=3000)
    
    # Define features
    features = [
        "home_form", "away_form", "h2h_home_wins", 
        "home_injury_index", "away_injury_index", 
        "rest_days_diff", "xg_home_avg", "xg_away_avg"
    ]
    
    X = df[features]
    y_outcome = df["outcome"]
    y_btts = df["btts"]
    y_over25 = df["over25"]
    y_over05 = df["over05"]
    y_under35 = df["under35"]
    y_corners = df["over95corners"]
    y_cards = df["over45cards"]
    
    # Split datasets
    indices = np.arange(len(df))
    X_train, X_test, y_out_train, y_out_test, idx_train, idx_test = train_test_split(
        X, y_outcome, indices, test_size=0.2, random_state=42
    )
    
    y_btts_train, y_btts_test = y_btts.iloc[idx_train], y_btts.iloc[idx_test]
    y_over25_train, y_over25_test = y_over25.iloc[idx_train], y_over25.iloc[idx_test]
    y_over05_train, y_over05_test = y_over05.iloc[idx_train], y_over05.iloc[idx_test]
    y_under35_train, y_under35_test = y_under35.iloc[idx_train], y_under35.iloc[idx_test]
    y_corners_train, y_corners_test = y_corners.iloc[idx_train], y_corners.iloc[idx_test]
    y_cards_train, y_cards_test = y_cards.iloc[idx_train], y_cards.iloc[idx_test]
    
    # Helper to build scaling pipeline for LR
    def build_lr_model():
        return make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000, random_state=42))
        
    # 1. Train Match Outcome Model (Multiclass: Home, Draw, Away)
    print("\nTraining Match Outcome models...")
    model_outcome = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
    model_outcome_lr = build_lr_model()
    model_outcome_gb = GradientBoostingClassifier(n_estimators=80, max_depth=4, random_state=42)
    
    model_outcome.fit(X_train, y_out_train)
    model_outcome_lr.fit(X_train, y_out_train)
    model_outcome_gb.fit(X_train, y_out_train)
    
    prob_out_test = model_outcome.predict_proba(X_test)
    outcome_brier = calculate_multiclass_brier_score(y_out_test.values, prob_out_test)
    print(f"Outcome Model (RF) - Brier Score: {outcome_brier:.4f}")
    
    # 2. Train BTTS Model (Binary)
    print("Training BTTS models...")
    model_btts = RandomForestClassifier(n_estimators=100, max_depth=4, random_state=42)
    model_btts_lr = build_lr_model()
    model_btts_gb = GradientBoostingClassifier(n_estimators=80, max_depth=3, random_state=42)
    
    model_btts.fit(X_train, y_btts_train)
    model_btts_lr.fit(X_train, y_btts_train)
    model_btts_gb.fit(X_train, y_btts_train)
    
    # 3. Train Over/Under 2.5 Goals Model
    print("Training Over/Under 2.5 Goals models...")
    model_over25 = RandomForestClassifier(n_estimators=100, max_depth=4, random_state=42)
    model_over25_lr = build_lr_model()
    model_over25_gb = GradientBoostingClassifier(n_estimators=80, max_depth=3, random_state=42)
    
    model_over25.fit(X_train, y_over25_train)
    model_over25_lr.fit(X_train, y_over25_train)
    model_over25_gb.fit(X_train, y_over25_train)
    
    # 4. Train Over 0.5 Goals Model
    print("Training Over 0.5 Goals models...")
    model_over05 = RandomForestClassifier(n_estimators=100, max_depth=4, random_state=42)
    model_over05_lr = build_lr_model()
    model_over05_gb = GradientBoostingClassifier(n_estimators=80, max_depth=3, random_state=42)
    
    model_over05.fit(X_train, y_over05_train)
    model_over05_lr.fit(X_train, y_over05_train)
    model_over05_gb.fit(X_train, y_over05_train)

    # 5. Train Under 3.5 Goals Model
    print("Training Under 3.5 Goals models...")
    model_under35 = RandomForestClassifier(n_estimators=100, max_depth=4, random_state=42)
    model_under35_lr = build_lr_model()
    model_under35_gb = GradientBoostingClassifier(n_estimators=80, max_depth=3, random_state=42)
    
    model_under35.fit(X_train, y_under35_train)
    model_under35_lr.fit(X_train, y_under35_train)
    model_under35_gb.fit(X_train, y_under35_train)

    # 6. Train Corners Model (Over 9.5)
    print("Training Corners models...")
    model_corners = RandomForestClassifier(n_estimators=100, max_depth=4, random_state=42)
    model_corners_lr = build_lr_model()
    model_corners_gb = GradientBoostingClassifier(n_estimators=80, max_depth=3, random_state=42)
    
    model_corners.fit(X_train, y_corners_train)
    model_corners_lr.fit(X_train, y_corners_train)
    model_corners_gb.fit(X_train, y_corners_train)

    # 7. Train Cards Model (Over 4.5)
    print("Training Cards models...")
    model_cards = RandomForestClassifier(n_estimators=100, max_depth=4, random_state=42)
    model_cards_lr = build_lr_model()
    model_cards_gb = GradientBoostingClassifier(n_estimators=80, max_depth=3, random_state=42)
    
    model_cards.fit(X_train, y_cards_train)
    model_cards_lr.fit(X_train, y_cards_train)
    model_cards_gb.fit(X_train, y_cards_train)
    
    # Save everything
    artifacts = {
        # Random Forest Base models
        "model_outcome": model_outcome,
        "model_btts": model_btts,
        "model_over25": model_over25,
        "model_over05": model_over05,
        "model_under35": model_under35,
        "model_corners": model_corners,
        "model_cards": model_cards,
        
        # Logistic Regression Base models (with integrated StandardScaler pipeline)
        "model_outcome_lr": model_outcome_lr,
        "model_btts_lr": model_btts_lr,
        "model_over25_lr": model_over25_lr,
        "model_over05_lr": model_over05_lr,
        "model_under35_lr": model_under35_lr,
        "model_corners_lr": model_corners_lr,
        "model_cards_lr": model_cards_lr,
        
        # Gradient Boosting Base models
        "model_outcome_gb": model_outcome_gb,
        "model_btts_gb": model_btts_gb,
        "model_over25_gb": model_over25_gb,
        "model_over05_gb": model_over05_gb,
        "model_under35_gb": model_under35_gb,
        "model_corners_gb": model_corners_gb,
        "model_cards_gb": model_cards_gb,
        
        "features": features
    }
    
    with open("ml-pipeline/data/model_artifacts.pkl", "wb") as f:
        pickle.dump(artifacts, f)
    
    print("\nModel training successful. Multi-AI model artifacts saved in 'ml-pipeline/data/model_artifacts.pkl'.")

if __name__ == "__main__":
    train_and_evaluate()
