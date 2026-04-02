# QuizBolt Payment Service

This service manages quiz payments and revenue analytics for QuizBolt.

## Responsibilities

- Create payment orders
- Verify payment signatures
- Track payment status for quiz access
- Process payment webhooks
- Aggregate revenue metrics by quiz/time

## Tech Stack

- Node.js
- Express
- Mongoose (MongoDB)
- Razorpay SDK

## Setup

Uses shared root `.env`.

Required environment variables include:

- `DATABASE_URL`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `WEBHOOK_SECRET`
- `JWT_SECRET`
- `CORS_ORIGIN`

## Run

```bash
cd payment-service
npm install
npm run dev
```

For production:

```bash
npm start
```

## Migration Scripts

```bash
npm run migrate:schema:dry
npm run migrate:schema:apply
```

Run dry first, then apply after reviewing output.

## API Routes (high-level)

- `/payment/create-order`
- `/payment/verify`
- `/payment/status/:quizId`
- `/payment/status/batch`
- `/payment/webhook`
- `/payment/revenue/*`

## Notes

- Payment records are keyed by `razorpayOrderId` for idempotency.
- Revenue controllers aggregate only completed payments.
