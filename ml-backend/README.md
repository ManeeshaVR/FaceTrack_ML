# FaceTrack — ML Backend (FastAPI)

This is the dedicated AI service provider for the FaceTrack application ecosystem. Designed as a separated python microservice, it handles heavy computational tasks like Face Recognition, Liveness Detection, and algorithmic Academic Score Prediction without blocking the primary Node.js portal.

---

## 🎨 Tech Stack & Libraries

| Category           | Technology & Frameworks        | Description                                                                 |
| :---               | :---                           | :---                                                                        |
| **Runtime Engine** | `Python 3.12+`                 | High-level language standard for deep learning implementations.             |
| **Web Framework**  | `FastAPI`                      | Extremely fast, modern Python web framework for building APIs.              |
| **Server**         | `Uvicorn`                      | Lightning-fast ASGI web server implementation.                              |
| **Deep Learning**  | `PyTorch` (`torch`, `torchvision`) | Primary machine learning framework for training and running neural networks. |
| **Numerical Data** | `NumPy` & `SciPy`              | Matrix operations, Fast Fourier Transforms, and Cosine Similarities.        |
| **Tree Ensembles** | `Scikit-learn` & `Joblib`      | Used to execute the trained Random Forest Regression model.                 |
| **Image Handler**  | `Pillow` (PIL)                 | Python Image Library used to crop, resize, and convert base64 strings.      |
| **Client Calls**   | `HTTPX`                        | Fully async HTTP client for rapid inter-service communication.              |

---

## 🚀 Setup & Installation

### 1. Prerequisites
- `Python` 3.12 (standard for PyTorch/Torchvision compatibility)
- A configured Python Virtual Environment (`venv`)

### 2. Local Environment Configuration
Navigate specifically into the `ml/ml-backend` folder structure:

```bash
# 1. Activate your virtual environment (Windows)
.\venv\Scripts\activate
# Source on Mac/Linux: source venv/bin/activate

# 2. Install all required neural network dependencies
pip install -r requirements.txt

# 3. Start the ASGI Server (Hot-Reload enabled)
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
The ML API server will boot up instantly and be accessible at `http://localhost:8000`.

---

## 🧠 The AI Models (`/models` directory)

All PyTorch `.pt` and Scikit-learn `.pkl` files are centralized in the `models/` folder. The system expects these files to be present on boot.

1. **`final_face_embedding_resnet18_triplet.pt`** (ResNet18 Backbone)
    - Functionality: Receives a 160x160 aligned face image and compresses its geometrical facial features into a concise **128-dimensional numerical vector**.
    - Training: Fine-tuned from a pretrained backbone using **Triplet Loss** (pulling identical face vectors closer while pushing unknown faces further away in Euclidean space).

2. **`liveness_model.pt`** (MobileNetV2 Architecture)
    - Functionality: A robust anti-spoofing classifier. It analyzes crop textures to determine if the camera is viewing a real 3D human face, or being tricked by a flat digital screen or printed photograph.
    - Training: Trained via the established **CASIA-FASD** (Face Anti-Spoofing Database).

3. **`ol_prediction_model.pkl`** (Random Forest Regressor)
    - Functionality: An ensemble decision-tree algorithm built in Scikit-learn that evaluates 9 consecutive term marks (from Grade 9 to 11) to predict the outcome of the final O/L exam.
    - Training: Sourced and augmented from localized student performance datasets. Unlike standard deep neural networks, Random Forests are mathematically resistant to overfitting on small tabular datasets.

---

## 📡 Core Endpoint Documentation (`main.py`)

The ML backend uses `Pydantic` schemas for strict data validation on incoming requests.

| Method | Endpoint | Internal Service Map | Description |
| :---   | :---     | :--- | :--- |
| `GET`  | `/health`| `N/A` | Returns system config (e.g., if PyTorch is using the CPU or CUDA). |
| `POST` | `/embed` | `services/face_service.py` | Receives a base64 string, converts it via PIL, passes it through the **ResNet18** model, and returns a `list[float]` 128-d embedding for registration. |
| `POST` | `/liveness` | `services/liveness_service.py` | Scans a base64 string using **MobileNetV2**. Combines the Neural Network probability score with mathematical Laplacian texture variances to return an automated `is_live` boolean decision. |
| `POST` | `/recognize` | `main.py` -> `httpx` | Combines base64 inputs with an authentication JWT. Embeds the live image, async fetches enrolled students from Node.js (via port `4000`), computes matrix **Cosine Similarities**, and strictly identifies the student if the threshold exceeds **95%**. |
| `POST` | `/predict` | `services/score_service.py` | Accepts an exact array length of `9` float values. Triggers the Scikit-learn pipeline to return a percentage `predicted_score` (0.0 - 100.0) and assigns an alphabetical Sri Lanka O/L Grade map (`A`, `B`, `C`, `S`, `F`). |

---

## ⚙️ Threshold Configurations

If the AI models need to be tuned for a specific physical environment (e.g., a classroom with poor webcam lighting), you can adjust the internal threshold thresholds hardcoded into the services:

- **`SIMILARITY_THRESHOLD`** (in `main.py`): Controls how aggressively the system attempts a Face Match. Lowering it increases successful matches but risks false positives (buddy-punching).
- **`NN_LIVE_THRESHOLD`** (in `services/liveness_service.py`): Controls the neural network confidence required to pass the liveness check. A higher number ensures absolute strict anti-spoofing.
- **Node Backend Map**: The FastAPI dynamically attempts to contact the main portal at `http://localhost:4000/api` for all student enrollment lookups during the `/recognize` cycle. Ensure the Node server is active!
