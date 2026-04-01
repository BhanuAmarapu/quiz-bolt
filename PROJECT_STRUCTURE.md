# Quiz Platform Enhancement - Project Structure

## Overview

This project has been enhanced with a microservices architecture for scalability and containerization.

## Directory Structure

```
quiz-platform/
├── backend/                 # Backend microservice
│   ├── config/             # Configuration files
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Express middleware
│   ├── models/             # Mongoose models
│   ├── routes/             # API routes
│   ├── utils/              # Utility functions
│   ├── tests/              # Test files
│   ├── server.js           # Entry point
│   ├── package.json        # Dependencies
│   └── .env.example        # Environment variables template
│
├── payment-service/        # Payment microservice
│   ├── config/             # Configuration files
│   ├── controllers/        # Payment controllers
│   ├── models/             # Payment models
│   ├── routes/             # Payment routes
│   ├── tests/              # Test files
│   ├── server.js           # Entry point
│   ├── package.json        # Dependencies
│   └── .env.example        # Environment variables template
│
├── frontend/               # Frontend microservice
│   ├── src/                # React source code
│   ├── public/             # Static assets
│   ├── package.json        # Dependencies
│   └── .env.example        # Environment variables template
│
├── client/                 # Original client (legacy)
├── server/                 # Original server (legacy)
│
└── docker-compose.yml      # Docker orchestration (to be created)
```

## Services

### Backend Service (Port 5000)
- User authentication and authorization
- Quiz management (CRUD operations)
- Template and question bank management
- Quiz room scheduling and capacity management
- WebSocket server for real-time features
- Revenue dashboard for organizers

### Payment Service (Port 5001)
- Razorpay payment integration
- Payment order creation
- Payment verification
- Webhook handling
- Payment status queries

### Frontend Service (Port 80)
- React application
- Quiz UI
- Payment integration
- Real-time quiz rooms
- Organizer dashboards

## Getting Started

### Install Dependencies

```bash
# Backend service
cd backend
npm install

# Payment service
cd payment-service
npm install

# Frontend service
cd frontend
npm install
```

### Environment Setup

Copy `.env.example` to `.env` in each service directory and configure:

```bash
cp backend/.env.example backend/.env
cp payment-service/.env.example payment-service/.env
cp frontend/.env.example frontend/.env
```

### Running Services

```bash
# Backend
cd backend && npm run dev

# Payment Service
cd payment-service && npm run dev

# Frontend
cd frontend && npm run dev
```

## Next Steps

1. Implement database schemas (Task 2)
2. Set up Docker containers (Task 20)
3. Configure AWS EC2 deployment (Task 22)
