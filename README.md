# Taskzen — Real-Time Collaborative Task Management SaaS

![React](https://img.shields.io/badge/Frontend-React-blue)
![Node](https://img.shields.io/badge/Backend-Node.js-green)
![Socket.IO](https://img.shields.io/badge/Realtime-Socket.IO-black)
![License](https://img.shields.io/badge/license-MIT-blue)

A production-grade MERN application featuring real-time collaboration, offline-first synchronization, and intelligent task insights.

🔗 Live Demo: https://taskzen-orpin.vercel.app/

---

## Key Highlights

- Real-time multi-user collaboration using Socket.IO
- Offline-first architecture with automatic sync on reconnect
- Smart Insights engine (overdue tasks, workload, project health)
- Multi-tenant workspace system with role-based access control
- Kanban board with drag-and-drop (dnd-kit)

---

## What Makes Taskzen Different?

Unlike basic task managers, Taskzen focuses on:

- Real-time multi-user synchronization
- Offline-first interaction model
- Built-in task intelligence (insights engine)

---

## Demo Preview

### Landing Page

![Landing](./screenshots/landing.png)

### Dashboard

![Dashboard](./screenshots/dashboard.png)

### Kanban Board & Insights

![Kanban](./screenshots/kanban.png)

---

## Monorepo Structure

- backend: Express + MongoDB + Socket.IO API server
- frontend: React + TypeScript + Vite client

## Tech Stack

### Backend

- Node.js
- Express 5
- MongoDB + Mongoose
- JWT authentication
- Socket.IO

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router
- TanStack Query
- Axios
- Socket.IO Client
- dnd-kit for drag-and-drop task interactions

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB Atlas cluster (recommended primary)

## Quick Start

### 1. Install dependencies

Backend:

    cd backend
    npm install

Frontend:

    cd frontend
    npm install

### 2. Configure backend environment

Create backend/.env with:

    MONGO_URI_ATLAS=your_mongodb_atlas_connection_string
    # Optional fallback for local/non-Atlas setups:
    # MONGO_URI=mongodb://127.0.0.1:27017/taskzen
    JWT_SECRET=your_jwt_secret
    PORT=5000

MongoDB Atlas quick setup:

1. Create an Atlas project and cluster (M0 is fine for development).
2. Create a database user with readWrite access.
3. Add your current IP address in Atlas Network Access.
4. Copy the mongodb+srv URI from Atlas and set MONGO_URI_ATLAS.
5. URL-encode special password characters (for example @ -> %40, # -> %23).

For full step-by-step Atlas instructions, see backend/README.md.

### 3. Start backend

    cd backend
    npm run dev

### 4. Start frontend

    cd frontend
    npm run dev

Frontend defaults to http://localhost:5173 and backend to http://localhost:5000.

## Applications

### Frontend

- Source: frontend
- Dev command: npm run dev
- Build command: npm run build
- Lint command: npm run lint

### Backend

- Source: backend
- Dev command: npm run dev
- API base URL: http://localhost:5000/api
- Health route: GET /

## Feature Overview

### Real-Time Collaboration

Socket.IO channels support:

- project:task_created
- project:task_updated
- project:task_deleted
- project:comment_created
- project:comment_deleted
- notification

### Offline-First Sync

- Actions (task updates, comments) are queued locally when offline
- UI updates optimistically without blocking user interaction
- On reconnect, queued actions are synced automatically with backend
- Ensures no data loss and smooth user experience during network disruptions

### Authentication

- Register and login endpoints
- JWT token issued on login
- Token attached to API requests in frontend Axios client

### Workspaces and Roles

- Create and delete workspaces
- Invite/remove members
- Owner/admin/member role handling
- Owner-only role elevation constraints

### Projects

- Create, list, and delete projects inside a workspace
- Fetch single project details with workspace linkage
- Project-level Smart Insights endpoint support

### Tasks

- Create and list tasks per project
- Update status (todo, in_progress, completed)
- Reassign tasks
- Update priority (low, medium, high)
- Delete tasks

### Comments

- Add and list task comments
- Delete comments by author or privileged workspace role

### Notifications

- Notification feed per user
- Mark individual notifications as read
- Mark all notifications as read
- Real-time notification delivery for key events:
  - User added to a workspace
  - Task assigned to user
  - New comment on user-relevant task

## Architecture

- **Frontend:** React + TypeScript (Vite, Tailwind, TanStack Query)
- **Backend:** Node.js + Express + MongoDB
- **Realtime Layer:** Socket.IO (event-driven system)
- **Offline Sync:** Local action queue + server reconciliation
- **State Management:** TanStack Query (cache-first, optimistic updates)

### Key Design Decisions

- WebSockets used instead of polling for real-time consistency
- Optimistic UI updates for better user experience
- Role-based middleware for secure multi-tenant access

## System Flow

1. User performs action (create/update task)
2. UI updates optimistically (TanStack Query)
3. API request sent to backend
4. Backend processes and emits Socket.IO event
5. All connected clients receive update in real-time
6. Offline actions are queued and replayed on reconnect

---

## Security and Access Control

- Protected routes require Bearer JWT
- Workspace membership and role checks enforced in middleware
- Role constraints applied for invite/delete/update role workflows

## Build and Quality

Frontend:

    cd frontend
    npm run lint
    npm run build

Backend syntax check:

    cd backend
    node -c server.js

## Data Fetching Strategy

- Server state is managed with TanStack Query in the frontend.
- Query cache is used for projects, tasks, members, activities, and insights.
- Mutations use optimistic cache updates with rollback where appropriate.
- Background refetch and deduplication are handled by query keys.

## Scalability Considerations

- Event-driven architecture reduces polling overhead
- Query caching minimizes redundant API calls
- Modular backend structure supports feature expansion
- Designed for horizontal scaling with stateless API and socket layer separation

## Troubleshooting

### Port already in use

- Backend default: 5000
- Frontend default: 5173 (Vite may auto-shift to 5174, 5175, etc.)

### Real-time updates not appearing

- Ensure both frontend and backend servers are running
- Confirm valid login token exists
- Confirm backend JWT_SECRET matches token signing secret
- Confirm MongoDB connection is healthy

## Known Limitations

- Offline conflict resolution currently uses last-write-wins strategy
- Large-scale real-time load not yet optimized with message queues
- No automated test suite implemented yet

## Roadmap

- Add automated tests (unit/integration/e2e)
- Add API validation layer (schema-based)
- Add environment-based frontend API URL configuration
- Add CI pipeline for lint/build/test
- Add Docker and deployment manifests

## License

This repository is licensed under the terms in LICENSE.
