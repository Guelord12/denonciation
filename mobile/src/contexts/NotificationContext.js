// src/contexts/NotificationContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import api from '../api/client';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const { on } = useSocket();
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchUnreadCount = async () => {
        if (!user) return;
        try {
            const res = await api.get('/notifications/unread-count');
            setUnreadCount(res.data.count);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (user) {
            fetchUnreadCount();

            // Écouter les notifications socket (ajustez selon vos événements)
            const unsubscribeNewReport = on('new_report_notification', () => fetchUnreadCount());
            const unsubscribeNewComment = on('new_comment', () => fetchUnreadCount());
            const unsubscribeNewLike = on('new_like', () => fetchUnreadCount());

            return () => {
                if (unsubscribeNewReport) unsubscribeNewReport();
                if (unsubscribeNewComment) unsubscribeNewComment();
                if (unsubscribeNewLike) unsubscribeNewLike();
            };
        }
    }, [user, on]);

    return (
        <NotificationContext.Provider value={{ unreadCount, fetchUnreadCount }}>
            {children}
        </NotificationContext.Provider>
    );
};