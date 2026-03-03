# ML Portal — AI-Powered Face Attendance & Score Prediction

This is the **React + Vite** teacher-facing portal that connects to both the Node.js backend and the Python ML backend. It provides three AI-powered features: student face registration, face-recognition attendance marking with liveness detection, and O/L score prediction.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + Vite 6 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Routing | React Router v7 |
| HTTP client | Axios |
| Icons | Lucide React |

---

## Project Structure

```
ml/
├── src/
│   └── app/
│       ├── components/
│       │   ├── FaceRecordModal.tsx   # Camera modal for capturing face embeddings
│       │   ├── StudentAvatar.tsx     # Gender-aware avatar component
│       │   └── StudentCard.tsx       # Student list card
│       ├── data/
│       │   ├── api.ts           # All API functions (Node + ML backend)
│       │   └── types.ts         # Shared TypeScript interfaces
│       ├── pages/
│       │   ├── Login.tsx        # JWT login page
│       │   ├── Dashboard.tsx    # Shell with tab navigation
│       │   ├── Students.tsx     # Student list + face registration
│       │   ├── Attendance.tsx   # Camera-based attendance marking
│       │   ├── Score.tsx        # O/L score prediction
│       │   └── Guidance.tsx     # System usage guide
│       ├── App.tsx
│       └── routes.tsx
├── ml-backend/                  # Python FastAPI ML server
├── package.json
└── vite.config.ts
```

---

## Pages

### Students
- Lists all students from the Node backend.
- Click the camera icon to open the face registration modal.
- Capture 10+ photos from multiple angles, then click **Save Embeddings**.
- Embeddings are sent as base64 images to the ML backend, converted to 128-d vectors, and stored in MongoDB.

### Attendance
- Select a class schedule from the dropdown.
- Toggle **Liveness Detection** on/off (recommended: on).
- Click **Start Marking Attendance** — camera activates.
- Scan cycle: first scan after 10 s, then every 20 s.
- Each scan runs: Liveness check → Face recognition → Enrollment and payment check → Auto-save attendance.
- Result cards: Access Granted / Denied / Already Marked / Spoof Detected / Unknown.

### Score
- Select a Grade 11 student, then click **Predict Scores**.
- Fetches all term marks from the Node backend (9 marks per subject required).
- Calls the ML `/predict` endpoint for each subject with complete data.
- Displays predicted score (0-100) and grade letter (A/B/C/S/F using Sri Lanka O/L boundaries).

### Guidance
- In-app documentation covering all features, tips, and cautions.

---

## API Configuration

All base URLs are in `src/app/data/api.ts`:

```typescript
const NODE_URL = 'http://localhost:4000/api';   // Node.js backend
const ML_URL   = 'http://localhost:8000';       // Python ML backend
```

---

## Running the Dev Server

```bash
npm install      # first time only
npm run dev      # starts on http://localhost:5173
```

> All three servers must be running simultaneously:
> - Node.js backend on port 4000
> - Python ML backend on port 8000
> - This React dev server on port 5173

---

## Build for Production

```bash
npm run build    # output in dist/
```