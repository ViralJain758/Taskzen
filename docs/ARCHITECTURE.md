# Architecture

## High-Level Overview

Taskzen is a two-app monorepo:

- `backend`: REST API + Socket.IO server
- `frontend`: SPA client using React and TanStack Query

Core design goals:

- Realtime collaboration
- Offline-first usability
- Role-based workspace security

## Backend Architecture

Key modules:

- `server.js`: app bootstrap, middleware, Socket.IO, route mounting
- `src/routes`: domain routers (`auth`, `workspace`, `project`, `task`, `comment`, `notification`, `activity`)
- `src/controllers`: request handlers
- `src/models`: Mongoose schemas and data constraints
- `src/middleware`: auth, role checks, validation
- `src/validation`: Zod request schemas

### Request Pipeline

1. Security middleware (CORS, helmet, hpp, sanitization)
2. Global API rate limit
3. JWT auth middleware for protected routes
4. Request validation middleware (`validateRequest` + Zod)
5. Controller logic
6. Optional Socket.IO event emission

### Access Control

- JWT identifies user
- Membership checks validate workspace access
- Role checks enforce allowed actions (`owner`, `admin`, `member`)

## Frontend Architecture

Key modules:

- `src/routes/AppRouter.tsx`: route map
- `src/providers/AppProviders.tsx`: Query + sidebar + notification providers
- `src/context/AuthContext.tsx`: auth state lifecycle
- `src/services/*.ts`: API service layer
- `src/pages/*`: feature pages

### Server-State Strategy

TanStack Query manages server-state and cache keys (for example, tasks, members, activities, insights).

Patterns used:

- Query-driven fetches
- Optimistic updates for mutations
- Retry and refetch by query key

## Realtime Architecture

Socket transport: Socket.IO

Server rooms:

- `workspace:<workspaceId>`
- `project:<projectId>`
- personal room by user id

Common events:

- `project:task_created`
- `project:task_updated`
- `project:task_deleted`
- `project:comment_created`
- `project:comment_deleted`
- `workspace:activity_created`
- `notification`

## Offline Sync Architecture

Offline queue behavior:

1. User triggers task/comment mutation while offline.
2. Frontend stores action in local queue.
3. UI updates optimistically.
4. On reconnect, queue is replayed to API.
5. Frontend refreshes tasks/comments and clears synced actions.

Current conflict strategy:

- Last-write-wins

## Data Model Domains

- User
- Workspace
- Membership
- Project
- Task
- Comment
- Notification
- Activity

Relationships:

- Workspace has owner + many memberships
- Membership connects user and workspace with role
- Project belongs to workspace
- Task belongs to project
- Comment belongs to task and author
- Activity captures audit-like project/workspace events

## Error Handling

- Controllers return domain-level status codes (`400`, `401`, `403`, `404`, `500`)
- Generic internal error responses are used in production paths
- Frontend maps API/technical errors to user-friendly messages

## Performance Considerations

- Query caching reduces redundant calls
- Event-driven updates reduce polling
- Route-level validation blocks invalid payloads early

## Security Considerations

- JWT-protected routes
- Input validation with Zod
- Sanitization middleware
- Helmet and HPP protections
- Rate limiting on auth and API scopes
