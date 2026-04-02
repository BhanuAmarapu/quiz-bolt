/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import {
    getMyProfile,
    getMyQuizzes,
    getOrganizerHistory,
    getQuizByCode,
    getQuizLeaderboard,
    getSubjectLeaderboard,
    getUserHistory,
} from '../services/api';
import { useAuth } from './AuthContext';
import { useEffect } from 'react';

const AppDataContext = createContext(null);

export const AppDataProvider = ({ children }) => {
    const { user } = useAuth();
    const quizCacheRef = useRef({});
    const historyCacheRef = useRef({});
    const quizByCodeCacheRef = useRef({});
    const quizLeaderboardCacheRef = useRef({});
    const subjectLeaderboardCacheRef = useRef({});
    const profileCacheRef = useRef({});
    const previousUserKeyRef = useRef(user?._id || 'anonymous');

    const userKey = user?._id || 'anonymous';

    useEffect(() => {
        const prev = previousUserKeyRef.current;
        if (prev !== userKey) {
            quizCacheRef.current = {};
            historyCacheRef.current = {};
            quizByCodeCacheRef.current = {};
            quizLeaderboardCacheRef.current = {};
            subjectLeaderboardCacheRef.current = {};
            profileCacheRef.current = {};
            previousUserKeyRef.current = userKey;
        }
    }, [userKey]);

    useEffect(() => {
        if (!user) return;
        const cacheKey = `${userKey}:profile`;
        profileCacheRef.current[cacheKey] = {
            _id: user._id,
            name: user.name,
            email: user.email,
            profilePhoto: user.profilePhoto || '',
            role: user.role,
        };
    }, [user, userKey]);

    const getQuizzesForParent = useCallback(async (parentId = 'none', options = {}) => {
        const { force = false } = options;
        const cacheKey = `${userKey}:${parentId}`;

        if (!force && quizCacheRef.current[cacheKey]) {
            return quizCacheRef.current[cacheKey];
        }

        const data = await getMyQuizzes(parentId);
        quizCacheRef.current[cacheKey] = data;
        return data;
    }, [userKey]);

    const setQuizzesForParent = useCallback((parentId, quizzes) => {
        const cacheKey = `${userKey}:${parentId}`;
        quizCacheRef.current[cacheKey] = quizzes;
    }, [userKey]);

    const getHistoryForRole = useCallback(async (role, options = {}) => {
        const { force = false } = options;
        const cacheKey = `${userKey}:${role}`;

        if (!force && historyCacheRef.current[cacheKey]) {
            return historyCacheRef.current[cacheKey];
        }

        const data = role === 'organizer' ? await getOrganizerHistory() : await getUserHistory();
        historyCacheRef.current[cacheKey] = data;
        return data;
    }, [userKey]);

    const setHistoryForRole = useCallback((role, history) => {
        const cacheKey = `${userKey}:${role}`;
        historyCacheRef.current[cacheKey] = history;
    }, [userKey]);

    const getQuizByCodeCached = useCallback(async (roomCode, options = {}) => {
        const { force = false } = options;
        const code = (roomCode || '').toUpperCase();
        const cacheKey = `${userKey}:${code}`;

        if (!force && quizByCodeCacheRef.current[cacheKey]) {
            return quizByCodeCacheRef.current[cacheKey];
        }

        const data = await getQuizByCode(code);
        quizByCodeCacheRef.current[cacheKey] = data;
        return data;
    }, [userKey]);

    const setQuizByCodeCached = useCallback((roomCode, quiz) => {
        const code = (roomCode || '').toUpperCase();
        const cacheKey = `${userKey}:${code}`;
        quizByCodeCacheRef.current[cacheKey] = quiz;
    }, [userKey]);

    const getQuizLeaderboardCached = useCallback(async (quizId, options = {}) => {
        const { force = false } = options;
        const cacheKey = `${userKey}:${quizId}`;

        if (!force && quizLeaderboardCacheRef.current[cacheKey]) {
            return quizLeaderboardCacheRef.current[cacheKey];
        }

        const data = await getQuizLeaderboard(quizId);
        quizLeaderboardCacheRef.current[cacheKey] = data;
        return data;
    }, [userKey]);

    const getSubjectLeaderboardCached = useCallback(async (subjectId, options = {}) => {
        const { force = false } = options;
        const cacheKey = `${userKey}:${subjectId}`;

        if (!force && subjectLeaderboardCacheRef.current[cacheKey]) {
            return subjectLeaderboardCacheRef.current[cacheKey];
        }

        const data = await getSubjectLeaderboard(subjectId);
        subjectLeaderboardCacheRef.current[cacheKey] = data;
        return data;
    }, [userKey]);

    const getProfileCached = useCallback(async (options = {}) => {
        const { force = false } = options;
        const cacheKey = `${userKey}:profile`;

        if (!force && profileCacheRef.current[cacheKey]) {
            return profileCacheRef.current[cacheKey];
        }

        const data = await getMyProfile();
        profileCacheRef.current[cacheKey] = data;
        return data;
    }, [userKey]);

    const setProfileCached = useCallback((profile) => {
        const cacheKey = `${userKey}:profile`;
        profileCacheRef.current[cacheKey] = profile;
    }, [userKey]);

    const invalidateUserData = useCallback(() => {
        quizCacheRef.current = {};
        historyCacheRef.current = {};
        quizByCodeCacheRef.current = {};
        quizLeaderboardCacheRef.current = {};
        subjectLeaderboardCacheRef.current = {};
        profileCacheRef.current = {};
    }, []);

    const value = useMemo(() => ({
        getQuizzesForParent,
        setQuizzesForParent,
        getHistoryForRole,
        setHistoryForRole,
        getQuizByCodeCached,
        setQuizByCodeCached,
        getQuizLeaderboardCached,
        getSubjectLeaderboardCached,
        getProfileCached,
        setProfileCached,
        invalidateUserData,
    }), [
        getQuizzesForParent,
        setQuizzesForParent,
        getHistoryForRole,
        setHistoryForRole,
        getQuizByCodeCached,
        setQuizByCodeCached,
        getQuizLeaderboardCached,
        getSubjectLeaderboardCached,
        getProfileCached,
        setProfileCached,
        invalidateUserData,
    ]);

    return (
        <AppDataContext.Provider value={value}>
            {children}
        </AppDataContext.Provider>
    );
};

export const useAppData = () => useContext(AppDataContext);
