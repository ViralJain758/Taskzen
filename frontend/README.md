# Taskzen Frontend

Taskzen frontend is a React + TypeScript single-page application for collaborative workspace and project management. It includes realtime task board updates, role-aware workspace interactions, and in-app notifications.

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router
- TanStack Query
- Axios
- Socket.IO Client
- dnd-kit for drag-and-drop interactions
- react-hot-toast for notifications

## Directory Structure

    frontend/
      index.html
      package.json
      src/
        App.tsx
        main.tsx
        index.css
        App.css
        components/
          AppErrorBoundary.tsx
          Sidebar.tsx
          Topbar.tsx
          Footer.tsx
          NotificationBell.tsx
          ConfirmDialog.tsx
          LoadErrorCard.tsx
          SmartInsightsPanel.tsx
        context/
          AuthContext.tsx
          auth-context.ts
          SidebarContext.tsx
          NotificationContext.tsx
        layouts/
          MainLayout.tsx
        pages/
          Landing.tsx
          Login.tsx
          Register.tsx
          Dashboard.tsx
          WorkspacePage.tsx
          ProjectPage.tsx
          Privacy.tsx
          Terms.tsx
        services/
          api.ts
          workspaceService.ts
          projectService.ts
          taskService.ts
          notificationService.ts
        sockets/
          socket.ts
        types/
          user.ts
          api.ts

## Installation

    npm install

## Run

Development:

    npm run dev

Production build:

    npm run build

Preview production build:

    npm run preview

Lint:

    npm run lint

## Environment and API Integration

The API base URL is currently configured in src/services/api.ts:

    http://localhost:5000/api

The app expects backend server availability at localhost:5000 and uses JWT Bearer tokens for protected requests.

## Authentication Flow

- Login/register pages call backend auth endpoints
- JWT token and user profile are persisted in localStorage
- Axios default Authorization header is set through setAuthToken
- AuthContext manages session state across app

## Routing

Main routes include:

- /
- /login
- /register
- /dashboard
- /workspace/:workspaceId
- /project/:projectId
- /privacy
- /terms

Protected experiences are embedded in MainLayout with Sidebar and Topbar context.

## Core UX Modules

### Dashboard

- Lists user workspaces
- Create workspace
- Delete workspace (owner)
- Leave workspace (admin/member)

### Workspace Page

- List projects in selected workspace
- Create/delete projects
- Manage members (invite/remove/update role)

### Project Page

- Kanban board grouped by status
- Drag-and-drop status movement
- Create, assign, reassign, and delete tasks
- Update task priority
- Add/delete comments on tasks
- Smart Insights panel with cached fetches and manual refresh
- Offline queue and sync behavior for task/comment changes

## Server State Strategy (TanStack Query)

- QueryClient is configured at app-provider level.
- Primary query caches:
  - workspace-projects
  - workspace-members
  - workspace-activities
  - project-tasks
  - project-insights
- Cache-first mutations are used for:
  - task create/update/delete flows
  - project create/delete flows
  - member role/remove/invite flows
- Retry, deduplication, and background refetch are handled by TanStack Query.
- Avoid manual useEffect + setState fetching for server state.

### Notification System

- Notification bell in topbar
- Unread counter and dropdown
- Mark single/all as read
- Realtime updates with Socket.IO
- High z-index rendering for overlay visibility above page cards/forms

## Realtime Socket Architecture

Shared socket client in src/sockets/socket.ts:

- Uses token-aware auth synchronization
- Supports reconnect on token changes
- Project page joins/leaves project rooms
- NotificationContext listens for notification events

Incoming events handled by UI:

- project:task_created
- project:task_updated
- project:task_deleted
- project:comment_created
- project:comment_deleted
- notification

## State and Contexts

- AuthContext: user and token lifecycle
- SidebarContext: mobile/sidebar visibility state
- NotificationContext: notification feed, unread count, mark read operations
- TanStack Query: server-state caching, optimistic updates, and refetch control

## Service Layer Summary

- workspaceService: workspace and member operations
- projectService: project operations
- taskService: task and comment operations
- notificationService: notification fetch and read updates
- api: shared Axios instance and auth header management

## Resilience and Error Handling

- Global app-level error boundary via AppErrorBoundary.
- Centralized API/network error toasts via Axios response interceptor.
- Page-level retry cards for major data loads.
- Skeleton shimmer placeholders during loading states.

## UI and Styling

- Tailwind utility-first styling
- Responsive layouts for desktop and mobile
- Reusable surface-card design language
- Toast messaging for user feedback

## Known Operational Notes

- Vite may switch from 5173 to alternate ports (5174, 5175) if in use
- Backend must run for API and realtime functionality
- JWT token must be valid for socket connection and protected APIs

## Troubleshooting

### App loads but no data

- Confirm backend is running at localhost:5000
- Confirm successful login and token presence in localStorage
- Check browser network tab for API errors

### Realtime updates not visible

- Verify socket authentication token is set
- Verify backend socket server is running
- Check browser console for connect_error logs

### Notification dropdown hidden behind content

- Topbar and notification components use elevated z-index layers
- Ensure no custom parent stacking context overrides are introduced

## Quality Commands

    npm run lint
    npm run build
