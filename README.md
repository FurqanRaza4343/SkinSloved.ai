# SkinSloved.ai

> AI-Powered Skin Health Platform — Analysis, Product Recommendations, Doctor Appointments & More

## 🚧 Project Status: In Progress

This project is under active development. More features and documentation will be added as we progress.

## ✨ Features

- **Live AI Skin Scanner** — Real-time camera scan with lighting/blur/face guidance, then AI detects skin conditions
- **Skin Profile Detection** — Automatic skin type, Fitzpatrick scale, undertone and tone estimation
- **AI Skin Analysis** — AI-powered skin condition analysis using Mistral Pixtral vision + Groq (Qwen)
- **Product & Medicine Recommendations** — Real products with live images (Open Beauty Facts / Google CSE) and Amazon buy links
- **Doctor-Grade PDF Report** — Skin profile, detected conditions, treatment plan, products table, doctor's assessment + red flags
- **Voice Guidance** — English female TTS (Deepgram) reads results, plus camera guidance
- **Voice Input** — Describe skin concerns by voice, transcribed via Whisper
- **Consultation Flow** — Text/photo consultation with chat follow-ups
- **Skin Diary** — Track skin health with photos and notes
- **Routine Generator** — Personalized AM/PM routine
- **Multi-Language / Payments** — Coming soon

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Backend | FastAPI (Python) |
| Database | PostgreSQL (via InsForge) |
| Auth | InsForge Auth (Email + Google OAuth + GitHub OAuth) |
| AI Vision | Mistral Pixtral + Groq (Llama-4-Scout, Qwen) |
| Speech-to-Text | Groq — Whisper-large-v3 |
| Text-to-Speech | Deepgram — Aura-2-Thalia-EN |
| PDF Reports | fpdf2 |
| Storage | InsForge Storage (S3-compatible) |

## 🏗️ Project Structure

```
SkinSloved.ai/
├── frontend/          # Next.js 15 web app
│   ├── app/           # App router pages
│   ├── components/     # Shared + scanner React components
│   └── lib/            # Utilities, auth context, speech
├── backend/           # FastAPI Python server
│   ├── agents/         # AI agents (scanner, diagnosis, treatment, products, routine)
│   ├── routers/        # API route handlers
│   ├── services/       # Business logic (AI, products, reports, storage)
│   └── main.py         # Entry point
└── .env.example       # Environment variable template
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- InsForge account (for backend services)
- Groq API key
- Deepgram API key (TTS)
- Mistral API key (vision)

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local  # Configure keys incl. NEXT_PUBLIC_BACKEND_URL
npm run dev
```

### Backend Setup

```bash
cd backend
uv venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
uv sync
cp .env.example .env  # Configure your keys
uv run uvicorn main:app --reload
```

## 🔌 Key API Endpoints

- `GET /api/health` — health + integration readiness
- `POST /api/scanner/analyze` — full live scan (image, optional features) → detections, skin_profile, products, PDF, audio
- `POST /api/scanner/analyze-frame` — quick camera frame guidance polling
- `POST /api/consult` & `/api/consult/process` — text/photo consultation
- `POST /api/diary/analyze` & `/api/diary/checkin` — skin diary

## 📄 License

Private — All rights reserved.
