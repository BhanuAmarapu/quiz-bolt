# ⚡ QuizBolt - Real-Time Quiz Platform

QuizBolt is a premium, real-time quiz application designed for high-speed engagement and competitive learning.

## 🚀 Key Features
- **Real-Time Dashboards**: Instant leaderboard updates using Socket.io.
- **Secure Answers**: Server-side SHA-256 hashing for all answers—no cheating!
- **Speed-Based Scoring**: `Score = 1000 - (time_taken * 50)`.
- **Role-Based Access**: Specialized views for Admins, Organizers, and Participants.
- **Premium UI**: Modern glassmorphic design built with React, Tailwind CSS, and Framer Motion.

## 🛠 Tech Stack
- **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Axios, Socket.io-client.
- **Backend**: Node.js, Express, MongoDB (Mongoose), Socket.io, JWT, Crypto.

## 🏁 Getting Started

### 1. Prerequisites
- Node.js installed.
- MongoDB running locally or a MongoDB Atlas connection string.

### 2. Backend Setup
```bash
cd server
npm install
# Update .env with your MONGO_URI and JWT_SECRET
npm start
```

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev
```

## 🔒 Security
QuizBolt prioritizes security:
1. **No Client-Side Answers**: Correct answers are only stored on the server as SHA-256 hashes.
2. **JWT Protected Routes**: Middleware ensures only authorized users can create or manage quizzes.
3. **Speed Truncation**: Answer submission is locked immediately after the server-side timer expires.

## 🏆 Ranking Logic
Leaderboards are calculated after every question based on:
1. **Correctness**: 0 points for wrong answers.
2. **Total Score**: Descending order.
3. **Response Time**: Tie-breaker based on faster total response time.
