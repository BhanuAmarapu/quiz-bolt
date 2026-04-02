import { useEffect } from 'react';

/**
 * Custom hook to handle all quiz room socket events
 * Manages socket listeners and cleanup for quiz state
 */
export const useQuizSocketEvents = (socket, roomCode, user, {
    onRoomState,
    onParticipantsUpdate,
    onNewQuestion,
    onTimerTick,
    onAnswerResult,
    onLeaderboardUpdate,
    onQuizFinished,
    onError
}) => {
    useEffect(() => {
        if (!socket || !user) return;

        socket.emit('join_room', { roomCode, user });

        socket.on('room_state', onRoomState);
        socket.on('participants_update', onParticipantsUpdate);
        socket.on('new_question', onNewQuestion);
        socket.on('timer_tick', onTimerTick);
        socket.on('answer_result', onAnswerResult);
        socket.on('update_leaderboard', onLeaderboardUpdate);
        socket.on('quiz_finished', onQuizFinished);
        socket.on('error', onError);

        return () => {
            socket.off('room_state', onRoomState);
            socket.off('participants_update', onParticipantsUpdate);
            socket.off('new_question', onNewQuestion);
            socket.off('timer_tick', onTimerTick);
            socket.off('answer_result', onAnswerResult);
            socket.off('update_leaderboard', onLeaderboardUpdate);
            socket.off('quiz_finished', onQuizFinished);
            socket.off('error', onError);
        };
    }, [socket, roomCode, user, onRoomState, onParticipantsUpdate, onNewQuestion, onTimerTick, onAnswerResult, onLeaderboardUpdate, onQuizFinished, onError]);
};

export default useQuizSocketEvents;
