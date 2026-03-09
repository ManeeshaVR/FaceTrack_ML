# FaceTrack — ML Frontend (React)

This standalone **React + Vite** frontend is the dedicated AI-powered interface for admins and teachers. It connects to both the primary Node.js management backend and the Python Machine Learning backend simultaneously to deliver advanced features like face-recognition attendance and algorithmic score predictions.

---

## 🎨 Tech Stack & Libraries

| Category       | Technology | Description |
| :---           | :--- | :--- |
| **Framework**  | `React 19` (via Vite 6) | The latest iteration of React for highly concurrent rendering. |
| **Language**   | `TypeScript` | Strongly typed JavaScript for highly reliable data flows. |
| **Routing**    | `react-router` (v7) | Next-generation client-side routing. |
| **Styling**    | `Tailwind CSS` | Utility-first CSS framework for custom, modern UI designs. |
| **Icons**      | `Lucide React` | Clean, modern vector icons. |
| **HTTP Client**| `Axios` | Promise-based HTTP client to handle multiple distinct API servers. |

---

## 🚀 Setup & Installation

### 1. Requirements
This portal **requires** both the Node.js Main Backend (`port 4000`) and the Python ML Backend (`port 8000`) to be running simultaneously to function properly.

### 2. Local Environment
Open a terminal in the `ml` directory:

```bash
# Install all dependencies
npm install

# Start the Vite development server
npm run dev
```
The application will be accessible at `http://localhost:5173`. (If the Main Portal is already occupying port `5173`, Vite will auto-assign `5174`).

### 3. Production Build
```bash
npm run build
```
Generates the optimized static distribution inside `dist/`.

---

## 🧠 Core AI Features & Pages

The ML Portal focuses strictly on the implementation of three major AI operations:

### 1. Automated Face Registration (`/students`)
- Lists all students fetched from the main Node database.
- Features a **Face Record Modal** that activates the device web camera.
- Teachers capture multiple photos from different angles.
- Snapshots are submitted as Base64 strings to the AI Backend where a **ResNet18** model generates a 128-dimensional mathematical embedding and saves it directly to MongoDB.

### 2. Secure Attendance Marking (`/attendance`)
- Select a specific `Class Schedule` from a dropdown.
- **Liveness Detection Toggle**: Determines if the application should strictly enforce anti-spoofing logic.
- Starts an automated scanning cycle (every 20 seconds).
- The camera stream is verified in real-time by the Python server:
    1. **Liveness Check**: Rejects photos or screens using MobileNetV2 + texture analysis.
    2. **Face Recognition**: Computes Cosine Similarities against the database embeddings.
    3. **Verification**: Checks Node.js to see if the student is currently enrolled and if their fees are paid.
    4. Returns Access Result cards (Granted / Spoof Detected / Unknown).

### 3. O/L Score Prediction (`/score`)
- View a roster of current Grade 11 students.
- Clicking the predictor aggregates exactly **9 historical term marks** (from Grade 9, 10, and 11) from the Node.js API.
- Submits the array to the Python AI server's **Random Forest Regressor**.
- Instantly returns a predicted final percentage (0–100%) and local Sri Lanka O/L Grade (A, B, C, S, F).

### 4. Guidance Terminal (`/guidance`)
- Comprehensive, in-app documentation providing teachers with exact usage guidelines, lighting requirements for cameras, and troubleshooting tips.

---

## 📁 Architecture Overview

```text
ml/
├── src/
│   └── app/
│       ├── components/          # Camera modals, Student cards, and Avatar generation.
│       ├── data/
│       │   ├── api.ts           # Axios instances mapping to Node (:4000) and ML (:8000)
│       │   └── types.ts         # Shared TypeScript interfaces for strict typing.
│       ├── pages/               # Functional view controllers (Login, Students, Attendance)
│       ├── App.tsx              # Application layout shell wrapper
│       └── routes.tsx           # React Router DOM mapping
├── ml-backend/                  # The separated Python FastAPI service layer
├── package.json
└── vite.config.ts
```

---

## 🔌 API Configuration

The UI uses two distinct Axios instances located in `src/app/data/api.ts`.
By default, it assumes the standard local ports:

```typescript
// For JWT Auth, enrollment validation, and fetching historical marks
const NODE_URL = 'http://localhost:4000/api';

// For heavy lifting: Embeddings, Liveness, and Random Forest Predictor
const ML_URL = 'http://localhost:8000';
```