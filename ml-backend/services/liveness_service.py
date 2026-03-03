import numpy as np
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
from .config import DEVICE

# ===========================================================
# Initialization
# ===========================================================

LIVENESS_MODEL_PATH = "models/liveness_model.pt"
LIVENESS_LIVE_IDX  = 0
LIVENESS_THRESHOLD = 0.95

print(f"Loading liveness model on {DEVICE} …")
_liveness_base = models.mobilenet_v2(weights=None)
_liveness_base.classifier[1] = nn.Linear(_liveness_base.last_channel, 2)
_liveness_base.load_state_dict(torch.load(LIVENESS_MODEL_PATH, map_location=DEVICE))
_liveness_base.eval()
liveness_model = _liveness_base.to(DEVICE)
print("Liveness model loaded ✅")

LIVENESS_TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

# ===========================================================
# Helper Functions
# ===========================================================

def compute_texture_score(pil_image: Image.Image) -> float:
    gray = np.array(pil_image.convert('L').resize((128, 128)), dtype=np.float32)
    c = gray[1:-1, 1:-1]
    lap = (
        gray[:-2,  1:-1] +
        gray[2:,   1:-1] +
        gray[1:-1, :-2]  +
        gray[1:-1, 2:]   -
        4.0 * c
    )
    variance = float(np.var(lap))
    return float(min(variance / 1500.0, 1.0))

def compute_frequency_score(pil_image: Image.Image) -> float:
    gray = np.array(pil_image.convert('L').resize((128, 128)), dtype=np.float64)
    hy = np.hanning(gray.shape[0])
    hx = np.hanning(gray.shape[1])
    windowed = gray * np.outer(hy, hx)
    fft_shift = np.fft.fftshift(np.fft.fft2(windowed))
    magnitude  = np.log1p(np.abs(fft_shift))
    mag_max = magnitude.max()
    if mag_max == 0:
        return 0.0
    mag_norm = magnitude / mag_max
    h, w    = mag_norm.shape
    cy, cx  = h // 2, w // 2
    mag_norm[cy-6:cy+6, cx-6:cx+6] = 0.0
    threshold   = 0.75
    peak_pixels = float(np.sum(mag_norm > threshold))
    peak_ratio  = peak_pixels / (h * w)
    spoof_score = min(peak_ratio / 0.003, 1.0)
    return float(spoof_score)

def crop_face_region(pil_image: Image.Image) -> Image.Image:
    w, h   = pil_image.size
    left   = int(w * 0.31)
    right  = int(w * 0.69)
    top    = int(h * 0.25)
    bottom = int(h * 0.75)
    return pil_image.crop((left, top, right, bottom))

def image_to_liveness(pil_image: Image.Image) -> dict:
    if pil_image.mode != "RGB":
        pil_image = pil_image.convert("RGB")

    face_crop = crop_face_region(pil_image)
    tensor = LIVENESS_TRANSFORM(face_crop).unsqueeze(0).to(DEVICE)
    
    with torch.no_grad():
        logits = liveness_model(tensor)
        probs  = torch.softmax(logits, dim=1).squeeze(0)
    
    p_live_nn = float(probs[LIVENESS_LIVE_IDX].cpu())
    p_live_texture = compute_texture_score(face_crop)
    p_spoof_freq   = compute_frequency_score(face_crop)
    p_live_freq    = 1.0 - p_spoof_freq

    NN_LIVE_THRESHOLD = 0.50
    is_live = p_live_nn >= NN_LIVE_THRESHOLD

    status = "LIVE ✅" if is_live else "SPOOF 🚫"
    print(
        f"[LIVENESS] NN={p_live_nn:.3f}  "
        f"tex(info)={p_live_texture:.3f}  "
        f"freq(info)={p_live_freq:.3f}  "
        f"threshold={NN_LIVE_THRESHOLD}  → {status}"
    )

    return {
        "is_live":    is_live,
        "confidence": round(p_live_nn, 4),
        "label":      "live" if is_live else "spoof",
    }
