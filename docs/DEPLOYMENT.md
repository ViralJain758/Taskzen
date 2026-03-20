# Deployment

This guide describes a practical deployment baseline for Taskzen.

## Environment Variables

Backend required variables:

- `MONGO_URI_ATLAS` or `MONGO_URI`
- `JWT_SECRET`
- `PORT` (default `5000`)

Recommended optional variables:

- `NODE_ENV=production`
- `FRONTEND_URL` (if used by CORS setup)

## Build Steps

Frontend:

```bash
cd frontend
npm ci
npm run build
```

Backend:

```bash
cd backend
npm ci
node -c server.js
```

## Runtime Topology

- Frontend served as static assets (Vercel/Netlify/Nginx)
- Backend hosted as Node service (VM/container/platform service)
- MongoDB Atlas for production database

## Recommended Production Checks

1. Backend health endpoint responds.
2. Auth register/login flow works.
3. Workspace/project/task CRUD works for at least one account.
4. Socket realtime events are received by a second logged-in client.
5. Notifications and activities are persisted.

## CORS and API Base URL

- Configure backend CORS to allow the deployed frontend origin.
- Configure frontend API base URL to point to deployed backend.

## Logging

- Persist `backend/logs/combined.log` and `backend/logs/error.log` in runtime volumes.
- Integrate with centralized log tooling in production when available.

## Rollback Strategy

Minimum approach:

1. Keep previous backend artifact/container image.
2. Keep previous frontend build release.
3. Roll back both if critical API contract mismatch appears.

## Post-Deploy Smoke Test

1. Open app and login.
2. Create workspace and project.
3. Create, move, and edit a task.
4. Add and delete a comment.
5. Verify realtime update in another browser session.
