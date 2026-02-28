<p align="center">
  <img src="favicon/favicon-32x32.png" alt="SafePulse Logo" width="80" />
</p>

<h1 align="center">SafePulse</h1>
<h3 align="center">Citizen Safety Intelligence Platform</h3>

<p align="center">
  <strong>AI-powered safety ecosystem connecting citizens, guardians, and authorities for real-time urban safety monitoring and emergency response.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/PostGIS-Geospatial-336791?logo=postgresql&logoColor=white" alt="PostGIS" />
  <img src="https://img.shields.io/badge/Mapbox-GL-000000?logo=mapbox&logoColor=white" alt="Mapbox" />
  <img src="https://img.shields.io/badge/scikit--learn-ML-F7931E?logo=scikit-learn&logoColor=white" alt="scikit-learn" />
</p>

---

## 🔭 Overview

**SafePulse** is a comprehensive, role-based safety intelligence platform that transforms urban safety through real-time monitoring, crowd-sourced risk mapping, and instant emergency dispatch. It combines NCRB crime statistics with live citizen reports to generate dynamic risk zones, scores safe routes, and dispatches nearby verified guardians during emergencies — all in real time.

---

## ✨ Key Features

### 🛡️ Citizen Dashboard
- **Interactive Risk Map** — Live Mapbox map with dynamically computed risk zones overlaid, color-coded by severity (Low / Medium / High)
- **Safe Route Navigation** — AI-scored routes that avoid high-risk zones, powered by PostGIS spatial queries and NCRB baseline data
- **One-Tap SOS** — Instant emergency trigger that geo-filters and dispatches the nearest on-duty guardians within 5 km
- **Silent Witness Mode** — Passive background safety monitoring with periodic check-ins; auto-alerts on missed check-ins or entry into risk zones
- **Incident Reporting** — Crowd-source safety reports (harassment, loitering, poor lighting, etc.) that feed the risk engine in real time

### 🦸 Guardian System
- **Real-Time SOS Alerts** — WebSocket-powered instant alerts with citizen location, distance, and one-tap accept/decline
- **Live Location Tracking** — Real-time location sharing between guardian and citizen during active SOS sessions
- **OTP Arrival Verification** — Secure handshake confirmation when guardian reaches the citizen
- **Duty Status Management** — Toggle on-duty/off-duty availability with live location broadcasting
- **Verified Onboarding** — Government ID and credential verification with admin approval workflow

### 🏛️ Authority Dashboard
- **City-Wide Analytics** — Real-time overview of active SOS events, risk zones, and safety metrics
- **SOS Triage Console** — Monitor, prioritize, and manage emergency events with escalation tracking
- **Risk Zone Management** — View, override, and manage AI-generated risk zones
- **User Administration** — Approve/reject guardian applications, manage citizen and authority accounts

### 🤖 AI & Intelligence
- **Oracle Risk Engine** — DBSCAN clustering on geo-tagged reports → dynamic risk zones with severity scoring
- **NCRB Baseline Blending** — Fuses real-time crowd-sourced data (60%) with NCRB crime statistics (40%) for calibrated risk scores
- **PathFinder Route Scorer** — Decodes Mapbox polylines, tests intersection with risk zone polygons, applies NCRB bias multipliers
- **Escalation Engine** — Auto-escalates unresponded SOS after 30 seconds: expands search radius to 10 km + notifies authorities

### 📡 Real-Time Infrastructure
- **WebSocket Manager** — Persistent connections for live SOS alerts, location broadcasts, and system notifications
- **Telegram Bot Integration** — Automated alerts to officials and admin channels for critical events
- **Twilio SMS** — OTP verification and emergency notifications via SMS

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Vercel)                        │
│  React 19 · Vite · TypeScript · Mapbox GL · Framer Motion       │
│  Role-Based UI: Citizen │ Guardian │ Authority │ Admin           │
└──────────────────────────────┬──────────────────────────────────┘
                               │ REST + WebSocket
┌──────────────────────────────▼──────────────────────────────────┐
│                       BACKEND (Render)                          │
│  FastAPI · Uvicorn · SQLAlchemy · Pydantic · Async Python       │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────────┐  │
│  │  Oracle   │ │PathFinder│ │ Failsafe  │ │ Silent Witness   │  │
│  │Risk Engine│ │Route Scor│ │SOS Dispatc│ │Passive Monitoring│  │
│  └──────────┘ └──────────┘ └───────────┘ └──────────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────────┐  │
│  │ Telegram │ │WebSocket │ │   OTP     │ │  NCRB Baseline   │  │
│  │   Bot    │ │ Manager  │ │  Service  │ │    Service       │  │
│  └──────────┘ └──────────┘ └───────────┘ └──────────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                   DATABASE (Supabase)                            │
│  PostgreSQL + PostGIS · GeoAlchemy2 · Spatial Indexes           │
│  Tables: users, reports, risk_zones, sos_events, guardian_alerts│
│          checkins, guardian_locations, ncrb_data                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS |
| **Maps** | Mapbox GL JS, Turf.js (geospatial analysis) |
| **Animations** | Framer Motion, Lottie |
| **Auth** | Google OAuth 2.0, Firebase Auth, JWT |
| **Backend** | FastAPI, Uvicorn, Pydantic, SQLAlchemy (async) |
| **Database** | Supabase (PostgreSQL + PostGIS), GeoAlchemy2 |
| **ML Engine** | scikit-learn (DBSCAN clustering) |
| **Messaging** | Twilio (SMS/OTP), Telegram Bot API |
| **Real-Time** | WebSockets (native FastAPI) |
| **Deployment** | Vercel (frontend), Render (backend) |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.12
- **PostgreSQL** with PostGIS extension (or Supabase project)

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/safepulse.git
cd safepulse
```

### 2. Frontend Setup

```bash
npm install
```

Create a `.env.local` file in the project root:

```env
VITE_API_URL=http://localhost:8000
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

Start the dev server:

```bash
npm run dev
```

### 3. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `backend/.env` file:

```env
DATABASE_URL=postgresql+asyncpg://user:pass@host:port/dbname
JWT_SECRET=your_jwt_secret
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number
TELEGRAM_BOT_TOKEN=your_telegram_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
CORS_ORIGINS=http://localhost:5173
```

Start the backend:

```bash
uvicorn app.main:app --reload --port 8000
```

### 4. Access the App

| Service | URL |
|---------|-----|
| Frontend | `http://localhost:5173` |
| Backend API | `http://localhost:8000` |
| API Docs (Swagger) | `http://localhost:8000/docs` |
| API Docs (ReDoc) | `http://localhost:8000/redoc` |

---

## 📂 Project Structure

```
safepulse/
├── Team_CodeZilla_SafePulse/src/
│   ├── pages/                  # Role-specific UI pages
│   │   ├── CitizenPage.tsx     # Main citizen dashboard + map
│   │   ├── GuardianPage.tsx    # Guardian SOS alerts + tracking
│   │   ├── AuthorityDashboard  # Authority analytics overview
│   │   ├── AuthoritySosPage    # SOS triage console
│   │   ├── AdminPage.tsx       # Admin management portal
│   │   ├── TrackPage.tsx       # Real-time SOS tracking map
│   │   ├── ReportPage.tsx      # Incident reporting form
│   │   └── LoginPage.tsx       # Auth with Google OAuth
│   ├── services/               # API clients & map logic
│   │   ├── mapService.ts       # Mapbox integration + risk zones
│   │   ├── routingService.ts   # Safe route computation
│   │   ├── authService.ts      # Authentication flows
│   │   └── reportService.ts    # Report CRUD operations
│   ├── components/             # Shared UI components
│   ├── context/                # React context (Auth)
│   └── utils/                  # Helpers & formatters
│
├── backend/
│   └── app/
│       ├── main.py             # FastAPI app entry point
│       ├── routes/             # API endpoints
│       │   ├── auth.py         # Login, register, JWT
│       │   ├── failsafe.py     # SOS trigger + dispatch
│       │   ├── oracle.py       # Risk zone clustering
│       │   ├── pathfinder.py   # Route safety scoring
│       │   ├── silent_witness  # Check-in monitoring
│       │   ├── reports.py      # Incident CRUD + geo
│       │   ├── users.py        # Profile + guardian mgmt
│       │   ├── otp.py          # OTP generation & verify
│       │   ├── websocket.py    # WS connection manager
│       │   └── telegram.py     # Bot webhook handler
│       ├── services/           # Business logic
│       │   ├── risk_engine.py  # DBSCAN + NCRB blending
│       │   ├── sos.py          # Geo-filtered dispatch
│       │   ├── route_scorer.py # Polyline risk analysis
│       │   ├── silent_witness  # Passive monitoring
│       │   └── telegram_bot.py # Alert notifications
│       ├── models/             # SQLAlchemy + PostGIS models
│       ├── schemas/            # Pydantic request/response
│       ├── database/           # Async DB session factory
│       └── config/             # Settings & env vars
│
├── App.tsx                     # Root component + routing
├── index.html                  # Entry HTML with Tailwind
├── vite.config.ts              # Vite build configuration
├── render.yaml                 # Render deployment config
└── package.json                # Frontend dependencies
```

---

## 🔐 Role-Based Access

| Role | Access Level |
|------|-------------|
| **Citizen** | Risk map, SOS trigger, safe routes, silent witness, incident reports |
| **Guardian** | All citizen features + SOS alerts, live tracking, OTP verification |
| **Authority** | City dashboard, SOS triage, risk zone management, user administration |
| **Admin** | Full system access + personnel management, system alerts, guardian approvals |

---

## 🧠 How the Risk Engine Works

```
Citizen Reports (Crowd-Sourced)        NCRB Crime Statistics
        │                                       │
        ▼                                       ▼
  DBSCAN Clustering                    City Baseline Score
  (haversine metric,                   (normalized 0-100)
   200m radius, min 3)                         │
        │                                       │
        ▼                                       │
  Real-Time Score                               │
  Σ(severity × recency)                        │
        │                                       │
        └──────────────┬────────────────────────┘
                       ▼
              Blended Risk Score
         (60% real-time + 40% NCRB)
                       │
                       ▼
              Risk Zone (0-100)
         LOW < 30 | MEDIUM < 60 | HIGH ≥ 60
```

---

## 🆘 SOS Emergency Flow

1. **Citizen triggers SOS** → GPS coordinates captured
2. **Geo-filtered search** → Find on-duty guardians within 5 km with fresh locations (≤ 60s)
3. **Instant dispatch** → WebSocket alerts pushed to all eligible guardians
4. **Guardian accepts** → Row-level DB lock prevents race conditions; other alerts auto-cancelled
5. **Live tracking** → WebSocket location sharing between citizen ↔ guardian
6. **OTP verification** → Guardian confirms physical arrival with one-time code
7. **Auto-escalation** → If no response within 30s: search expands to 10 km + authority dashboard notified
8. **Telegram alert** → Critical events broadcast to official admin/authority channels

---

## 🤝 Team

**Team CodeZilla** — Built at a hackathon with ❤️ for citizen safety.

---

## 📄 License

This project is proprietary. All rights reserved.
