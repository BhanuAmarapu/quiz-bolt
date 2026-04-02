# Frontend Code Review - QuizBolt React Application

**Date:** April 2, 2026  
**Project:** QuizBolt Frontend (React + Vite + Tailwind CSS)  
**Assessment Level:** **INTERMEDIATE+ | Production-Adjacent**

---

## Executive Summary

Your React frontend demonstrates **solid foundational practices** with good UI/UX design and reasonable component organization. The recent refactor work addressed several of the biggest production risks: error boundaries, reusable UI primitives, socket cleanup, toast cleanup, and quiz-room decomposition. The project is now **production-adjacent** with a smaller, more focused set of architectural gaps remaining.

### Quality Score Breakdown
- **Architecture & Structure:** 8/10 ✅
- **Component Design:** 7.8/10 ✅
- **Code Quality:** 7.9/10 ✅
- **Performance:** 7.2/10 ✅
- **State Management:** 7.2/10 ⚠️
- **Error Handling:** 8.4/10 ✅
- **Best Practices:** 8/10 ✅

**Overall Assessment:** 7.8/10 - **Intermediate+, Production-Adjacent**

---

## Post-Refactor Update

The following issues called out in the original review are now addressed in code:

- Global error boundaries were added around the app shell.
- Shared confirmation and toast patterns were extracted into reusable components.
- Quiz-room rendering was split into focused presentational components.
- Socket listener cleanup now uses exact handler references.
- Toast timers now clean up on unmount and re-trigger safely.
- Shared UI primitives now have sensible defaults and cleaner APIs.
- The client now uses a single root environment model and proxy-based API paths.
- Profile editing was added, including server support for profile metadata.

Remaining work is mostly architectural rather than corrective:

- `AppDataContext` still holds a custom cache layer that could be replaced with a server-state library.
- `OrganizerDashboard` and `OrganizerEdit` are improved, but they are still large feature containers.
- Accessibility coverage is better than before, but focus management and skeleton states remain incomplete.

---

## Key Strengths

### 1. ✅ Well-Organized Folder Structure
```
client/src/
├── components/
│   ├── common/      (shared UI)
│   ├── quizRoom/    (feature-specific)
│   ├── ui/          (reusable UI atoms)
│   └── organizerLive/
├── context/         (global state)
├── hooks/           (custom logic)
├── pages/           (route components)
├── services/        (API layer)
└── utils/           (helpers)
```
**Positive:** Clear separation of concerns, logical hierarchy, easy to navigate.

### 2. ✅ Consistent UI/UX Design
- Coherent Tailwind CSS styling across all components
- Unified color scheme (indigo, slate, gray)
- Smooth animations with Framer Motion
- Responsive design patterns applied consistently
- Good visual hierarchy and spacing

### 3. ✅ Proper Context API Usage
- `AuthContext` - Clean authentication state management
- `AppDataContext` - Intelligent caching with `useRef` and `useCallback`
- `SocketContext` - Proper WebSocket connection handling
- `ThemeContext` - Theme persistence with localStorage
- Minimal prop drilling

### 4. ✅ Custom Hooks for Reusable Logic
- `useQuizSocketEvents` - Encapsulates socket listener logic
- `useQuizTimer` - Server-time synchronization
- `useToast` - Reusable notification state
- Well-documented with JSDoc comments

### 5. ✅ API Layer Abstraction
- Centralized `services/api.js` with axios configuration
- Request/response interceptors for token management
- Automatic token refresh on 401 errors
- Clean API function exports

### 6. ✅ Smart Caching Strategy
The `AppDataContext` implements effective client-side caching:
```javascript
const quizCacheRef = useRef({});
const getQuizzesForParent = useCallback(async (parentId = 'none', options = {}) => {
    const { force = false } = options;
    const cacheKey = `${userKey}:${parentId}`;
    
    if (!force && quizCacheRef.current[cacheKey]) {
        return quizCacheRef.current[cacheKey];
    }
    // fetch and cache...
}, [userKey]);
```
**Positive:** Prevents unnecessary API calls, improves perceived performance.

---

## Major Issues & Critical Concerns

### 🔴 Issue 1: Component Size and Complexity

#### Problem
Several components exceed 300+ lines, violating Single Responsibility Principle:

**`OrganizerDashboard.jsx` - 300+ lines**
```javascript
// Issues:
// - Manages quiz creation, deletion, renaming, filtering
// - Inline ConfirmDialog component definition
// - Multiple state variables (11+)
// - Complex conditional rendering logic
```

**`OrganizerEdit.jsx` - 200+ lines (partial view)**
```javascript
// Issues:
// - Question management (add, delete, update, move)
// - Toast notifications
// - Shuffle settings
// - Tab navigation
// - All in one component
```

**`PlayingScreen.jsx` - Relatively good at ~50 lines**
```javascript
// ✅ GOOD - Clean composition of smaller components
// Sub-components: QuestionHeader, OptionsGrid, ResultFeedback, LeaderboardSidebar
```

#### Impact
- **Harder to test** - Can't unit test individual features
- **Lower reusability** - Logic is tightly coupled
- **Harder to maintain** - Difficult to locate specific functionality
- **More re-renders** - Entire component re-renders on any state change

#### Recommendation
**Break down large components into smaller, focused ones:**

```javascript
// BEFORE: OrganizerDashboard.jsx (300+ lines)
<OrganizerDashboard />

// AFTER: Refactored structure
<OrganizerDashboard>
  <QuizGrid quizzes={quizzes} />
  <QuizCreateModal open={showCreate} />
  <SubjectNavigationBar currentSubject={currentSubject} />
</OrganizerDashboard>
```

---

### 🔴 Issue 2: Prop Drilling & Performance Re-renders

#### Problem
**QuizRoom.jsx** has duplicate hook calls:
```javascript
// ❌ DUPLICATE - Both call the same hook
const [status, setStatus] = useState('waiting');
// ... many state vars ...

// Use socket events hook
useQuizSocketEvents(socket, roomCode, user, {...});

// Use timer hook
useQuizTimer(expiry, status, setTimeLeft);

// ❌ DUPLICATE USE - Called twice!
useQuizTimer(expiry, status, setTimeLeft); // Line 82-83
```

**QuizRoom.jsx** - Many callback dependencies:
```javascript
useQuizSocketEvents(socket, roomCode, user, {
    onRoomState: handleRoomState,           // ✅ Memoized
    onParticipantsUpdate: handleParticipantsUpdate,  // ✅ Memoized
    onNewQuestion: handleNewQuestion,       // ✅ Memoized
    // 8 dependencies in dependency array!
});
```

#### Impact
- **Unnecessary hook re-executions** - Duplicate timer hooks cancel each other
- **Excessive socket re-registrations** - 8 dependencies cause frequent cleanup/setup
- **Memory leaks** - Old socket listeners might not be properly cleaned up

#### Passed to Child Components
**PlayingScreen receives many props:**
```javascript
<PlayingScreen
    currentQuestion={currentQuestion}
    timeLeft={timeLeft}
    selectedOption={selectedOption}
    myResult={myResult}
    leaderboard={leaderboard}
    errorMessage={errorMessage}
    onSubmitAnswer={submitAnswer}
/>
```
This component will **re-render on ANY prop change**, even if data is unchanged.

---

### 🔴 Issue 3: Missing React.memo and useMemo Optimizations

#### Problem
Components receive prop objects that are recreated on every render:

```javascript
// ❌ BAD: LeaderboardSidebar re-renders on ANY change
const LeaderboardSidebar = ({ leaderboard }) => {
    // Receives new object reference on every parent re-render
    return (
        <div>
            {leaderboard.map((entry, i) => (
                <motion.div key={entry.name}> {/* potential key issue */}
                    ...
                </motion.div>
            ))}
        </div>
    );
};

// ✅ IMPROVEMENT: Memoize to prevent unnecessary renders
const LeaderboardSidebar = React.memo(({ leaderboard }) => {
    return (...);
}, (prevProps, nextProps) => {
    // Return true if props are equal (skip render)
    return JSON.stringify(prevProps) === JSON.stringify(nextProps);
});
```

**PlayingScreen's OptionsGrid also vulnerable:**
```javascript
// ❌ BAD: New options array created on every render
const options = currentQuestion?.options || [];

<OptionsGrid
    options={options}  // New reference every time
    selectedOption={selectedOption}
    // ... other props
/>
```

#### Impact
- **Excessive rendering** - Child components re-render even with unchanged data
- **Performance degradation** - More noticeable with 50+ leaderboard entries
- **jank during quiz** - Laggy animations and timer updates
- **Battery drain** - On mobile devices during long quizzes

---

### 🔴 Issue 4: Weak Error Handling & No Error Boundaries

#### Current Error Handling
```javascript
// api.js - Generic error handling
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // Only handles 401 token refresh
        // All other errors just reject()
        return Promise.reject(error);
    }
);

// OrganizerDashboard.jsx
catch {
    showToast('Failed to load quizzes');  // ❌ No error details
}

// JoinRoom.jsx
catch {
    setError('Room not found. Please check the code and try again.');
    // ✅ Better - specific error message
}
```

#### Missing Error Boundaries
```javascript
// ❌ NO ERROR BOUNDARY - App crashes on component errors
function App() {
    return (
        <Router>
            <AuthProvider>
                {/* If any component crashes, entire app dies */}
                <main>
                    <Routes>
                        <Route path="/quiz/:roomCode" element={<QuizRoom />} />
                    </Routes>
                </main>
            </AuthProvider>
        </Router>
    );
}
```

#### Network Error Recovery
```javascript
// ❌ NO RETRY LOGIC - Failed requests are lost
const getQuizzesForParent = useCallback(async (parentId = 'none', options = {}) => {
    const data = await getMyQuizzes(parentId);  // Fails once = error
    // ...
}, [userKey]);
```

#### Impact
- **Poor user experience** - Cryptic error messages like "Failed to load"
- **App crashes** - One broken component crashes entire app
- **Lost data** - Network timeout = no retry
- **Silent failures** - Users don't know what went wrong

---

### 🔴 Issue 5: State Management Complexity

#### AppDataContext Complexity
The context has **11 different cache objects and 11 functions**:
```javascript
export const AppDataProvider = ({ children }) => {
    const quizCacheRef = useRef({});
    const historyCacheRef = useRef({});
    const quizByCodeCacheRef = useRef({});
    const quizLeaderboardCacheRef = useRef({});
    const subjectLeaderboardCacheRef = useRef({});
    const profileCacheRef = useRef({});
    // ... more cache refs

    const value = useMemo(() => ({
        getQuizzesForParent,
        setQuizzesForParent,
        getHistoryForRole,
        setHistoryForRole,
        // ... 7 more functions
    }), [/* 11 dependencies */]);
};
```

**Problems:**
- **Cache invalidation complexity** - 6 caches to manage separately
- **No TTL on cache** - Cached data never expires
- **Manual cache updates** - Easy to get out of sync
- **Context API sprawl** - Too many responsibilities

#### Better Approach
```javascript
// Consider using TanStack Query (React Query) instead
const { data: quizzes, refetch } = useQuery({
    queryKey: ['quizzes', parentId],
    queryFn: () => getMyQuizzes(parentId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
});

// Auto-invalidation on mutations
const { mutate: createQuiz } = useMutation({
    mutationFn: apiCreateQuiz,
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
});
```

---

### 🔴 Issue 6: Missing TypeScript

#### Current Pain Points
```javascript
// api.js - No type safety
export const loginUser = (email, password) =>
    api.post('/auth/login', { email, password });
// What does this return? Unknown until runtime

// QuizRoom.jsx
const handleAnswerResult = useCallback((result) => {
    setMyResult(result);
    // What properties does 'result' have?
    // API documentation? Good luck
}, []);

// Components accept any props
const PlayingScreen = ({
    currentQuestion,
    timeLeft,
    selectedOption,
    myResult,
    leaderboard,
    errorMessage,
    onSubmitAnswer,
}) => {
    // No validation that these exist or have correct shape
};
```

#### TypeScript Would Catch
```typescript
// ✅ Explicit types prevent bugs
interface QuizResult {
    isCorrect: boolean;
    score: number;
    timeTaken: number;
}

interface PlayingScreenProps {
    currentQuestion: Question;
    timeLeft: number;
    myResult?: QuizResult;
    onSubmitAnswer: (option: string) => void;
}

function PlayingScreen({ currentQuestion, timeLeft, onSubmitAnswer }: PlayingScreenProps) {
    // IDE auto-complete works perfectly
    // Passing wrong type? Immediate error
}
```

---

## Moderate Issues

### 🟡 Issue 7: Inconsistent Container Component Pattern

**Good Examples:**
```javascript
// PlayingScreen.jsx - Clean composition
const PlayingScreen = ({ currentQuestion, ... }) => {
    return (
        <div className="...">
            <QuestionHeader currentQuestion={currentQuestion} timeLeft={timeLeft} />
            <OptionsGrid options={options} />
            <ResultFeedback myResult={myResult} />
            <LeaderboardSidebar leaderboard={leaderboard} />
        </div>
    );
};
```

**Bad Examples:**
```javascript
// OrganizerEdit.jsx - Inline component definition
const Toast = ({ message, type, onClose }) => { /* 10 lines */ };
const ConfirmDialog = ({ message, onConfirm, onCancel }) => { /* 25 lines */ };

const OrganizerEdit = () => {
    // ... 200+ lines of logic mixed in
    return <>...{confirmDialog && <ConfirmDialog ... />}</>;
};
```

**Recommendation:**
- Extract inline components to separate files
- Or move shared dialogs to `components/common/`

---

### 🟡 Issue 8: Tailwind CSS Best Practices

#### Inconsistent Class Usage
```javascript
// ❌ LONG CLASSNAME - Hard to read, potential duplication
<div className="px-8 pt-10 pb-8 text-center text-xl font-bold rounded-[2rem] border-2 transition-all min-h-[9rem] flex flex-col items-center justify-center relative focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white">

// ✅ BETTER - Use CSS variables or config
<div className="btn-option">

// In globals or config
@layer components {
    .btn-option {
        @apply px-8 pt-10 pb-8 text-center text-xl font-bold rounded-[2rem] ...
    }
}
```

#### Custom CSS Variables Not Fully Utilized
```javascript
// App.jsx uses CSS variables
<div className="min-h-screen bg-(--bg-base) text-(--color-text)">

// But most components use hardcoded colors
<div className="bg-indigo-50 text-indigo-600">
```

---

### 🟡 Issue 9: Key Prop Issues in Lists

```javascript
// ❌ RISKY - Using array index as key with animations
leaderboard.map((entry, i) => (
    <motion.div key={entry.name}>  // Relies on unique names
        ...
    </motion.div>
))

// ✅ BETTER - Use unique ID
leaderboard.map((entry) => (
    <motion.div key={entry._id || `${entry.userId}-${entry.quizId}`}>
        // Proper unique identifier
    </motion.div>
))
```

---

### 🟡 Issue 10: Socket.io Event Cleanup Inconsistency

```javascript
// useQuizSocketEvents.js - ✅ GOOD cleanup
useEffect(() => {
    socket.on('room_state', onRoomState);
    socket.on('participants_update', onParticipantsUpdate);
    // ... 6 more listeners

    return () => {
        socket.off('room_state');
        socket.off('participants_update');
        // ... proper cleanup
    };
}, [socket, roomCode, user, ...8 dependencies]);

// OrganizerLive.jsx - ✅ Similar cleanup pattern
return () => {
    socket.off('room_state');
    socket.off('participants_update');
    // ...
};

// But overall: too many socket listeners on same hook
// Could be split into smaller, focused hooks
```

---

## Minor Issues & Best Practices

### 🔵 Issue 11: Unused Variables and ESLint Suppressions

```javascript
// ❌ Multiple files have ESLint disables
/* eslint-disable no-unused-vars */
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';

// These imports ARE used, so why the disable?
// Seems like copy-paste error

// ❌ Unused imports not cleaned up
import { Plus, Play, Trash2, X, Check, Zap, Folder, ChevronLeft, Pencil } from 'lucide-react';
// OrganizerDashboard.jsx imports 11 icons but uses only 8
```

---

### 🔵 Issue 12: No TypeScript OR JSDoc Documentation

```javascript
// ❌ UNCLEAR - What does this return?
const getQuizzesForParent = useCallback(async (parentId = 'none', options = {}) => {
    // What's in options object? Only { force }?
    // Any other properties?
    // What's the shape of returned data?
}, [userKey]);

// ✅ BETTER - Add JSDoc
/**
 * Fetch quizzes for a parent subject with caching
 * @param {string} parentId - Parent subject ID (default: 'none' = root level)
 * @param {Object} options - Fetch options
 * @param {boolean} options.force - Force fresh fetch, ignore cache
 * @returns {Promise<Quiz[]>} Array of quiz objects
 */
const getQuizzesForParent = useCallback(async (parentId = 'none', options = {}) => {
```

---

### 🔵 Issue 13: Modal and Dialog Pattern Not Standardized

```javascript
// OrganizerDashboard.jsx - Inline confirm dialog
{confirmDialog && (
    <ConfirmDialog
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(null)}
    />
)}

// JoinRoom.jsx - Different modal pattern
{paymentQuiz && (
    <div className="space-y-6 p-8 bg-yellow-50 ...">
        {/* Modal content here */}
    </div>
)}

// ☝️ Should create a reusable Modal system
// Modal, Dialog, ConfirmDialog in components/ui/
```

---

### 🔵 Issue 14: No Loading Skeleton States

```javascript
// OrganizerDashboard.jsx
const fetchQuizzes = useCallback(async () => {
    try {
        const data = await getQuizzesForParent(parentId);
        setQuizzes(data);  // Instantly populated
    } catch { /* ... */ }
}, [...]);

// ❌ No loading state between fetch and display
// Users see empty grid, then content pops in

// ✅ BETTER - Add skeleton states
const [quizzes, setQuizzes] = useState([]);
const [loading, setLoading] = useState(false);

// Then show skeletons while loading
{loading ? <SkeletonGrid /> : <QuizGrid quizzes={quizzes} />}
```

---

### 🔵 Issue 15: No Loading States During API Calls

```javascript
// JoinRoom.jsx - Better example
const [loading, setLoading] = useState(false);

const handleJoin = async (e) => {
    setLoading(true);  // ✅ Show loading
    try {
        const quiz = await getQuizByCodeCached(roomCode);
        // ...
    } finally {
        setLoading(false);
    }
};

// But OrganizerDashboard.jsx
const fetchQuizzes = useCallback(async () => {
    try {
        const data = await getQuizzesForParent(parentId);
        setQuizzes(data);  // ❌ No loading state
    }, [currentSubject, showToast, getQuizzesForParent]);
```

---

### 🔵 Issue 16: Button Component Not Fully Utilized

```javascript
// components/ui/Button.jsx - Too simple
const Button = ({
    children,
    className = '',
    type = 'button',
    ...props
}) => {
    return (
        <button type={type} className={className} {...props}>
            {children}
        </button>
    );
};

// Usage everywhere - Developers write full classNames
<button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold ...">
    Create Studio
</button>

// ✅ BETTER - Create button variants
const Button = ({ variant = 'primary', size = 'md', children, ...props }) => {
    const variants = {
        primary: 'bg-indigo-600 hover:bg-indigo-700',
        secondary: 'bg-gray-50 text-slate-700 border border-gray-200',
        danger: 'bg-red-50 text-red-600 border border-red-200',
    };
    
    return (
        <button className={`${variants[variant]} ...`} {...props}>
            {children}
        </button>
    );
};

// Usage
<Button variant="primary" size="lg">
    Create Studio
</Button>
```

---

### 🔵 Issue 17: No Accessibility Considerations

**Good examples found:**
```javascript
// JoinRoom.jsx
<div role="alert" aria-live="assertive" className="...">
    <AlertCircle size={18} className="shrink-0" />
    {error}
</div>

// ResultFeedback.jsx
<div role="status" aria-live="polite" className="...">
```

**Missing:**
```javascript
// ❌ No labels for inputs
<input
    type="text"
    placeholder="ENTER CODE"
    value={roomCode}
    onChange={(e) => setRoomCode(e.target.value)}
/>

// ✅ Should have label
<label htmlFor="room-code">Room Code</label>
<input id="room-code" type="text" />

// ❌ No focus management in modals
const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-150 ...">
        {/* Focus should trap inside modal, return on close */}
    </div>
);
```

---

## Refactoring Roadmap (Priority Order)

### Phase 1: Quick Wins (1-2 days)
```markdown
1. [ ] Remove duplicate useQuizTimer call in QuizRoom.jsx
2. [ ] Remove ESLint disable comments (fix unused imports)
3. [ ] Add React.memo to frequently rendered components
   - LeaderboardSidebar
   - FinishedScreen
   - WaitingLobby
4. [ ] Create reusable Dialog/Modal component
5. [ ] Add basic error boundary
```

### Phase 2: Component Refactoring (3-5 days)
```markdown
1. [ ] Break OrganizerDashboard.jsx into smaller components
   - QuizGridCard
   - SubjectCard
   - CreateQuizForm
   - QuizBrowserView
2. [ ] Extract inline Toast and ConfirmDialog from pages
3. [ ] Create a custom useSocket hook for socket listener logic
4. [ ] Wrap large useEffect in OrganizerLive into smaller hooks
```

### Phase 3: Performance Optimization (2-3 days)
```markdown
1. [ ] Add useMemo for expensive computations
2. [ ] Implement proper memoization for child components
3. [ ] Optimize AppDataContext caching (consider React Query)
4. [ ] Add code splitting for quiz editor page
5. [ ] Lazy load components for routes
```

### Phase 4: Error Handling & UX (2-3 days)
```markdown
1. [ ] Add Error Boundary components
2. [ ] Implement retry logic for failed API calls
3. [ ] Add detailed error messages throughout
4. [ ] Create loading skeleton components
5. [ ] Add network status indicator
```

### Phase 5: TypeScript Migration (5-7 days)
```markdown
1. [ ] Migrate context types first
2. [ ] Add component prop types
3. [ ] Migrate service/api types
4. [ ] Migrate custom hooks
5. [ ] Full project TypeScript conversion
```

---

## Code Examples: Before & After

### Example 1: Fixing QuizRoom Performance Issues

**BEFORE:**
```javascript
const QuizRoom = () => {
    const { roomCode } = useParams();
    const socket = useSocket();
    const { user } = useAuth();

    const [status, setStatus] = useState('waiting');
    const [currentQuestion, setCurrentQuestion] = useState(null);
    // ... 10+ state variables

    const handleRoomState = useCallback((state) => { /* ... */ }, []);
    const handleNewQuestion = useCallback((question) => { /* ... */ }, []);
    // ... 8 callbacks with dependencies

    useQuizSocketEvents(socket, roomCode, user, {
        onRoomState: handleRoomState,
        // ... 8 handlers
    });

    // ❌ DUPLICATE HOOK
    useQuizTimer(expiry, status, setTimeLeft);
    useQuizTimer(expiry, status, setTimeLeft);

    return (
        <PlayingScreen
            currentQuestion={currentQuestion}
            timeLeft={timeLeft}
            selectedOption={selectedOption}
            myResult={myResult}
            leaderboard={leaderboard}
            errorMessage={errorMessage}
            onSubmitAnswer={submitAnswer}
        />
    );
};
```

**AFTER:**
```typescript
interface QuizRoomState {
    status: 'waiting' | 'playing' | 'finished';
    currentQuestion: Question | null;
    timeLeft: number;
    leaderboard: LeaderboardEntry[];
    myResult: QuizResult | null;
    participants: User[];
    expiry: number | null;
    quizTitle: string;
    selectedOption: string | null;
    errorMessage: string | null;
}

interface QuizRoomActions {
    setStatus: (status: QuizRoomState['status']) => void;
    setCurrentQuestion: (question: Question | null) => void;
    setTimeLeft: (time: number) => void;
    setMyResult: (result: QuizResult | null) => void;
    setErrorMessage: (msg: string | null) => void;
}

// Custom hook to manage quiz state
const useQuizRoomState = (): [QuizRoomState, QuizRoomActions] => {
    const [state, setState] = useState<QuizRoomState>({
        status: 'waiting',
        currentQuestion: null,
        timeLeft: 0,
        leaderboard: [],
        myResult: null,
        participants: [],
        expiry: null,
        quizTitle: '',
        selectedOption: null,
        errorMessage: null,
    });

    const actions = useMemo(() => ({
        setStatus: (status: QuizRoomState['status']) =>
            setState(s => ({ ...s, status })),
        setCurrentQuestion: (currentQuestion: Question | null) =>
            setState(s => ({ ...s, currentQuestion })),
        // ... other actions
    }), []);

    return [state, actions];
};

// Refactored component
const QuizRoom = () => {
    const { roomCode } = useParams<{ roomCode: string }>();
    const socket = useSocket();
    const { user } = useAuth();

    const [state, actions] = useQuizRoomState();

    // Single hook call for socket events
    useQuizSocketEvents(socket, roomCode, user, {
        onRoomState: useCallback((s) => {
            actions.setStatus(s.status);
            actions.setCurrentQuestion(s.currentQuestion || null);
            // ...
        }, [actions]),
        // ... other handlers
    });

    // Single hook call for timer
    useQuizTimer(state.expiry, state.status, actions.setTimeLeft);

    return (
        <PlayingScreen
            currentQuestion={state.currentQuestion}
            timeLeft={state.timeLeft}
            selectedOption={state.selectedOption}
            myResult={state.myResult}
            leaderboard={state.leaderboard}
            errorMessage={state.errorMessage}
            onSubmitAnswer={(option) => {
                actions.setSelectedOption(option);
                socket.emit('submit_answer', { /* ... */ });
            }}
        />
    );
};
```

---

### Example 2: Breaking Down OrganizerDashboard

**BEFORE:**
```javascript
const OrganizerDashboard = () => {
    // 11 state variables
    const [quizzes, setQuizzes] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [newQuizTitle, setNewQuizTitle] = useState('');
    // ... more state ...

    // Inline ConfirmDialog component (25 lines)
    const ConfirmDialog = ({ message, onConfirm, onCancel }) => ( /* ... */ );

    // 300+ lines of JSX mixing concerns

    return (
        <>
            {confirmDialog && <ConfirmDialog ... />}
            <div className="p-8 space-y-8">
                {/* Logic for creating, renaming, deleting, displaying quizzes */}
            </div>
        </>
    );
};
```

**AFTER:**
```typescript
// components/organizerDashboard/QuizCard.tsx
interface QuizCardProps {
    quiz: Quiz;
    isEditing: boolean;
    editingTitle: string;
    onEdit: (title: string) => void;
    onRename: (title: string) => void;
    onDelete: () => void;
    onOpenDirectory?: () => void;
}

const QuizCard: React.FC<QuizCardProps> = React.memo(({
    quiz,
    isEditing,
    editingTitle,
    onEdit,
    onRename,
    onDelete,
    onOpenDirectory,
}) => {
    return (
        <div className="bg-white rounded-4xl p-8 border border-gray-100">
            {isEditing ? (
                <QuizTitleEditor
                    title={editingTitle}
                    onChange={onEdit}
                    onSave={() => onRename(editingTitle)}
                />
            ) : (
                <QuizCardDisplay
                    quiz={quiz}
                    onEdit={() => onEdit(quiz.title)}
                    onDelete={onDelete}
                    onOpenDirectory={onOpenDirectory}
                />
            )}
        </div>
    );
});

// components/organizerDashboard/QuizGrid.tsx
interface QuizGridProps {
    quizzes: Quiz[];
    editingQuizId: string | null;
    editingTitle: string;
    onEditStart: (quizId: string, title: string) => void;
    onEditChange: (title: string) => void;
    onRename: (quizId: string, title: string) => void;
    onDelete: (quizId: string) => void;
}

const QuizGrid: React.FC<QuizGridProps> = React.memo(({
    quizzes,
    editingQuizId,
    editingTitle,
    onEditStart,
    onEditChange,
    onRename,
    onDelete,
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
                <QuizCard
                    key={quiz._id}
                    quiz={quiz}
                    isEditing={editingQuizId === quiz._id}
                    editingTitle={editingTitle}
                    onEdit={onEditChange}
                    onRename={(title) => onRename(quiz._id, title)}
                    onDelete={() => onDelete(quiz._id)}
                />
            ))}
        </div>
    );
});

// pages/OrganizerDashboard.jsx - NOW MUCH SIMPLER
const OrganizerDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { getQuizzesForParent, setQuizzesForParent } = useAppData();
    const { toast, showToast, clearToast } = useToast();

    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

    // Fetch quizzes effect...
    useEffect(() => { /* ... */ }, [currentSubject]);

    // Handlers...
    const handleRenameQuiz = async (quizId: string, title: string) => { /* ... */ };
    const handleDeleteQuiz = (quizId: string) => { /* ... */ };

    return (
        <>
            <AnimatePresence>
                {toast && <Toast {...} />}
                {confirmDialog && <Dialog {...} />}
            </AnimatePresence>

            <div className="p-8 space-y-8">
                <Header user={user} onCreateClick={() => setShowCreate(!showCreate)} />
                {currentSubject && <SubjectBreadcrumb ... />}
                
                {showCreate && <CreateQuizForm ... />}
                
                <QuizGrid
                    quizzes={quizzes}
                    editingQuizId={editingQuizId}
                    editingTitle={editingTitle}
                    onEditStart={setEditingQuizId}
                    onEditChange={setEditingTitle}
                    onRename={handleRenameQuiz}
                    onDelete={handleDeleteQuiz}
                />
            </div>
        </>
    );
};
```

---

### Example 3: Adding Performance Optimization

**BEFORE:**
```javascript
const LeaderboardSidebar = ({ leaderboard }) => {
    return (
        <div className="space-y-6">
            {leaderboard.map((entry, i) => (
                <motion.div key={entry.name}>
                    {/* Re-renders every time parent re-renders */}
                </motion.div>
            ))}
        </div>
    );
};
```

**AFTER - With Memoization:**
```typescript
interface LeaderboardEntry {
    _id: string;
    userId: string;
    name: string;
    score: number;
    time?: number;
}

interface LeaderboardSidebarProps {
    leaderboard: LeaderboardEntry[];
}

const LeaderboardSidebar: React.FC<LeaderboardSidebarProps> = React.memo(
    ({ leaderboard }) => {
        // Memoize sorted leaderboard
        const sortedLeaderboard = useMemo(() => {
            return [...leaderboard].sort((a, b) => b.score - a.score);
        }, [leaderboard]);

        return (
            <div className="space-y-6 max-h-[35vh] overflow-y-auto">
                <LeaderboardHeader />
                <div className="space-y-4">
                    {sortedLeaderboard.map((entry, i) => (
                        <LeaderboardEntryRow
                            key={entry._id}
                            entry={entry}
                            rank={i + 1}
                        />
                    ))}
                </div>
            </div>
        );
    },
    // Custom comparison function
    (prevProps, nextProps) => {
        // If leaderboards have same entries and order, skip re-render
        if (prevProps.leaderboard.length !== nextProps.leaderboard.length) {
            return false;
        }
        
        return prevProps.leaderboard.every((entry, i) => 
            entry._id === nextProps.leaderboard[i]._id &&
            entry.score === nextProps.leaderboard[i].score
        );
    }
);

// Extract entry component for better reusability
const LeaderboardEntryRow: React.FC<{ entry: LeaderboardEntry; rank: number }> = 
    React.memo(({ entry, rank }) => {
        return (
            <motion.div
                layout
                className={`flex justify-between items-center p-4 rounded-2xl border ${
                    rank === 1 ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-100'
                }`}
            >
                <span className="text-lg font-black">#{rank}</span>
                <span className="font-bold">{entry.name}</span>
                <span className="font-black text-indigo-600">{entry.score}</span>
            </motion.div>
        );
    });
```

---

## Recommended Package Additions

### For State Management & Caching
```json
{
  "@tanstack/react-query": "^5.0.0",        // Better than custom caching
  "@tanstack/react-query-devtools": "^5.0.0" // Debug caching
}
```

### For Type Safety
```json
{
  "typescript": "^5.0.0",
  "typescript-eslint": "latest"
}
```

### For Error Handling
```json
{
  "react-error-boundary": "^4.0.0"  // Error boundaries component
}
```

### For Forms (Future Enhancement)
```json
{
  "react-hook-form": "^7.0.0",
  "zod": "^3.0.0"  // Type-safe validation
}
```

### For Testing
```json
{
  "@testing-library/react": "^14.0.0",
  "@testing-library/jest-dom": "^6.0.0",
  "vitest": "^1.0.0"  // Better than Jest with Vite
}
```

---

## Testing Recommendations

### Unit Tests Needed
```javascript
// services/__tests__/api.test.js
describe('API Service', () => {
    test('should attach auth token to requests', () => {});
    test('should refresh token on 401', () => {});
    test('should handle network errors gracefully', () => {});
});

// hooks/__tests__/useQuizTimer.test.js
describe('useQuizTimer', () => {
    test('should sync with server expiry time', () => {});
    test('should cleanup interval on unmount', () => {});
});

// components/__tests__/OptionsGrid.test.js
describe('OptionsGrid', () => {
    test('should disable selection when option already selected', () => {});
    test('should call onSubmitAnswer with selected option', () => {});
});
```

### Integration Tests
```javascript
// pages/__tests__/QuizRoom.integration.test.js
describe('QuizRoom Integration', () => {
    test('user can join quiz and answer questions', async () => {});
    test('leaderboard updates in real-time', async () => {});
});
```

---

## Performance Metrics to Monitor

After implementing refactorings, measure:

```javascript
// Add to your analytics
const reportWebVitals = (metric) => {
    console.log(metric);
    // Send to analytics service
    // - CLS (Cumulative Layout Shift) < 0.1
    // - FID (First Input Delay) < 100ms
    // - LCP (Largest Contentful Paint) < 2.5s
};
```

---

## Conclusion & Action Items

### Current Assessment
Your QuizBolt frontend is now **close to production-ready**. The highest-risk defects have been addressed, and the remaining work is mainly around state management simplification, deeper page decomposition, and polish-level UX/accessibility gaps.

### Next 30 Days Plan

**Week 1:** Simplify the data layer
- Reduce the custom cache surface in `AppDataContext`
- Decide whether to keep the current cache layer or move to a server-state library
- Add cache expiration for any data that should not live forever

**Week 2-3:** Break down the largest feature pages
- Split `OrganizerDashboard`
- Split `OrganizerEdit`
- Pull remaining page-specific UI into smaller feature components

**Week 4:** Polish and hardening
- Add loading skeletons where fetches still flash empty states
- Improve keyboard and focus handling in modal flows
- Start a TypeScript migration or add explicit prop typing/JSDoc

### Success Criteria
- [ ] All components < 200 lines (except containers)
- [ ] 0 ESLint warnings
- [ ] 95+ Lighthouse Performance score
- [ ] All critical user flows covered by tests
- [ ] TypeScript migration complete
- [ ] Zero runtime errors in testing

---

## Additional Resources

### React Best Practices
- [React Documentation - Performance](https://react.dev/reference/react/memo)
- [React Query - Server State Management](https://tanstack.com/query/latest)
- [Kent C. Dodds - How to write better React](https://epicreact.dev/)

### Performance
- [Web Vitals](https://web.dev/vitals/)
- [React Profiler](https://react.dev/reference/react/Profiler)

### Code Organization
- [Clean Code in React](https://github.com/ryanmcdermott/clean-code-javascript)
- [Component Composition Patterns](https://www.patterns.dev/)

---

**Review Completed:** April 2, 2026  
**Reviewer:** GitHub Copilot  
**Overall Status:** ✅ **Intermediate - Ready for guided refactoring**
