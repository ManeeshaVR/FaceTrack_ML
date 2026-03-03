import io
import base64
import numpy as np
import httpx
from PIL import Image
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Import internal services
from services.config import DEVICE
from services.face_service import image_to_embedding
from services.liveness_service import image_to_liveness
from services.score_service import predict_score_logic

# ===========================================================
# FastAPI app setup
# ===========================================================

app = FastAPI(title="ML Backend — Modular Face & Score API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===========================================================
# Pydantic Schemas
# ===========================================================

class EmbedRequest(BaseModel):
    image_b64: str

class EmbedResponse(BaseModel):
    embedding: list[float]

class LivenessRequest(BaseModel):
    image_b64: str

class LivenessResponse(BaseModel):
    is_live: bool
    confidence: float
    label: str

class RecognizeRequest(BaseModel):
    image_b64: str
    node_token: str

class RecognizeResponse(BaseModel):
    identified: bool
    student_id: str | None = None
    similarity: float | None = None
    message: str

class PredictRequest(BaseModel):
    features: list[float]

class PredictResponse(BaseModel):
    predicted_score: float
    grade: str

# ===========================================================
# Helper Functions
# ===========================================================

def decode_image(b64_data: str) -> Image.Image:
    """Helper to decode base64 string to PIL Image."""
    try:
        if "," in b64_data:
            b64_data = b64_data.split(",", 1)[1]
        image_bytes = base64.b64decode(b64_data)
        return Image.open(io.BytesIO(image_bytes))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {e}")

def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Computes similarity between two normalized vectors."""
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    return float(np.dot(va, vb))

# ===========================================================
# Routes
# ===========================================================

@app.get("/health")
def health():
    return {"ok": True, "device": str(DEVICE)}

@app.post("/embed", response_model=EmbedResponse)
def embed_face(req: EmbedRequest):
    pil_image = decode_image(req.image_b64)
    try:
        embedding = image_to_embedding(pil_image)
        return EmbedResponse(embedding=embedding)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding failed: {e}")

@app.post("/liveness", response_model=LivenessResponse)
def check_liveness(req: LivenessRequest):
    pil_image = decode_image(req.image_b64)
    try:
        result = image_to_liveness(pil_image)
        return LivenessResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Liveness check failed: {e}")

@app.post("/recognize", response_model=RecognizeResponse)
async def recognize_face(req: RecognizeRequest):
    NODE_BACKEND = "http://localhost:4000/api"
    SIMILARITY_THRESHOLD = 0.95
    
    # 1. Embed query image
    pil_image = decode_image(req.image_b64)
    try:
        query_embedding = image_to_embedding(pil_image)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding failed: {e}")

    # 2. Fetch students from Node backend
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{NODE_BACKEND}/students",
                headers={"Authorization": f"Bearer {req.node_token}"},
            )
            resp.raise_for_status()
            students_data = resp.json().get("data", [])
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Node backend unreachable: {e}")

    # 3. Compare embeddings
    best_student_id = None
    best_similarity = -1.0
    candidates = [s for s in students_data if s.get("embeddingsCount", 0) > 0]

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            for student in candidates:
                sid = student["id"]
                detail_resp = await client.get(
                    f"{NODE_BACKEND}/students/{sid}",
                    headers={"Authorization": f"Bearer {req.node_token}"},
                )
                if detail_resp.status_code != 200: continue
                
                stored_embeddings = detail_resp.json().get("embeddings", [])
                for stored_vec in stored_embeddings:
                    sim = cosine_similarity(query_embedding, stored_vec)
                    if sim > best_similarity:
                        best_similarity = sim
                        best_student_id = sid
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Recognition processing error: {e}")

    if best_student_id and best_similarity >= SIMILARITY_THRESHOLD:
        return RecognizeResponse(
            identified=True,
            student_id=best_student_id,
            similarity=round(best_similarity, 4),
            message="Student identified"
        )

    return RecognizeResponse(
        identified=False,
        message="Student not found (below similarity threshold)",
        similarity=round(best_similarity, 4) if best_similarity >= 0 else None
    )

@app.post("/predict", response_model=PredictResponse)
def predict_score(req: PredictRequest):
    if len(req.features) != 9:
        raise HTTPException(status_code=400, detail="Exactly 9 term marks required")
    
    try:
        result = predict_score_logic(req.features)
        return PredictResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")
