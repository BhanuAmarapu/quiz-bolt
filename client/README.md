# QuizBolt Client

This is the frontend application for QuizBolt, built with React and Vite.

## Responsibilities

- Authentication screens (login/register/profile)
- Organizer workflows (dashboard, quiz editing, live control, results)
- Participant workflows (join room, play quiz, history)
- Real-time updates through Socket.IO

## Stack

- React
- Vite
- Tailwind CSS
- Axios
- Socket.IO client

## Prerequisites

- Node.js 18+
- Main API server running (`server/`)
- Payment service running (`payment-service/`) for paid quiz flows

## Environment

The client reads API config from the shared root `.env`:

- `VITE_API_URL=/api`

Vite proxy settings are defined in `vite.config.js` for:

- `/api` -> main server
- `/socket.io` -> main server websocket
- `/payment` -> payment service

## Development

```bash
cd client
npm install
npm run dev
```

## Build

```bash
cd client
npm run build
npm run preview
```

## Folder Notes

- `src/pages/` - Route-level screens
- `src/components/` - UI and feature components
- `src/context/` - Auth/theme/socket/data contexts
- `src/services/api.js` - API client layer
- `src/hooks/` - Reusable UI/realtime hooks

## UX Direction

The frontend is designed for fast, clear quiz interactions with:

- High readability for question flow
- Responsive layouts across desktop/mobile
- Organizer-first controls for live sessions
- Participant-first feedback on submissions and standings
