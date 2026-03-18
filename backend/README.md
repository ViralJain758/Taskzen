## Backend Overview

A scalable Node.js API powering a real-time collaborative SaaS platform.

Key capabilities:

- JWT-based authentication and role-based authorization
- Event-driven real-time system using Socket.IO
- Multi-tenant workspace architecture
- Smart Insights generation for project analytics

## Stack

- Node.js
- Express 5
- MongoDB with Mongoose
- JWT authentication
- Socket.IO for real-time features
- Smart Insights generation endpoint for project health and risk signals

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
          index.js
          authRoutes.js
          workspaceRoutes.js
          projectRoutes.js
          taskRoutes.js
          commentRoutes.js
          notificationRoutes.js

## Environment Variables

Create backend/.env:

```
# Optional fallback for local/non-Atlas setups:
MONGO_URI=mongodb://127.0.0.1:27017/taskzen
MONGO_URI_ATLAS=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret
PORT=5000
```

### MongoDB Atlas Setup (Recommended)

1. Create an Atlas project and cluster:

- Open MongoDB Atlas and create a new project.
- Create an M0 free cluster (or higher tier).

2. Create a database user:

- Go to Database Access.
- Create a user with readWrite permissions for your application database.

3. Configure network access:

- Go to Network Access.
- Add your current IP address for local development.
- For temporary testing, you can allow 0.0.0.0/0 (not recommended long-term).

4. Copy the connection string:

- In your cluster, click Connect > Drivers.
- Copy the mongodb+srv URI.
- Replace <username>, <password>, and database name.

5. Set backend/.env:

   MONGO_URI_ATLAS=mongodb+srv://<username>:<password>@<cluster-url>/taskzen?retryWrites=true&w=majority

6. URL-encode special characters in passwords:

- Example: @ becomes %40, # becomes %23.

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
- GET /projects/insights/:projectId

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

## Routing Notes

- Route mounting is centralized via src/routes/index.js.
- API modules remain split by domain (auth/workspace/project/task/comment/notification).

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
