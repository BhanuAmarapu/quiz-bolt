# QuizBolt Server

This service is the main backend for QuizBolt. It handles authentication, quiz management, submission tracking, and realtime quiz orchestration.

## Responsibilities

- User authentication and profile endpoints
- Quiz/subject creation and management
- Question CRUD inside quizzes
- Submission history and leaderboard aggregation
- Socket.IO live quiz session flow
- Integration calls to payment service when needed

## Tech Stack

- Node.js
- Express
- Mongoose (MongoDB)
- Socket.IO
- JWT auth
- Redis (session/cache helper)

## Setup

Uses shared root `.env`.

Required environment variables include:

- `MONGO_URI`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `REDIS_URL`
- `CLIENT_URL`
- `PAYMENT_SERVICE_URL`

## Run

```bash
cd server
npm install
npm run dev
```

For production:

```bash
npm start
```

## Migration Scripts

Schema/data migration commands:

```bash
npm run migrate:schema:dry
npm run migrate:schema:apply
```

Dry run is recommended before apply.

## API Routes (high-level)

- `/api/auth/*`
- `/api/quiz/*`
- `/api/payment/*` (proxy/integration routes)

## Notes

- Realtime quiz session handlers are in `sockets/quizHandler.js`.
- Model constraints and index recommendations are documented in `DATABASE_SCHEMA_REFACTOR_REPORT.md`.
