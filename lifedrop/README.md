# 🩸 LifeDrop — Emergency Blood Donor App

A full-stack real-world application connecting blood donors with recipients in emergency situations.

---

## 🏗️ Architecture

```
lifedrop/
├── backend/               # Node.js + Express API
│   ├── config/            # Database connection
│   ├── middleware/        # Auth, error handling, rate limiting
│   ├── routes/            # All API endpoints
│   ├── services/          # Notification, badge services
│   ├── socket/            # Real-time Socket.io handlers
│   ├── jobs/              # Scheduled cron jobs
│   └── server.js          # Entry point
├── frontend/              # React 18 app
│   └── src/
│       ├── pages/         # All screens
│       ├── components/    # Shared UI components
│       ├── services/      # Axios API client
│       ├── hooks/         # useSocket, useGeolocation
│       └── context/       # Zustand global state
├── database/              # PostgreSQL + PostGIS schema
├── ai/                    # Smart matching engine
└── docker-compose.yml     # One-command deployment
```

---

## ✨ Features

### Core Features
| Feature | Description |
|---|---|
| 🔐 Auth | JWT-based register/login (donor, receiver, or both) |
| 🗺️ Donor Search | Filter by blood group, location radius, availability |
| 🩸 Blood Requests | Create, browse, respond to blood requests |
| 🚨 SOS Broadcast | One-tap alert to all nearby compatible donors |
| 💬 Real-time Chat | Donor ↔ recipient messaging via Socket.io |
| 📊 Donation History | Track past donations, enforce 90-day rule |
| 🔔 Push Notifications | Firebase FCM push + in-app notifications |
| 🏅 Badges & Points | Gamified achievement system |
| 🏥 Blood Banks | Find nearby blood banks with inventory |

### AI Features
| Feature | Description |
|---|---|
| 🤖 Smart Matching | Scores donors by distance + availability + donation history |
| 📈 Likelihood Prediction | Predicts probability a donor will respond |
| 🔄 Auto-notify | Automatically finds and notifies top matched donors on request creation |

---

## 🚀 Quick Start

### Option 1: Docker (Recommended)
```bash
git clone https://github.com/yourrepo/lifedrop
cd lifedrop

# Copy env files
cp backend/.env.example backend/.env
# Edit backend/.env with your JWT_SECRET

# Start everything
docker-compose up --build
```
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api

---

### Option 2: Manual Setup

#### Prerequisites
- Node.js 18+
- PostgreSQL 14+ with PostGIS extension
- npm or yarn

#### 1. Database Setup
```bash
# Create database
psql -U postgres -c "CREATE DATABASE lifedrop;"

# Enable PostGIS
psql -U postgres -d lifedrop -c "CREATE EXTENSION postgis;"

# Run schema
psql -U postgres -d lifedrop -f database/schema.sql
```

#### 2. Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT_SECRET
npm run dev
# Runs on http://localhost:5000
```

#### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm start
# Runs on http://localhost:3000
```

---

## 📡 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, get JWT token |

### Donors
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/donors/nearby` | Find donors by location + blood group |
| PUT | `/api/donors/:id/availability` | Toggle availability status |
| GET | `/api/donors/:id/profile` | View donor profile |

### Blood Requests
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/requests` | Create new request (triggers AI match + notify) |
| GET | `/api/requests` | List requests (with filters) |
| GET | `/api/requests/:id` | Get request detail + responses |
| POST | `/api/requests/:id/respond` | Donor responds to a request |
| PATCH | `/api/requests/:id` | Update request status |

### SOS
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/sos` | Broadcast emergency SOS |
| GET | `/api/sos/active` | Get active SOS alerts nearby |
| POST | `/api/sos/:id/resolve` | Resolve an SOS |

### Donations
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/donations/confirm` | Confirm a donation (+points) |
| GET | `/api/donations/my` | Donor's history |
| GET | `/api/donations/eligibility` | Check 90-day eligibility |

### Chat
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/chat/conversations` | List all conversations |
| GET | `/api/chat/:userId` | Get message thread |
| POST | `/api/chat/:userId` | Send a message |

### AI
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ai/match` | Run smart donor matching |
| POST | `/api/ai/predict` | Predict donation likelihood |

---

## 🤖 AI Matching Algorithm

```
Score = (distance_score × 40) + availability_bonus(20) + recency_score(25) + response_history(15)
      × urgency_multiplier (1.0 – 1.3)
```

- **Distance score**: Donors closer to the request score higher
- **Availability**: Only available donors get the full bonus
- **Recency**: Donors who haven't donated recently (but are past 90 days) score higher
- **Response history**: Donors with a high past response rate score higher
- **Urgency multiplier**: Critical requests boost all scores by 30%

---

## 🔔 Real-time Events (Socket.io)

| Event | Direction | Description |
|---|---|---|
| `sos_alert` | Server → Client | New SOS broadcast |
| `new_message` | Server → Client | Incoming chat message |
| `donor_responded` | Server → Client | A donor accepted your request |
| `join_blood_group` | Client → Server | Subscribe to blood group alerts |
| `location_update` | Client → Server | Update real-time location |
| `typing` | Client → Server | Typing indicator in chat |

---

## 🛡️ Security

- Passwords hashed with **bcryptjs** (salt rounds: 12)
- JWT tokens expire after **30 days**
- Rate limiting: 100 req/15min globally, 10 req/15min for auth endpoints
- All routes protected with `authenticate` middleware
- Input validation with **express-validator**
- Helmet.js HTTP security headers

---

## 📱 Pages / Screens

| Screen | Route | Description |
|---|---|---|
| Login | `/login` | Phone + password login |
| Register | `/register` | New user signup with location |
| Home | `/` | Dashboard with stats and nearby requests |
| Donors | `/donors` | Map + list of nearby donors |
| Requests | `/requests` | Browse and create blood requests |
| Request Detail | `/requests/:id` | Full details + respond |
| SOS | `/sos` | Emergency broadcast page |
| Profile | `/profile` | User profile, badges, settings |
| Notifications | `/notifications` | All notifications |
| Donations | `/donations` | Donation history + confirm |
| Chat | `/chat` | Conversations list |
| Chat Thread | `/chat/:userId` | Real-time messaging |
| Blood Banks | `/blood-banks` | Nearby blood banks + inventory |

---

## 🗃️ Database Tables

`users` · `donations` · `blood_requests` · `request_responses` · `sos_alerts` · `notifications` · `badges` · `user_badges` · `blood_banks` · `messages` · `ai_match_logs`

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router 6, Zustand, React Query, Socket.io Client, React Leaflet |
| Backend | Node.js, Express 4, Socket.io, node-cron |
| Database | PostgreSQL 15 + PostGIS |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Push Notifications | Firebase Admin SDK (FCM) |
| File Uploads | Cloudinary |
| Deployment | Docker + Docker Compose, Nginx |

---

## 🤝 Contributing

Pull requests welcome! For major changes, please open an issue first.

## 📄 License

MIT © LifeDrop
