# Dream Institute — ML Backend (FastAPI)

This is the AI service provider for the Dream Institute application, responsible for running face-recognition, liveness detection, and academic score predictions.

---

## Tech Stack

| Component         | Technology                |
|-------------------|---------------------------|
| **Language**      | Python 312+               |
| **Framework**     | FastAPI                   |
| **Deep Learning** | PyTorch + Torchvision     |
| **Numerical**     | NumPy + SciPy             |
| **ML Engine**     | Scikit-learn + Joblib     |
| **Image Processing** | Pillow (PIL)           |
| **Client Calls**  | HTTPX                     |

---

## 1) Setup & Installation

### Prerequisites
- Python 3.12 (standard for this project)
- Active Virtual Environment (venv)

### Local Environment Setup
1.  **Navigate to the directory**:
    ```bash
    cd ml/ml-backend
    ```
2.  **Activate your virtual environment**:
    ```bash
    # Windows
    .\venv\Scripts\activate
    ```
3.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
4.  **Run with Uvicorn (Hot-Reload enabled)**:
    ```bash
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    ```
    The server will be accessible at `http://localhost:8000`.

---

## 2) Key AI Models

All model files must be placed in the `models/` directory.

- **`face_embedding_model.pt`**: A Torch model used to encode a 160x160 face image into a 128-d numerical vector.
- **`liveness_model.pt`**: A MobileNetV2-based anti-spoofing classifier (trained on CASIA-FASD) that distinguishes real faces from photo/screen spoofs.
- **`ol_prediction_model.pkl`**: A Random Forest regressor (trained on UCI Student Performance dataset) that predicts O/L final scores using 9 subject term marks (G9T1 to G11T3).

---

## 3) Endpoint Documentation

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/liveness` | Accepts base64 image; returns P(live) and decision (is_live: true/false). |
| `POST` | `/recognize` | Validates JWT → Identifies the best student match from embeddings stored in MongoDB. |
| `POST` | `/predict` | Predicts final results for Grade 11 students from 9 numerical features. |
| `POST` | `/embed` | Converts a face image into a 128-d embedding for initial registration. |

### Liveness Logic
Decision logic is currently strictly based on the Neural Network (NN) score.
- **`NN_LIVE_THRESHOLD = 0.50`**: Change this in `main.py` if real faces are incorrectly blocked.
- **Logging**: Every scan outputs a `[LIVENESS]` line to the console with exact scores (NN, Texture, Freq) for audit and tuning.

### Score Prediction Logic
- The model requires exactly 9 marks ordered by Grade (9->11) and Term (1->3).
- Output is a predicted total (0-100) and a corresponding O/L Grade (A, B, C, S, F).

---

## 4) Configuration & Thresholds

- **`SIMILARITY_THRESHOLD = 0.95`**: Located in `main.py`, this controls how strictly the face recognition matches students. Higher values = fewer false positives but more rejections.
- **`NODE_BACKEND_URL`**: Hard-coded to `http://localhost:4000/api` for JWT validation calls.
