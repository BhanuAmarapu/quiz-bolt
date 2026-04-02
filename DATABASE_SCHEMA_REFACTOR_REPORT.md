# Database Refactor Report (Production-Ready, Backward-Compatible)

## Scope And Limitation
- Reviewed MongoDB schema and data structures from code in `server` and `payment-service`.
- Live DB introspection via MCP DB client was not possible in this session because there is no active DB connection.
- To compensate safely, migration scripts were added to inspect and sanitize live data in dry-run mode first.

## 1) Current Schema Issues

### Users
- `email` normalization was not enforced (trim/lowercase), causing potential duplicates by case.
- Weak validation for `name` and `email` format.
- `refreshToken` stored as plain text (security risk).
- Missing index on `role` for role-filtered/admin queries.

### Quizzes
- Missing indexes for heavy query paths (`organizerId`, `parentId`, `status`).
- Question subdocuments had weak constraints (options integrity, correctOption bounds, timeLimit range).
- Inconsistent room code formatting (case/whitespace).
- Paid/price consistency relied on controller behavior, not schema validation.

### Submissions
- Missing indexes for room/session and user history access patterns.
- Potential invalid values for `roomCode`, `timeTaken`, `score`, `selectedOption`.
- Duplicate submissions per user/question/session could exist in historical data.

### Payments
- Manual `createdAt`/`updatedAt` fields and pre-save timestamp mutation instead of canonical `timestamps`.
- Currency/identifier normalization not strict enough.
- Sensitive `razorpaySignature` was selectable by default.

## 2) Improved Schema Design

## Users (`server/models/User.js`)
- Added normalization/validation:
  - `name`: trim, min/max length.
  - `email`: trim, lowercase, format regex, unique.
- Added `role` index.
- Added secure refresh-token helpers:
  - `setRefreshToken(token)` stores bcrypt hash.
  - `matchesRefreshToken(token)` supports legacy plain tokens for compatibility.

### Example shape
```json
{
  "_id": "ObjectId",
  "name": "Tarun",
  "email": "tarun@example.com",
  "password": "bcrypt hash",
  "profilePhoto": "",
  "role": "participant",
  "refreshToken": "bcrypt hash or null",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

## Quizzes (`server/models/Quiz.js`)
- Hardened `QuestionSchema`:
  - text trimming + length bounds.
  - options require at least 2 values.
  - `correctOption` must reference a valid option index.
  - `timeLimit` constrained to 5..300.
- Normalized `roomCode` to uppercase/trim.
- Added indexes:
  - `{ organizerId: 1, createdAt: -1 }`
  - `{ parentId: 1, createdAt: -1 }`
  - `{ status: 1, updatedAt: -1 }`
- Added pre-validate normalization to force `price = 0` when `isPaid` is false.

## Submissions (`server/models/Submission.js`)
- Normalization and numeric constraints:
  - `roomCode` uppercase/trim.
  - `selectedOption` trim.
  - `timeTaken` and `score` min 0.
- Added indexes:
  - `{ roomCode: 1, createdAt: -1 }`
  - `{ userId: 1, createdAt: -1 }`
  - `{ quizId: 1, roomCode: 1 }`
  - existing `{ quizId: 1, userId: 1 }` retained.

## Payments (`payment-service/models/Payment.js`)
- Switched to `timestamps: true`.
- Enforced `currency` enum to `INR`, trim+uppercase.
- Normalized Razorpay ids with trimming.
- Marked `razorpaySignature` as `select: false`.
- Added amount normalization pre-validate.

## 3) Data Sanitization And Migration Steps

### Added scripts
- `server/scripts/migrate-schema-v2.js`
- `payment-service/scripts/migrate-schema-v2.js`

### NPM commands
- In `server/package.json`:
  - `npm run migrate:schema:dry`
  - `npm run migrate:schema:apply`
- In `payment-service/package.json`:
  - `npm run migrate:schema:dry`
  - `npm run migrate:schema:apply`

### What server migration does
- Users:
  - trims name/email/profilePhoto, lowercases email, defaults invalid role.
  - reports duplicate emails.
- Quizzes:
  - normalizes title/roomCode/type/status/isPaid/price/shuffleQuestions.
  - sanitizes question arrays and removes structurally invalid questions.
- Submissions:
  - removes corrupted records with invalid IDs or empty key fields.
  - normalizes roomCode/selectedOption/timeTaken/score.
  - deduplicates duplicate submission groups by retaining newest.
- Applies/ensures indexes.
- Applies Mongo JSON-schema validators in `warn` mode for safe rollout.

### What payment migration does
- Cleans invalid payment records, normalizes amount/currency/status/ids.
- Reports duplicate `razorpayOrderId` groups.
- Applies payment indexes and JSON-schema validator (`warn` mode).

### Safe rollout sequence
1. Backup database snapshots.
2. Run dry-run scripts in both services and review logs.
3. Resolve duplicate-key warnings (especially duplicate emails and Razorpay order IDs).
4. Run apply scripts during low traffic window.
5. Monitor app logs and query latency.
6. After stable period, optionally switch validator action from `warn` to `error`.

## 4) Indexing Recommendations
- Keep:
  - users: `email_1` unique, `role_1`
  - quizzes: `roomCode_1` unique sparse, `organizerId_1_createdAt_-1`, `parentId_1_createdAt_-1`, `status_1_updatedAt_-1`
  - submissions: `quizId_1_userId_1`, `roomCode_1_createdAt_-1`, `userId_1_createdAt_-1`, `quizId_1_roomCode_1`
  - payments: `userId_1_quizId_1`, `razorpayOrderId_1` unique, `razorpayPaymentId_1`, `status_1`, `userId_1_status_1`, `quizId_1_status_1`
- Optional (phase 2, after data quality stabilized):
  - unique submissions guard on `{ userId, quizId, roomCode, questionId }` if duplicate writes are confirmed undesirable.

## 5) Validation And Constraints Added
- Required fields and enum constraints reinforced at model layer.
- Length and format validations added for user-facing fields.
- Numeric boundaries added for pricing/timing/scoring.
- Mongo collection-level validators introduced in migration scripts (`warn` mode).

## 6) Security And Data Safety Improvements
- Refresh tokens are now hashed in DB (with legacy compatibility to avoid breaking existing sessions immediately).
- `razorpaySignature` hidden by default (`select: false`).
- Sanitization scripts remove malformed/corrupted records safely.

## 7) API Alignment
- `server/controllers/authController.js` updated to align with hashed refresh tokens:
  - register/login/refresh now store hashed tokens.
  - refresh uses secure token match helper.
  - logout decodes JWT first, then clears token by user id; retains legacy fallback.
- Existing response payload contracts are preserved.

## 8) Embedding Vs Referencing
- Retained embedding of quiz questions in `Quiz.questions` because read pattern is quiz/session-centric and latency-sensitive.
- Retained referencing for users/quizzes/submissions/payments to support independent lifecycle and analytics.
- This keeps behavior unchanged while improving consistency and scalability.

## 9) Backward Compatibility Notes
- Refresh-token verification supports both hashed and legacy plaintext values.
- No existing API route signatures were changed.
- Migration scripts are dry-run first and non-destructive by default.
