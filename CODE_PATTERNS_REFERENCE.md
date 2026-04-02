# Frontend Code Review - Copy-Paste Reference Guide

**Quick Reference for Common Patterns & Solutions**

---

## Table of Contents
1. [Component Patterns](#component-patterns)
2. [State Management Patterns](#state-management-patterns)
3. [Performance Patterns](#performance-patterns)
4. [Error Handling](#error-handling)
5. [Custom Hooks](#custom-hooks)
6. [Type Definitions](#type-definitions)

---

## Component Patterns

### Pattern 1: Container Component with Composed Sub-components

**Good for:** Pages, Complex features

```javascript
// pages/QuizRoom.jsx
const QuizRoom = () => {
    const { roomCode } = useParams();
    const socket = useSocket();
    const { user } = useAuth();

    const [state, actions] = useQuizRoomState();
    const { toast, showToast } = useToast();

    // Logic here
    useQuizSocketEvents(socket, roomCode, user, { /* handlers */ });

    return (
        <>
            <AnimatePresence>
                {toast && <Toast {...toast} onClose={clearToast} />}
            </AnimatePresence>

            {state.status === 'waiting' && (
                <WaitingLobby participants={state.participants} />
            )}

            {state.status === 'playing' && (
                <PlayingScreen
                    question={state.currentQuestion}
                    timeLeft={state.timeLeft}
                    onAnswer={actions.submitAnswer}
                />
            )}

            {state.status === 'finished' && (
                <FinishedScreen leaderboard={state.leaderboard} />
            )}
        </>
    );
};

export default QuizRoom;
```

### Pattern 2: Presentational Component with React.memo

**Good for:** Frequently rendered,receive props from parent**

```javascript
// components/ui/Card.jsx
interface CardProps {
    title?: string;
    children: React.ReactNode;
    className?: string;
}

const Card = React.memo<CardProps>(({ title, children, className = '' }) => {
    return (
        <div className={`bg-white rounded-3xl p-6 border border-gray-100 ${className}`}>
            {title && <h3 className="text-lg font-bold text-slate-900 mb-4">{title}</h3>}
            {children}
        </div>
    );
}, (prev, next) => {
    // Return true if props are equal (skip render)
    return (
        prev.title === next.title &&
        prev.className === next.className &&
        prev.children === next.children
    );
});

Card.displayName = 'Card';
export default Card;
```

### Pattern 3: Compound Component Pattern

**Good for:** Complex components with multiple related parts**

```javascript
// components/Form/Form.jsx
const Form = ({ onSubmit, children }) => {
    const [errors, setErrors] = React.useState({});

    return (
        <form onSubmit={(e) => {
            e.preventDefault();
            setErrors({});
            onSubmit(new FormData(e.target));
        }} className="space-y-6">
            <FormContext.Provider value={{ errors, setErrors }}>
                {children}
            </FormContext.Provider>
        </form>
    );
};

const FormField = ({ name, label, type = 'text', required = false }) => {
    const { errors } = React.useContext(FormContext);
    
    return (
        <div className="space-y-2">
            <label htmlFor={name} className="text-sm font-bold">
                {label}
                {required && <span className="text-red-500">*</span>}
            </label>
            <input
                id={name}
                name={name}
                type={type}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
            {errors[name] && (
                <p className="text-red-600 text-sm">{errors[name]}</p>
            )}
        </div>
    );
};

// Usage
<Form onSubmit={handleSubmit}>
    <FormField name="email" label="Email" type="email" required />
    <FormField name="password" label="Password" type="password" required />
    <button type="submit">Submit</button>
</Form>
```

---

## State Management Patterns

### Pattern 1: useReducer for Complex State

**Good for:** Multi-state updates, predictable transitions**

```javascript
// hooks/useQuizRoomState.ts
interface QuizRoomState {
    status: 'waiting' | 'playing' | 'finished';
    currentQuestion: Question | null;
    leaderboard: LeaderboardEntry[];
    selectedOption: string | null;
    myResult: QuizResult | null;
}

type QuizRoomAction =
    | { type: 'SET_STATUS'; payload: QuizRoomState['status'] }
    | { type: 'SET_QUESTION'; payload: Question }
    | { type: 'UPDATE_LEADERBOARD'; payload: LeaderboardEntry[] }
    | { type: 'SET_ANSWER'; payload: string }
    | { type: 'SET_RESULT'; payload: QuizResult }
    | { type: 'RESET' };

const initialState: QuizRoomState = {
    status: 'waiting',
    currentQuestion: null,
    leaderboard: [],
    selectedOption: null,
    myResult: null,
};

const reducer = (state: QuizRoomState, action: QuizRoomAction): QuizRoomState => {
    switch (action.type) {
        case 'SET_STATUS':
            return { ...state, status: action.payload };
        case 'SET_QUESTION':
            return {
                ...state,
                currentQuestion: action.payload,
                selectedOption: null,
                myResult: null,
            };
        case 'UPDATE_LEADERBOARD':
            return { ...state, leaderboard: action.payload };
        case 'SET_ANSWER':
            return { ...state, selectedOption: action.payload };
        case 'SET_RESULT':
            return { ...state, myResult: action.payload };
        case 'RESET':
            return initialState;
        default:
            return state;
    }
};

export const useQuizRoomState = () => {
    const [state, dispatch] = React.useReducer(reducer, initialState);
    
    return [
        state,
        {
            setStatus: (status) => dispatch({ type: 'SET_STATUS', payload: status }),
            setQuestion: (q) => dispatch({ type: 'SET_QUESTION', payload: q }),
            updateLeaderboard: (lb) => dispatch({ type: 'UPDATE_LEADERBOARD', payload: lb }),
            setAnswer: (opt) => dispatch({ type: 'SET_ANSWER', payload: opt }),
            setResult: (res) => dispatch({ type: 'SET_RESULT', payload: res }),
            reset: () => dispatch({ type: 'RESET' }),
        },
    ] as const;
};
```

### Pattern 2: Custom Context Hook for Cleaner Code

**Good for:** Reusing context logic, DRY principle**

```javascript
// context/QuizContext.jsx
const QuizContext = React.createContext<QuizContextType | null>(null);

export const QuizProvider = ({ children }) => {
    const [quiz, setQuiz] = React.useState(null);
    const [loading, setLoading] = React.useState(false);

    const loadQuiz = React.useCallback(async (id) => {
        setLoading(true);
        try {
            const data = await api.get(`/quiz/${id}`);
            setQuiz(data);
        } finally {
            setLoading(false);
        }
    }, []);

    return (
        <QuizContext.Provider value={{ quiz, loading, loadQuiz }}>
            {children}
        </QuizContext.Provider>
    );
};

// Custom hook for using context
export const useQuiz = () => {
    const context = React.useContext(QuizContext);
    if (!context) {
        throw new Error('useQuiz must be used within QuizProvider');
    }
    return context;
};

// Usage - Much cleaner than destructuring context
const MyComponent = () => {
    const { quiz, loading } = useQuiz();
    // ...
};
```

---

## Performance Patterns

### Pattern 1: useCallback with Proper Dependencies

**Good for:** Preventing function reference changes**

```javascript
// BEFORE - Creates new function on every render
const handleClick = () => {
    setCount(count + 1);
};

// AFTER - Function reference stable between renders
const handleClick = useCallback(() => {
    setCount(prev => prev + 1);  // Use state update function
}, []);  // Empty deps = never changes

// Complex example with external dependencies
const handleLoadQuiz = useCallback(async (quizId: string) => {
    setLoading(true);
    try {
        const data = await getQuiz(quizId);
        // Don't include quiz in dependencies if not needed
        setQuiz(data);
    } catch (err) {
        handleShowError(err.message);
    } finally {
        setLoading(false);
    }
    // Include only values that should trigger recreate
}, []);  // getQuiz and handleShowError should be stable too!
```

### Pattern 2: useMemo for Expensive Computations

**Good for:** Heavy calculations, object transformations**

```javascript
// BEFORE - Recalculates on every render
const leaderboard = [];
for (const entry of rawData) {
    const transformed = {
        ...entry,
        percentCorrect: (entry.correct / entry.total) * 100,
        badge: entry.score > 90 ? 'LEGEND' : 'HERO',
    };
    leaderboard.push(transformed);
}

// AFTER - Calculates once, then memoized
const leaderboard = useMemo(() => {
    return rawData
        .map(entry => ({
            ...entry,
            percentCorrect: (entry.correct / entry.total) * 100,
            badge: entry.score > 90 ? 'LEGEND' : 'HERO',
        }))
        .sort((a, b) => b.score - a.score);
}, [rawData]);  // Recalculate only if rawData changes

// For sorted lists specifically
const sortedLeaderboard = useMemo(() => {
    return [...leaderboard].sort((a, b) => b.score - a.score);
}, [leaderboard]);
```

### Pattern 3: React.lazy for Code Splitting

**Good for:** Large pages, conditional routes**

```javascript
// routes.jsx
const OrganizerDashboard = React.lazy(() => 
    import('./pages/OrganizerDashboard')
);
const OrganizerEdit = React.lazy(() => 
    import('./pages/OrganizerEdit')
);

// App.jsx
function App() {
    return (
        <Suspense fallback={<Loader />}>
            <Routes>
                <Route 
                    path="/organizer-dashboard" 
                    element={<OrganizerDashboard />} 
                />
                <Route 
                    path="/edit/:id" 
                    element={<OrganizerEdit />} 
                />
            </Routes>
        </Suspense>
    );
}
```

---

## Error Handling

### Pattern 1: Comprehensive Error Boundary

**Good for:** Catching and displaying component errors**

```javascript
// components/ErrorBoundary.jsx
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error to service (e.g., Sentry)
        console.error('ErrorBoundary caught:', error, errorInfo);
        
        this.setState({
            error,
            errorInfo,
        });

        // Report to error tracking service
        if (process.env.NODE_ENV === 'production') {
            reportErrorToService(error, errorInfo);
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
                    <div className="text-center max-w-md space-y-6">
                        <div className="inline-block p-4 bg-red-100 rounded-full">
                            <AlertTriangle className="text-red-600" size={40} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900">
                                Oops! Something went wrong
                            </h1>
                            <p className="text-slate-500 mt-3">
                                {this.state.error?.message || 'An unexpected error occurred'}
                            </p>
                            {process.env.NODE_ENV === 'development' && (
                                <details className="mt-4 text-left text-xs text-slate-400">
                                    <summary className="cursor-pointer font-bold">
                                        Error Details
                                    </summary>
                                    <pre className="mt-2 overflow-auto">
                                        {this.state.errorInfo?.componentStack}
                                    </pre>
                                </details>
                            )}
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-indigo-700"
                        >
                            Reload Page
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

### Pattern 2: Enhanced API Error Handling

**Good for:** Network failures, validation errors**

```javascript
// services/api.js
const errorHandler = (error) => {
    const response = error.response;

    if (!response) {
        // Network error
        return {
            status: 'NETWORK_ERROR',
            message: 'Unable to connect. Check your internet connection.',
            retry: true,
            originalError: error,
        };
    }

    const { status, data } = response;

    switch (status) {
        case 400:
            // Validation error
            return {
                status: 'VALIDATION_ERROR',
                message: data.message || 'Invalid input',
                errors: data.errors, // Field-specific errors
                retry: false,
            };

        case 401:
            // Unauthorized - handle token refresh
            return {
                status: 'UNAUTHORIZED',
                message: 'Session expired. Please login again.',
                retry: false,
                action: 'REDIRECT_LOGIN',
            };

        case 403:
            // Forbidden
            return {
                status: 'FORBIDDEN',
                message: 'You do not have permission to perform this action',
                retry: false,
            };

        case 404:
            // Not found
            return {
                status: 'NOT_FOUND',
                message: 'Resource not found',
                retry: false,
            };

        case 409:
            // Conflict
            return {
                status: 'CONFLICT',
                message: data.message || 'A conflict occurred',
                retry: false,
            };

        case 429:
            // Rate limit
            return {
                status: 'RATE_LIMIT',
                message: 'Too many requests. Please try again later.',
                retry: true,
                retryAfter: response.headers['retry-after'] || 60,
            };

        case 500:
        case 502:
        case 503:
        case 504:
            // Server error
            return {
                status: 'SERVER_ERROR',
                message: 'Server error. Please try again later.',
                retry: true,
            };

        default:
            return {
                status: 'UNKNOWN_ERROR',
                message: data.message || 'An error occurred',
                retry: false,
                originalError: error,
            };
    }
};

api.interceptors.response.use(
    response => response,
    error => Promise.reject(errorHandler(error))
);

// Usage in components
const handleFetch = async () => {
    setLoading(true);
    try {
        const data = await api.get('/quiz/123');
        setData(data);
    } catch (err) {
        const { status, message, retry } = err;
        
        // Show appropriate UI
        if (retry) {
            showError(`${message} Try again?`, () => handleFetch());
        } else {
            showError(message);
        }

        if (status === 'VALIDATION_ERROR') {
            // Show field errors
            setFormErrors(err.errors);
        }
    } finally {
        setLoading(false);
    }
};
```

---

## Custom Hooks

### Pattern 1: useAsync Hook

**Good for:** API calls, async operations**

```javascript
// hooks/useAsync.ts
interface UseAsyncState<T> {
    status: 'idle' | 'pending' | 'success' | 'error';
    data: T | null;
    error: Error | null;
}

interface UseAsyncOptions {
    immediate?: boolean;
}

export const useAsync = <T>(
    asyncFunction: () => Promise<T>,
    immediate = true
): UseAsyncState<T> & { execute: () => Promise<T> } => {
    const [state, setState] = React.useState<UseAsyncState<T>>({
        status: 'idle',
        data: null,
        error: null,
    });

    const execute = React.useCallback(async () => {
        setState({ status: 'pending', data: null, error: null });
        try {
            const response = await asyncFunction();
            setState({ status: 'success', data: response, error: null });
            return response;
        } catch (error) {
            setState({ status: 'error', data: null, error: error as Error });
            throw error;
        }
    }, [asyncFunction]);

    React.useEffect(() => {
        if (immediate) {
            execute();
        }
    }, [execute, immediate]);

    return { ...state, execute };
};

// Usage
const { data: quiz, status, error, execute: refetch } = useAsync(
    () => getQuizByCode(roomCode),
    true  // execute immediately
);

if (status === 'pending') return <Loader />;
if (status === 'error') return <ErrorMessage error={error} />;
return <QuizView quiz={data} />;
```

### Pattern 2: usePrevious Hook

**Good for:** Detecting value changes**

```javascript
// hooks/usePrevious.ts
export const usePrevious = <T>(value: T): T | undefined => {
    const ref = React.useRef<T>();
    
    React.useEffect(() => {
        ref.current = value;
    }, [value]);
    
    return ref.current;
};

// Usage
const MyComponent = ({ userId }) => {
    const prevUserId = usePrevious(userId);
    
    React.useEffect(() => {
        if (prevUserId !== userId) {
            loadUserData(userId);
        }
    }, [userId, prevUserId]);
};
```

### Pattern 3: useLocalStorage Hook

**Good for:** Persisting user preferences**

```javascript
// hooks/useLocalStorage.ts
export const useLocalStorage = <T>(key: string, initialValue: T) => {
    const [storedValue, setStoredValue] = React.useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return initialValue;
        }
    });

    const setValue = React.useCallback((value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error('Error writing to localStorage:', error);
        }
    }, [key, storedValue]);

    return [storedValue, setValue] as const;
};

// Usage
const [theme, setTheme] = useLocalStorage('theme', 'light');
const [quizDraft, setQuizDraft] = useLocalStorage('quiz-draft', {});
```

---

## Type Definitions

### Pattern 1: API Response Types

**File:** `types/api.ts`

```typescript
// Auth Types
export interface User {
    _id: string;
    name: string;
    email: string;
    role: 'organizer' | 'participant';
    profilePhoto?: string;
    createdAt: string;
}

export interface AuthResponse {
    user: User;
    token: string;
}

// Quiz Types
export interface Quiz {
    _id: string;
    title: string;
    type: 'quiz' | 'subject';
    roomCode?: string;
    isPaid: boolean;
    price?: number;
    questions?: Question[];
    createdAt: string;
    updatedAt: string;
}

export interface Question {
    _id: string;
    question: string;
    options: string[];
    correctAnswer: string;
    timeLimit: number;
    mediaUrl?: string;
    shuffleOptions?: boolean;
}

// Leaderboard Types
export interface LeaderboardEntry {
    userId: string;
    name: string;
    score: number;
    time?: number;
    rank?: number;
}

// WebSocket Event Types
export interface RoomState {
    status: 'waiting' | 'playing' | 'finished';
    participants: User[];
    leaderboard: LeaderboardEntry[];
    currentQuestion?: Question;
    timeLeft: number;
    expiry?: number;
}

// Error Types
export interface ApiError {
    status: string;
    message: string;
    retry: boolean;
    errors?: Record<string, string>;
    action?: string;
}
```

### Pattern 2: Component Props Types

**File:** `types/components.ts`

```typescript
// Common Props
export interface BaseProps {
    className?: string;
    'data-testid'?: string;
}

// Container Props
export interface PlayingScreenProps extends BaseProps {
    currentQuestion: Question | null;
    timeLeft: number;
    selectedOption: string | null;
    myResult: QuizResult | null;
    leaderboard: LeaderboardEntry[];
    errorMessage: string | null;
    onSubmitAnswer: (option: string) => void;
}

export interface LeaderboardSidebarProps extends BaseProps {
    leaderboard: LeaderboardEntry[];
    maxEntries?: number;  // Show top N entries
}

// Button Props
export interface ButtonProps<T extends React.ElementType = 'button'> 
    extends React.ComponentPropsWithoutRef<T> {
    as?: T;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    disabled?: boolean;
}

// Form Props
export interface FormFieldProps extends BaseProps {
    name: string;
    label: string;
    type?: string;
    placeholder?: string;
    required?: boolean;
    value?: string | number;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error?: string;
}
```

---

## Common Fixes Summary

| Issue | Solution | File |
|-------|----------|------|
| Duplicate hooks | Remove duplicate | QuizRoom.jsx |
| Large components | Extract sub-components | OrganizerDashboard.jsx |
| No error boundary | Add ErrorBoundary | App.jsx |
| Re-render everything | Use React.memo | LeaderboardSidebar.jsx |
| Cache invalidation complex | Use React Query | AppDataContext.jsx |
| No types | Add TypeScript/JSDoc | All files |
| Expensive computations | Use useMemo | All computed values |
| Inline components | Extract to separate file | OrganizerEdit.jsx |

---

**Last Updated:** April 2, 2026

