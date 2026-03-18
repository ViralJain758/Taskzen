# Taskzen Backend

Taskzen backend is a Node.js API built with Express, MongoDB, and Socket.IO. It provides authentication, workspace/project/task/comment management, and real-time collaboration events.

## Stack

- Node.js
- Express 5
- MongoDB with Mongoose
- JWT authentication
- Socket.IO for real-time features

## Directory Structure

    backend/
      server.js
      package.json
      .env
      src/
        config/
          db.js
        controllers/
          authController.js
          workspaceController.js
          projectController.js
          taskController.js
          commentController.js
          notificationController.js
        middleware/
          authMiddleware.js
          workspaceRoleMiddleware.js
        models/
          User.js
          Workspace.js
          Membership.js
          Project.js
          Task.js
          Comment.js
          Notification.js
        routes/
          authRoutes.js
          workspaceRoutes.js
          projectRoutes.js
          taskRoutes.js
          commentRoutes.js
          notificationRoutes.js

## Environment Variables

Create backend/.env:

    MONGO_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret
    PORT=5000

## Installation

    npm install

## Run

Development:

    npm run dev

Server starts on PORT (default 5000).

Health check:

    GET /

## API Base

    http://localhost:5000/api

## Authentication Model

- Login issues JWT with payload containing userId
- Protected endpoints require header:

  Authorization: Bearer <token>

- authMiddleware verifies JWT and attaches user to request

## Authorization Model

- Workspace role middleware validates membership and allowed role set
- Roles:
  - owner
  - admin
  - member

## Data Models

### User

- name (required)
- email (required, unique)
- password (required, hashed)
- avatar (optional)

### Workspace

- name (required)
- owner (User reference, required)

### Membership

- user (User reference, required)
- workspace (Workspace reference, required)
- role (owner/admin/member)

### Project

- name (required)
- description (optional)
- workspace (Workspace reference, required)
- createdBy (User reference, required)

### Task

- title (required)
- description (optional)
- status (todo/in_progress/completed)
- priority (low/medium/high)
- project (Project reference, required)
- assignee (User reference, optional)
- createdBy (User reference, required)
- dueDate (optional)

### Comment

- content (required)
- task (Task reference, required)
- author (User reference, required)

### Notification

- user (User reference, required)
- message (required)
- type (task/comment/workspace)
- isRead (default false)

## REST API Endpoints

### Auth

- POST /auth/register
- POST /auth/login

### Workspaces

- POST /workspaces
- GET /workspaces
- DELETE /workspaces/:workspaceId
- POST /workspaces/:workspaceId/invite
- GET /workspaces/:workspaceId/members
- DELETE /workspaces/:workspaceId/members/:memberId
- PATCH /workspaces/:workspaceId/members/:memberId/role
- DELETE /workspaces/:workspaceId/leave

### Projects

- GET /projects/detail/:projectId
- POST /projects/:workspaceId
- GET /projects/:workspaceId
- DELETE /projects/:workspaceId/:projectId

### Tasks

- POST /tasks/:projectId
- GET /tasks/:projectId
- GET /tasks/:projectId/assignees
- PATCH /tasks/:taskId/status
- PATCH /tasks/:taskId
- DELETE /tasks/:taskId

### Comments

- POST /comments/:taskId
- GET /comments/:taskId
- DELETE /comments/:commentId

### Notifications

- GET /notifications
- PATCH /notifications/:notificationId/read

## Real-Time Socket.IO

Socket server runs on the same backend host and requires JWT auth in handshake:

    auth: { token: <jwt> }

On connection:

- User socket joins personal room by userId

Supported rooms:

- project:<projectId>
- workspace:<workspaceId>
- user room: <userId>

Supported socket events:

### Client to Server

- joinWorkspace
- leaveWorkspace
- joinProject
- leaveProject

### Server to Client

- project:task_created
- project:task_updated
- project:task_deleted
- project:comment_created
- project:comment_deleted
- notification

## Notification Triggers

- Workspace invite creates workspace notification
- Task create/update assignment creates task notification
- New comment on relevant task creates comment notification

## Error Handling

- Validation and auth errors return structured JSON messages
- Typical status codes: 400, 401, 403, 404, 500

## Local Verification

Syntax check:

    node -c server.js

Manual smoke test:

1. Register and login
2. Create workspace and project
3. Create and update tasks
4. Add comments
5. Confirm realtime events and notifications

## Deployment Notes

- Configure strong JWT_SECRET
- Restrict CORS origin policy for production domains
- Store secrets in deployment secret manager
- Add process manager (PM2/systemd/container runtime)
