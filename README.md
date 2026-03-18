# Taskzen

Taskzen is a full-stack collaborative task management platform focused on workspace-driven planning, role-based collaboration, and real-time task updates.

The repository is organized as a monorepo with separate frontend and backend applications.

## Highlights

- Workspace-level collaboration with roles: owner, admin, member
- Projects grouped under workspaces
- Kanban-style task management with drag-and-drop status updates
- Task assignment and due-date support
- Task comments and threaded collaboration
- Real-time updates via Socket.IO for task and comment events
- In-app notifications for assignments, comments, and workspace invitations
- JWT-based authentication and protected API routes

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
- Axios
- Socket.IO Client
- dnd-kit for drag-and-drop task interactions

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB instance (local or cloud)

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

    MONGO_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret
    PORT=5000

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

### Tasks

- Create and list tasks per project
- Update status (todo, in_progress, completed)
- Reassign tasks
- Delete tasks

### Comments

- Add and list task comments
- Delete comments by author or privileged workspace role

### Notifications

- Notification feed per user
- Mark individual notifications as read
- Real-time notification delivery for key events:
  - User added to a workspace
  - Task assigned to user
  - New comment on user-relevant task

### Real-Time Events

Socket.IO channels support:

- project:task_created
- project:task_updated
- project:task_deleted
- project:comment_created
- project:comment_deleted
- notification

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

## Troubleshooting

### Port already in use

- Backend default: 5000
- Frontend default: 5173 (Vite may auto-shift to 5174, 5175, etc.)

### Real-time updates not appearing

- Ensure both frontend and backend servers are running
- Confirm valid login token exists
- Confirm backend JWT_SECRET matches token signing secret
- Confirm MongoDB connection is healthy

### Frontend cannot reach API

- Ensure backend runs at http://localhost:5000
- Verify frontend Axios baseURL in frontend/src/services/api.ts

## Roadmap Suggestions

- Add automated tests (unit/integration/e2e)
- Add API validation layer (schema-based)
- Add environment-based frontend API URL configuration
- Add CI pipeline for lint/build/test
- Add Docker and deployment manifests

## License

No explicit license file is currently included in the repository.
