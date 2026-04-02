# QuizBolt - Ignite Your Learning

QuizBolt is a modern, real-time quiz platform designed to make learning interactive, competitive, and measurable. It supports live quiz sessions, role-based flows, payment-enabled quizzes, session analytics, and a responsive front-end experience.

## What This Repository Contains

- `client/` - React + Vite frontend used by participants and organizers
- `server/` - Main API service (auth, quizzes, submissions, live quiz socket flow)
- `payment-service/` - Payment and revenue service (Razorpay integration)

## Key Highlights

- Real-time quiz participation with instant updates
- Interactive, gamified learning experience
- Role-based organizer and participant workflows
- Revenue and payment support for paid quizzes
- Secure auth/session handling and scalable service split

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, Socket.IO client
- API: Node.js, Express, Mongoose, Socket.IO, JWT
- Data: MongoDB, Redis (session/cache support)
- Payments: Razorpay integration via payment microservice

## Prerequisites

- Node.js 18+
- MongoDB instance
- Redis instance (for production-like realtime behavior)
- Razorpay keys (for paid quiz flows)

## Environment Setup

1. Copy the shared environment file:

```bash
copy .env.example .env
```

2. Update values in `.env` for your local machine.

Note: This project uses a shared root `.env` consumed by both `server/` and `payment-service/`.

## Install Dependencies

Run from repository root:

```bash
npm install
```

Install service-level dependencies if needed:

```bash
cd server && npm install
cd ../payment-service && npm install
cd ../client && npm install
```

## Run Services (Development)

Open separate terminals:

```bash
cd server
npm run dev
```

```bash
cd payment-service
npm run dev
```

```bash
cd client
npm run dev
```

## Default Local Ports

- Client: `5173`
- Main API server: `5000`
- Payment service: `5001`

## Production/Deployment Notes

- Docker compose support is available in `docker-compose.yml`
- AWS deployment guide is available in `DEPLOYMENT_AWS.md`

## Additional Documentation

- `PROJECT_STRUCTURE.md` - folder and service layout details
- `IMPLEMENTATION_STATUS.md` - implementation progress overview
- `DATABASE_SCHEMA_REFACTOR_REPORT.md` - schema hardening and migration details

## Vision

To ignite curiosity, enhance learning, and build a global platform where knowledge becomes an exciting and competitive journey.

QuizBolt - Learn. Compete. Evolve.
