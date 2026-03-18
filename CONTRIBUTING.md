# Contributing to Taskzen

Thank you for contributing to Taskzen.

## Development Setup

1. Fork and clone the repository.
2. Install dependencies:

   cd backend
   npm install

   cd ../frontend
   npm install

3. Configure backend environment:

   cp backend/.env.example backend/.env

4. Start both services:

   cd backend
   npm run dev

   cd ../frontend
   npm run dev

## Branch Naming

Use clear branch names:

- feature/<short-description>
- fix/<short-description>
- chore/<short-description>
- docs/<short-description>

## Commit Guidelines

Prefer small, focused commits. Recommended format:

- feat: add workspace invitation notification
- fix: reconnect socket on token rotation
- docs: update backend API reference

## Pull Request Checklist

- Code builds successfully.
- Lint passes for frontend:

      cd frontend
      npm run lint

- Frontend build passes:

      cd frontend
      npm run build

- Backend starts without syntax/runtime errors.
- Documentation updated if behavior changed.
- Screenshots/GIFs added for UI changes when applicable.

## Coding Standards

- Keep changes minimal and targeted.
- Avoid unrelated refactors in the same pull request.
- Keep public API behavior backward compatible unless discussed.
- Add clear naming and maintain existing style conventions.

## Reporting Issues

When filing bugs, include:

- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser/OS and version
- Relevant logs or screenshots
