import joblib
import numpy as np

# ===========================================================
# Initialization
# ===========================================================

SCORE_MODEL_PATH = "models/ol_prediction_model.pkl"

print("Loading score prediction model…")
score_model = joblib.load(SCORE_MODEL_PATH)
print("Score prediction model loaded ✅")

# ===========================================================
# Prediction Logic
# ===========================================================

def ol_grade(score: float) -> str:
    """Map a 0-100 score to an O/L grade letter (Sri Lanka scheme)."""
    if score >= 75: return "A"
    if score >= 65: return "B"
    if score >= 55: return "C"
    if score >= 35: return "S"
    return "F"

def predict_score_logic(features: list[float]) -> dict:
    """
    Accepts exactly 9 term marks.
    Returns the predicted O/L final score and grade letter.
    """
    X = np.array(features, dtype=np.float64).reshape(1, -1)
    pred = float(score_model.predict(X)[0])
    pred = max(0.0, min(100.0, pred))
    
    return {
        "predicted_score": round(pred, 1),
        "grade": ol_grade(pred)
    }
