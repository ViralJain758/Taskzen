# Getting Started

This guide sets up Taskzen locally on Windows/macOS/Linux.

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB Atlas account or local MongoDB instance

## Repository Structure

- `backend`: Express + MongoDB + Socket.IO API
- `frontend`: React + Vite client

## 1) Install Dependencies

Backend:

```bash
cd backend
npm install
```

Frontend:

```bash
cd frontend
npm install
```

## 2) Configure Environment

Create `backend/.env`:

```env
MONGO_URI_ATLAS=your_mongodb_atlas_uri
MONGO_URI=mongodb://127.0.0.1:27017/taskzen
JWT_SECRET=replace_with_strong_secret
PORT=5000
```

Behavior:

- If `MONGO_URI_ATLAS` is provided and valid, Atlas is used.
- If not, backend can fall back to `MONGO_URI` (local MongoDB).

## 3) Run Backend

```bash
cd backend
npm run dev
```

Expected health response:

- `GET http://127.0.0.1:5000/` returns `Taskzen API running`

## 4) Run Frontend

```bash
cd frontend
npm run dev
```

Frontend URL:

- `http://127.0.0.1:5173`

## 5) Create First Data

1. Open the app.
2. Register a new user.
3. Create a workspace.
4. Create a project.
5. Create and move tasks.
6. Add comments to tasks.

## Build Commands

Frontend:

```bash
cd frontend
npm run build
```

Backend syntax check:

```bash
cd backend
node -c server.js
```

## Common Local Commands

Backend logs:

```powershell
Get-Content -Path backend/logs/combined.log -Tail 120
```

Port checks (Windows):

```powershell
netstat -ano | findstr :5000
netstat -ano | findstr :5173
```

Kill process by PID:

```powershell
taskkill /PID <PID> /F
```

## Next Docs

- [Architecture](ARCHITECTURE.md)
- [API Reference](API_REFERENCE.md)
- [Deployment](DEPLOYMENT.md)
- [Troubleshooting](TROUBLESHOOTING.md)
