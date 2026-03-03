import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
from .config import DEVICE

# ===========================================================
# Model Definition
# ===========================================================

class FaceEmbeddingNet(nn.Module):
    def __init__(self, embedding_dim: int = 128):
        super().__init__()
        backbone = models.resnet18(weights=None)
        in_features = backbone.fc.in_features
        backbone.fc = nn.Identity()
        self.backbone = backbone
        self.head = nn.Sequential(
            nn.Linear(in_features, 256),
            nn.ReLU(),
            nn.Linear(256, embedding_dim),
        )

    def forward(self, x):
        features = self.backbone(x)
        embeddings = self.head(features)
        return nn.functional.normalize(embeddings, p=2, dim=1)

# ===========================================================
# Initialization
# ===========================================================

MODEL_PATH = "models/final_face_embedding_resnet18_triplet.pt"

print(f"Loading face embedding model on {DEVICE} …")
model = FaceEmbeddingNet(embedding_dim=128).to(DEVICE)
model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
model.eval()
print("Face embedding model loaded ✅")

TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

def image_to_embedding(pil_image: Image.Image) -> list[float]:
    """Convert a PIL image to a 128-d embedding vector."""
    if pil_image.mode != "RGB":
        pil_image = pil_image.convert("RGB")
    tensor = TRANSFORM(pil_image).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        embedding = model(tensor)
    return embedding.squeeze(0).cpu().tolist()
