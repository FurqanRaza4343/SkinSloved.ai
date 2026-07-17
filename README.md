# SkinSloved.ai

> AI-Powered Skin Health Platform — Analysis, Product Recommendations, Doctor Appointments & More

## 🚧 Project Status: In Progress

This project is under active development. More features and documentation will be added as we progress.

## ✨ Planned Features

- **AI Skin Analysis** — Upload photos and get AI-powered skin condition analysis using Groq (Llama-4-Scout)
- **Voice Input** — Describe your skin concerns using voice, transcribed via Whisper
- **Product Recommendations** — AI-generated skincare product suggestions with real-time images from Open Beauty Facts
- **Doctor Appointments** — Book consultations with verified dermatologists
- **Skin Diary** — Track your skin health over time with photos and notes
- **PDF Reports** — Downloadable consultation reports
- **Multi-Language Support** — Coming soon
- **Subscription Payments** — Stripe integration (coming soon)
- **Educational Content** — Skincare guides and articles (coming soon)

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Backend | FastAPI (Python) |
| Database | PostgreSQL (via InsForge) |
| Auth | InsForge Auth (Email + Google OAuth + GitHub OAuth) |
| AI Vision | Groq — Llama-4-Scout-17B-16E-Instruct |
| Speech-to-Text | Groq — Whisper-large-v3 |
| Text-to-Speech | Deepgram — Aura-2-Thalia-EN |
| PDF Reports | fpdf2 |
| Storage | InsForge Storage (S3-compatible) |

## 🏗️ Project Structure

```
SkinSloved.ai/
├── frontend/          # Next.js 15 web app
│   ├── app/           # App router pages
│   ├── components/    # Shared React components
│   └── lib/           # Utilities & auth context
├── backend/           # FastAPI Python server
│   ├── routers/       # API route handlers
│   ├── services/      # Business logic (AI, products, reports)
│   └── main.py        # Entry point
├── migrations/        # Database migration scripts
└── .env.example       # Environment variable template (coming soon)
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- InsForge account (for backend services)
- Groq API key
- Deepgram API key

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local  # Configure your keys
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

## 📄 License

Private — All rights reserved.
