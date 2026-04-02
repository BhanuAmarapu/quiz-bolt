import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import useQuizSocketEvents from '../hooks/useQuizSocketEvents';
import useQuizTimer from '../hooks/useQuizTimer';
import WaitingLobby from '../components/quizRoom/WaitingLobby';
import PlayingScreen from '../components/quizRoom/PlayingScreen';
import FinishedScreen from '../components/quizRoom/FinishedScreen';

const QuizRoom = () => {
    const { roomCode } = useParams();
    const socket = useSocket();
    const { user } = useAuth();
    const errorTimeoutRef = useRef(null);

    // Record join time for scheduled (and instant) sessions
    useEffect(() => {
        if (roomCode && user) {
            api.post(`/quiz/join-scheduled/${roomCode}`).catch(() => { /* silent – quiz may not have scheduledAt */ });
        }
    }, [roomCode, user]);

    // State
    const [status, setStatus] = useState('waiting');
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [leaderboard, setLeaderboard] = useState([]);
    const [myResult, setMyResult] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [expiry, setExpiry] = useState(null);
    const [quizTitle, setQuizTitle] = useState('');
    const [selectedOption, setSelectedOption] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);

    // Socket event handlers
    const handleRoomState = useCallback((state) => {
        setStatus(state.status);
        if (state.title) setQuizTitle(state.title);
        setLeaderboard(state.leaderboard || []);
        setParticipants(state.participants || []);
        if (state.currentQuestion) {
            setCurrentQuestion(state.currentQuestion);
            setTimeLeft(state.timeLeft);
            if (state.expiry) setExpiry(state.expiry);
            setStatus('playing');
        }
    }, []);

    const handleParticipantsUpdate = useCallback((list) => {
        setParticipants(list);
    }, []);

    const handleNewQuestion = useCallback((question) => {
        setCurrentQuestion(question);
        setTimeLeft(question.timeLimit);
        if (question.expiry) setExpiry(question.expiry);
        setMyResult(null);
        setSelectedOption(null);
        setStatus('playing');
    }, []);

    const handleTimerTick = useCallback((time) => setTimeLeft(time), []);

    const handleAnswerResult = useCallback((result) => {
        setMyResult(result);
    }, []);

    const handleLeaderboardUpdate = useCallback((data) => {
        setLeaderboard(data);
    }, []);

    const handleQuizFinished = useCallback(() => setStatus('finished'), []);

    const handleError = useCallback((msg) => {
        setErrorMessage(msg);
        if (errorTimeoutRef.current) {
            clearTimeout(errorTimeoutRef.current);
        }
        errorTimeoutRef.current = setTimeout(() => setErrorMessage(null), 5000);
    }, []);

    useEffect(() => {
        return () => {
            if (errorTimeoutRef.current) {
                clearTimeout(errorTimeoutRef.current);
            }
        };
    }, []);

    // Use socket events hook
    useQuizSocketEvents(socket, roomCode, user, {
        onRoomState: handleRoomState,
        onParticipantsUpdate: handleParticipantsUpdate,
        onNewQuestion: handleNewQuestion,
        onTimerTick: handleTimerTick,
        onAnswerResult: handleAnswerResult,
        onLeaderboardUpdate: handleLeaderboardUpdate,
        onQuizFinished: handleQuizFinished,
        onError: handleError,
    });

    // Use timer hook
    useQuizTimer(expiry, status, setTimeLeft);

    const submitAnswer = (option) => {
        if (!socket || !user || !currentQuestion || selectedOption || timeLeft === 0 || status !== 'playing') return;
        setSelectedOption(option);

        // userId/userName come from server-authoritative JWT (fix #10)
        socket.emit('submit_answer', {
            roomCode,
            questionId: currentQuestion._id,
            selectedOption: option,
        });
    };

    // Render waiting/upcoming state
    if (status === 'waiting' || status === 'upcoming') {
        return <WaitingLobby quizTitle={quizTitle} participants={participants} />;
    }

    // Render finished/completed state
    if (status === 'finished' || status === 'completed') {
        return <FinishedScreen leaderboard={leaderboard} />;
    }

    // Render playing state
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

export default QuizRoom;
