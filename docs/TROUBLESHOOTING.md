# Troubleshooting

## Frontend not loading

Symptoms:

- blank page
- cannot open landing page

Checks:

1. Ensure frontend is running:

```bash
cd frontend
npm run dev
```

2. Open exact URL:

- `http://127.0.0.1:5173`

3. If port conflict occurs:

```powershell
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

4. Hard refresh browser (`Ctrl+F5`).

## Backend fails to start on port 5000

Symptoms:

- `EADDRINUSE: address already in use :::5000`

Fix:

```powershell
netstat -ano | findstr :5000
taskkill /PID <PID> /F
cd backend
npm run dev
```

## API returns 500 Internal Server Error

1. Tail combined log:

```powershell
Get-Content -Path backend/logs/combined.log -Tail 120
```

2. If available, check error log:

```powershell
Get-Content -Path backend/logs/error.log -Tail 120
```

3. Reproduce once, then capture exact timestamp and endpoint.

## Login fails unexpectedly

Checks:

- Verify `JWT_SECRET` is set in `backend/.env`.
- Confirm backend is running on expected URL.
- Confirm frontend is sending token via Authorization header.

## Realtime updates not appearing

Checks:

- User must be authenticated (valid token in socket auth).
- Backend must be running and accepting websocket connections.
- Project/workspace room join events must run on page load.

## Comments or task updates fail

Checks:

- Verify task id and project membership are valid.
- Confirm request body passes backend validation schema.
- Inspect latest `POST /api/comments/:taskId` or `PATCH /api/tasks/*` logs.

## Build fails in frontend

Run:

```bash
cd frontend
npm run build
```

Common cause:

- type-only import requirements with `verbatimModuleSyntax`

## Build fails in backend

Basic syntax check:

```bash
cd backend
node -c server.js
```

Then start and inspect runtime logs:

```bash
npm run dev
```

## Known Warning: Duplicate email index

You may see:

- duplicate schema index warning for User email

This is typically caused by defining an index both in field options and `schema.index(...)`.

It is a warning, but recommended to clean up to reduce noise.
