# API Reference

Base URL:

- `http://127.0.0.1:5000/api`

Health:

- `GET /` (outside `/api`)

Auth:

- Bearer JWT required for protected routes:

```http
Authorization: Bearer <token>
```

## Auth Routes

Prefix: `/auth`

- `POST /auth/register`
- `POST /auth/login`

## Workspace Routes

Prefix: `/workspaces`

- `POST /workspaces`
- `GET /workspaces`
- `DELETE /workspaces/:workspaceId`
- `POST /workspaces/:workspaceId/invite`
- `GET /workspaces/:workspaceId/members?page=1&limit=10`
- `DELETE /workspaces/:workspaceId/members/:memberId`
- `PATCH /workspaces/:workspaceId/members/:memberId/role`
- `DELETE /workspaces/:workspaceId/leave`

## Project Routes

Prefix: `/projects`

- `GET /projects/detail/:projectId`
- `GET /projects/insights/:projectId`
- `POST /projects/:workspaceId`
- `GET /projects/:workspaceId`
- `DELETE /projects/:workspaceId/:projectId`

## Task Routes

Prefix: `/tasks`

- `POST /tasks/:projectId`
- `GET /tasks/:projectId`
- `GET /tasks/:projectId/assignees`
- `PATCH /tasks/:taskId/status`
- `PATCH /tasks/:taskId`
- `DELETE /tasks/:taskId`

## Comment Routes

Prefix: `/comments`

- `POST /comments/:taskId`
- `GET /comments/:taskId`
- `DELETE /comments/:commentId`

## Notification Routes

Prefix: `/notifications`

- `GET /notifications`
- `PATCH /notifications/:notificationId/read`

## Activity Routes

Prefix: `/activities`

- `GET /activities/workspace/:workspaceId?page=1&limit=20`
- `GET /activities/:projectId`

## Typical Response Codes

- `200`: success
- `201`: created
- `400`: validation failure / bad request
- `401`: unauthorized
- `403`: forbidden (role/membership)
- `404`: not found
- `429`: rate limited
- `500`: internal server error

## Notes

- Request validation is enforced by Zod schemas in backend middleware.
- Role checks are enforced on workspace/project-sensitive operations.
- Several route handlers emit Socket.IO events after successful writes.
