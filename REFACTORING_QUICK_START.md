# Frontend Refactoring Quick-Start Guide

**Timeline:** 4 weeks | **Priority Levels:** Critical 🔴 → High 🟡 → Medium 🔵

---

## Phase 1: Quick Wins (Day 1-2)

### 1. 🔴 CRITICAL: Fix Duplicate useQuizTimer Hook

**File:** [client/src/pages/QuizRoom.jsx](client/src/pages/QuizRoom.jsx)

**Issue:** Hook called twice on lines 82-83
```javascript
// ❌ CURRENT (lines 80-83)
// Use timer hook
useQuizTimer(expiry, status, setTimeLeft);

// Use timer hook
useQuizTimer(expiry, status, setTimeLeft);
```

**Fix:** Remove the duplicate
```javascript
// ✅ FIXED
// Use timer hook
useQuizTimer(expiry, status, setTimeLeft);
```

**Impact:** Prevents conflicting timer updates, fixes timer jank

---

### 2. 🟡 Remove ESLint Disable Comments

**Files affected:**
- `client/src/pages/QuizRoom.jsx`
- `client/src/pages/OrganizerDashboard.jsx`
- `client/src/pages/OrganizerEdit.jsx`
- `client/src/components/quizRoom/*.jsx`
- `client/src/components/organizerLive/*.jsx`

**Issue:**
```javascript
/* eslint-disable no-unused-vars */
import { motion } from 'framer-motion';  // THIS IS USED!
```

**Fix:** Remove the comment line (it's unnecessary)

**Why:** Clean up warnings, make linted code cleaner

---

### 3. 🟡 Remove Unused Imports

**File:** [client/src/pages/OrganizerDashboard.jsx](client/src/pages/OrganizerDashboard.jsx)

**Issue:**
```javascript
import { Plus, Play, Trash2, X, Check, Zap, Folder, ChevronLeft, Pencil } from 'lucide-react';
// Uses: Plus, Trash2, X, Check, Folder, ChevronLeft, Pencil
// UNUSED: Play, Zap
```

**Fix:** Remove unused imports
```javascript
import { Plus, Trash2, X, Check, Folder, ChevronLeft, Pencil } from 'lucide-react';
```

**Script to find all:**
```bash
cd client && npm run lint -- --fix
```

---

### 4. 🔴 Add Error Boundary (critical for production)

**File:** Create [client/src/components/ErrorBoundary.jsx](client/src/components/ErrorBoundary.jsx)

```javascript
import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-50">
                    <div className="text-center max-w-md space-y-6">
                        <div className="inline-block p-4 bg-red-100 rounded-full">
                            <AlertTriangle className="text-red-600" size={32} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900">
                                Something went wrong
                            </h1>
                            <p className="text-slate-500 mt-2">
                                We're working to fix this. Try refreshing the page.
                            </p>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold"
                        >
                            Refresh Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
```

**Add to App.jsx:**
```javascript
function App() {
    return (
        <ErrorBoundary>
            <Router>
                {/* rest of app */}
            </Router>
        </ErrorBoundary>
    );
}
```

---

### 5. 🟡 Add React.memo to Heavy Components

**Target Components:**

**File:** [client/src/components/quizRoom/LeaderboardSidebar.jsx](client/src/components/quizRoom/LeaderboardSidebar.jsx)

```javascript
// Before
const LeaderboardSidebar = ({ leaderboard }) => {
    // ...
};
export default LeaderboardSidebar;

// After
const LeaderboardSidebar = ({ leaderboard }) => {
    // ...
};
export default React.memo(LeaderboardSidebar);
```

Do the same for:
- `FinishedScreen.jsx`
- `WaitingLobby.jsx`
- `OptionsGrid.jsx`
- `ResultFeedback.jsx`

**Why:** Prevents re-renders when leaderboard hasn't changed

---

## Phase 2: Component Breakdowns (Day 3-6)

### 6. 🔴 Extract Toast & ConfirmDialog from OrganizerDashboard

**Create:** [client/src/components/common/ConfirmDialog.jsx](client/src/components/common/ConfirmDialog.jsx)

```javascript
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';

const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-150 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-8 rounded-4xl max-w-sm w-full mx-4 space-y-6 border border-gray-100 shadow-xl"
        >
            <div className="flex items-start gap-4">
                <div className="p-3 bg-red-500/20 rounded-2xl">
                    <Trash2 className="text-red-400" size={24} />
                </div>
                <div>
                    <h3 className="font-black text-lg tracking-tight">Confirm Delete</h3>
                    <p className="text-slate-400 text-sm mt-1">{message}</p>
                </div>
            </div>
            <div className="flex gap-3">
                <button
                    onClick={onCancel}
                    className="flex-1 py-3 bg-gray-50 rounded-xl text-sm font-bold text-slate-700 hover:bg-gray-100 transition-all border border-gray-200"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-bold transition-all border border-red-200"
                >
                    Delete
                </button>
            </div>
        </motion.div>
    </div>
);

export default ConfirmDialog;
```

**Update OrganizerDashboard.jsx:**
```javascript
import ConfirmDialog from '../components/common/ConfirmDialog';

// Remove inline ConfirmDialog definition
// Change component usage from:
// {confirmDialog && <ConfirmDialog ... />}
// To:
// {confirmDialog && (
//     <ConfirmDialog
//         message={confirmDialog.message}
//         onConfirm={confirmDialog.onConfirm}
//         onCancel={() => setConfirmDialog(null)}
//     />
// )}
```

---

### 7. 🟡 Create Reusable Button Variant System

**File:** [client/src/components/ui/Button.jsx](client/src/components/ui/Button.jsx)

```javascript
import React from 'react';

const buttonVariants = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    secondary: 'bg-gray-50 text-slate-700 border border-gray-200 hover:bg-gray-100',
    danger: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100',
    ghost: 'text-slate-500 hover:text-slate-700',
};

const buttonSizes = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
};

const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    type = 'button',
    ...props
}) => {
    const baseCSS = 'font-bold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';
    const variantCSS = buttonVariants[variant] || buttonVariants.primary;
    const sizeCSS = buttonSizes[size] || buttonSizes.md;

    return (
        <button
            type={type}
            className={`${baseCSS} ${variantCSS} ${sizeCSS} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
```

**Usage throughout app:**
```javascript
// Before
<button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl ...">
    Save
</button>

// After
<Button variant="primary" size="md">
    Save
</Button>

<Button variant="danger" size="sm">
    Delete
</Button>

<Button variant="secondary">
    Cancel
</Button>
```

---

### 8. 🟡 Create Modal Component System

**File:** [client/src/components/ui/Dialog.jsx](client/src/components/ui/Dialog.jsx)

```javascript
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const Dialog = ({
    open,
    onClose,
    title,
    children,
    actions,
    size = 'md',
}) => {
    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-2xl',
    };

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-150 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className={`bg-white rounded-4xl w-full mx-4 shadow-xl border border-gray-100 ${sizeClasses[size]}`}
                    >
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h2 className="text-2xl font-black text-slate-900">
                                {title}
                            </h2>
                            {onClose && (
                                <button
                                    onClick={onClose}
                                    className="p-2 text-slate-400 hover:text-slate-600"
                                >
                                    <X size={20} />
                                </button>
                            )}
                        </div>

                        <div className="p-6">
                            {children}
                        </div>

                        {actions && (
                            <div className="flex gap-3 p-6 border-t border-gray-100">
                                {actions}
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default Dialog;
```

---

## Phase 3: State Management Improvements (Day 7-10)

### 9. 🟡 Simplify AppDataContext with useCallback Dependencies

**File:** [client/src/context/AppDataContext.jsx](client/src/context/AppDataContext.jsx)

**Issue:** Many cache objects managed separately

**Improvement:** Consolidate to single cache object

```javascript
// Before: 6 separate cache refs
const quizCacheRef = useRef({});
const historyCacheRef = useRef({});
const quizByCodeCacheRef = useRef({});
// ... more

// After: Single unified cache
const cacheRef = useRef({
    quizzes: {},
    history: {},
    quizByCode: {},
    leaderboards: {},
    subjectLeaderboards: {},
    profile: {},
});

// Access pattern
const getCache = (type, key) => cacheRef.current[type]?.[key];
const setCache = (type, key, value) => {
    cacheRef.current[type] = cacheRef.current[type] || {};
    cacheRef.current[type][key] = value;
};
```

### 10. 🔵 Add Cache TTL (Time To Live)

```javascript
const cacheRef = useRef({
    quizzes: {},
    history: {},
    // ... other types
});

const CACHE_TTL = {
    quizzes: 5 * 60 * 1000,        // 5 minutes
    history: 10 * 60 * 1000,       // 10 minutes
    leaderboards: 1 * 60 * 1000,   // 1 minute (realtime)
    profile: 30 * 60 * 1000,       // 30 minutes
};

const isCacheValid = (type, key) => {
    const cached = getCache(type, key);
    if (!cached) return false;
    
    const isExpired = Date.now() - cached.timestamp > CACHE_TTL[type];
    if (isExpired) {
        delete cacheRef.current[type][key];
    }
    
    return !isExpired;
};

const setCacheWithTTL = (type, key, value) => {
    setCache(type, key, {
        value,
        timestamp: Date.now(),
    });
};
```

---

## Phase 4: Performance Optimizations (Day 11-14)

### 11. 🔵 Add React Query (TanStack Query) for Data Fetching

**Install:**
```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

**Setup:** [client/src/main.jsx](client/src/main.jsx)

```javascript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,      // 5 minutes
            gcTime: 10 * 60 * 1000,        // 10 minutes (was cacheTime)
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <App />
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    </StrictMode>,
);
```

**Usage Example - Replace Context:**
```javascript
// Before: Manual caching with AppDataContext
const { getQuizzesForParent } = useAppData();
const [quizzes, setQuizzes] = useState([]);

useEffect(() => {
    getQuizzesForParent(parentId).then(setQuizzes);
}, [parentId, getQuizzesForParent]);

// After: React Query (much simpler!)
const { data: quizzes = [] } = useQuery({
    queryKey: ['quizzes', parentId],
    queryFn: () => getMyQuizzes(parentId),
});

// Mutations with auto-invalidation
const { mutate: createQuiz } = useMutation({
    mutationFn: (data) => apiCreateQuiz(...),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['quizzes', parentId] });
    },
});
```

---

### 12. 🔵 Use useMemo for Expensive Computations

**Example:** [client/src/components/quizRoom/LeaderboardSidebar.jsx](client/src/components/quizRoom/LeaderboardSidebar.jsx)

```javascript
// Before
const LeaderboardSidebar = ({ leaderboard }) => {
    return (
        <div>
            {leaderboard.map((entry, i) => (
                // Sorts on every render!
                // Animations trigger on every parent re-render
            ))}
        </div>
    );
};

// After
const LeaderboardSidebar = ({ leaderboard }) => {
    const sortedLeaderboard = useMemo(() => {
        return [...leaderboard]
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
    }, [leaderboard]);

    return (
        <div>
            {sortedLeaderboard.map((entry, i) => (
                // Only re-sorts if leaderboard array reference changes
            ))}
        </div>
    );
};
```

---

## Phase 5: Error Handling (Day 15-16)

### 13. 🟡 Enhance API Error Handling

**File:** [client/src/services/api.js](client/src/services/api.js)

```javascript
// Add to interceptors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error?.config;
        
        // 401 - Token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {}, 
                    { withCredentials: true }
                );
                // ... token refresh logic
                return api(originalRequest);
            } catch (err) {
                localStorage.removeItem('quizbolt_user');
                window.location.href = '/login';
                return Promise.reject(err);
            }
        }

        // 403 - Permission denied
        if (error.response?.status === 403) {
            const message = error.response?.data?.message || 'Access denied';
            return Promise.reject({
                ...error,
                userMessage: message,
                type: 'PERMISSION_DENIED',
            });
        }

        // Network error
        if (!error.response) {
            return Promise.reject({
                ...error,
                userMessage: 'Network error. Please check your connection.',
                type: 'NETWORK_ERROR',
                retry: true,
            });
        }

        // Generic error
        return Promise.reject({
            ...error,
            userMessage: error.response?.data?.message || 'An error occurred',
            type: 'GENERIC_ERROR',
        });
    }
);
```

---

## Phase 6: Testing Suite (Day 17-20)

### 14. 🔵 Setup Testing with Vitest

**Install:**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Create:** [client/vitest.config.js](client/vitest.config.js)

```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./vitest.setup.js'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
        },
    },
});
```

**Create:** [client/vitest.setup.js](client/vitest.setup.js)

```javascript
import '@testing-library/jest-dom';
```

**Example Test:** [client/src/hooks/__tests__/useQuizTimer.test.js](client/src/hooks/__tests__/useQuizTimer.test.js)

```javascript
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import useQuizTimer from '../useQuizTimer';

describe('useQuizTimer', () => {
    let mockCallback;

    beforeEach(() => {
        mockCallback = vi.fn();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should update timeLeft based on server expiry', () => {
        const expiry = Date.now() + 10000; // 10 seconds from now
        const { result } = renderHook(() =>
            useQuizTimer(expiry, 'playing', mockCallback)
        );

        // Should call callback approximately every 500ms
        act(() => {
            vi.advanceTimersByTime(500);
        });

        // Verify callback was called with approximately 9.5 seconds left
        expect(mockCallback).toHaveBeenCalled();
    });

    it('should cleanup interval on unmount', () => {
        const expiry = Date.now() + 10000;
        const { unmount } = renderHook(() =>
            useQuizTimer(expiry, 'playing', mockCallback)
        );

        const initialCallCount = mockCallback.mock.calls.length;

        unmount();

        act(() => {
            vi.advanceTimersByTime(1000);
        });

        // Callback should not be called after unmount
        expect(mockCallback.mock.calls.length).toBe(initialCallCount);
    });
});
```

---

## Implementation Checklist

### Phase 1: Quick Wins ✅
- [ ] Remove duplicate useQuizTimer hook
- [ ] Remove ESLint disable comments
- [ ] Remove unused imports
- [ ] Add ErrorBoundary component
- [ ] Add React.memo to 5 components
- [ ] Run `npm run lint -- --fix`
- [ ] Commit: "chore: fix critical issues and lint"

### Phase 2: Component Refactoring
- [ ] Extract ConfirmDialog to common
- [ ] Extract Toast from OrganizerEdit
- [ ] Create Button variant system
- [ ] Create Dialog/Modal system
- [ ] Add prop types/JSDoc to extracted components
- [ ] Commit: "refactor: extract reusable components"

### Phase 3: State Management
- [ ] Consolidate AppDataContext caches
- [ ] Add cache TTL/expiration
- [ ] Remove duplicate cache references
- [ ] Test cache invalidation flows
- [ ] Commit: "refactor: simplify AppDataContext"

### Phase 4: Performance
- [ ] Install @tanstack/react-query
- [ ] Add QueryClientProvider to main.jsx
- [ ] Migrate one page to React Query
- [ ] Add useMemo to expensive computations
- [ ] Profile with React DevTools
- [ ] Commit: "perf: integrate React Query"

### Phase 5: Error Handling
- [ ] Add comprehensive API error handling
- [ ] Create error notification system
- [ ] Add retry logic for network errors
- [ ] Test error flows
- [ ] Commit: "feat: enhance error handling"

### Phase 6: Testing
- [ ] Setup Vitest
- [ ] Write tests for 3 custom hooks
- [ ] Write tests for API service
- [ ] Write integration test for QuizRoom
- [ ] Achieve 80%+ coverage on critical paths
- [ ] Commit: "test: add comprehensive test suite"

### Phase 7: TypeScript (Optional but Recommended)
- [ ] Install TypeScript dependencies
- [ ] Create tsconfig.json
- [ ] Rename .jsx files to .tsx gradually
- [ ] Create types directory with interfaces
- [ ] Migrate one page completely
- [ ] ESLint with TypeScript plugin
- [ ] Commit: "chore: init TypeScript migration"

---

## Success Metrics

After implementing all phases:

```javascript
✅ All components < 200 lines
✅ No ESLint warnings
✅ 0 duplicate code
✅ React.memo on all heavy components
✅ 80%+ test coverage on critical paths
✅ Lighthouse Performance > 90
✅ No console errors/warnings
✅ API error handling comprehensive
✅ All socket listeners properly cleaned up
✅ TypeScript or full JSDoc throughout
```

**Estimated Timeline:** 4 weeks with 2-3 hours/day

---

## Git Workflow

```bash
# Phase 1
git checkout -b refactor/phase-1-quick-wins
# ... make changes
git commit -m "fix: remove duplicate hooks and fix linting"
git push origin refactor/phase-1-quick-wins
# Create PR

# Phase 2
git checkout -b refactor/phase-2-components
# ... make changes
git commit -m "refactor: extract reusable components"
git push origin refactor/phase-2-components
# Create PR

# After each phase is reviewed and merged, start next phase from main
```

---

## Resources

- [React Performance Optimization](https://react.dev/reference/react/memo)
- [React Query Docs](https://tanstack.com/query/latest)
- [Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Vitest Documentation](https://vitest.dev/)

---

**💡 Pro Tips:**

1. **Commit often** - Small, focused commits make code review easier
2. **Test as you go** - Don't leave testing for the end
3. **Profile continuously** - Use React DevTools Profiler before and after changes
4. **Code review** - Have someone review each phase before moving forward
5. **Document decisions** - Add comments explaining why you refactored something

Good Luck! 🚀
