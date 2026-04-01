# QuizBolt Architectural Drawbacks & Improvement Roadmap

While QuizBolt provides a premium, high-speed educational experience, there are several architectural and feature-level trade-offs currently in place. Addressing these is essential for a production-grade transition.

---

### 1. [RESOLVED] In-Memory Session Management (Scalability Risk)
- **Current State**: Active quiz sessions (scores, timers, and participants) are now explicitly managed via **Redis** with a `rebootQuizzes` state-recovery logic.
- **Implementation**: Replaced `setInterval` with expiry-based `setTimeout` calculations that survive server restarts. All session data is persisted in Redis.

### 2. Lack of Reconnection Support (UX Flickering)
- **Current State**: If a student refreshes their browser or their internet flickers, they lose the current question state and their local score until the *next* question is broadcast.
- **Drawback**: This causes frustration in high-stakes competitive environments where every second counts.
- **Solution**: Implement a `sync_state` socket event that the client calls on `mount`. The server should reply with the current question index, remaining time, and the user's current rank.

### 3. Client-Side Speed Trust (Cheat Vulnerability)
- **Current State**: The `timeTaken` (speed) is currently calculated on the frontend and sent to the server.
- **Drawback**: A tech-savvy student could potentially use the browser console to emit a `submit_answer` event with `timeTaken: 0.1`, artificially boosting their score.
- **Solution**: The server should record a `lastQuestionBroadcastTimestamp`. Upon receiving an answer, the server calculates the speed as `Current Time - Broadcast Time`.

### 4. Memory Leaks (Cleanup Logic)
- **Current State**: Once a quiz is "Completed," the session data remains in the `quizSessions` Map indefinitely.
- **Drawback**: Over time, this consumes the server's RAM. In a busy environment, the server will eventually run out of memory and crash.
- **Solution**: Implement a **Cleanup Service** that clears session data from the Map 10 minutes after a quiz is marked as `completed`.

### 5. Static Subject Analytics
- **Current State**: The new "Subject Leaderboard" is fetched once when the button is clicked.
- **Drawback**: If a quiz is currently running inside that subject, the cumulative leaderboard doesn't update in real-time unless the organizer re-opens the modal.
- **Solution**: Add a "Live Mastery" view that uses Sockets to stream score updates across all quizzes within a subject to the organizer's dashboard.

### 6. Limited CRUD Operations
- **Current State**: The UI focuses heavily on "Adding" (Creating). There is no interface for deleting a specific question, editing a typo in a quiz title, or removing a Subject folder.
- **Drawback**: Users are forced to manually edit the MongoDB database if they make a mistake during quiz creation.
- **Solution**: Build a "Management Suite" with Delete/Move/Edit actions for every level of the hierarchy.

### 7. [RESOLVED] Global CORS Exposure
- **Current State**: Both main server and payment service are now strictly locked to authorized origins via `CLIENT_URL` and `CORS_ORIGIN` env variables.
- **Implementation**: Enforced `credentials: true` for secure cookie handling and restricted headers/methods.

### 8. [RESOLVED] No Data Portability
- **Current State**: All users can now export their session history to **CSV** format for external analysis.
- **Implementation**: Added "Export CSV" buttons to both Organizer and Participant history views.