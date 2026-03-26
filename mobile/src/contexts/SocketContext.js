import React, { createContext, useContext, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

export const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    socketRef.current = io(process.env.EXPO_PUBLIC_SOCKET_URL);
    return () => {
      socketRef.current?.disconnect();
    };
  }, [user]);

  const joinLive = (liveId) => socketRef.current?.emit('join-live', liveId);
  const leaveLive = (liveId) => socketRef.current?.emit('leave-live', liveId);
  const sendLiveMessage = (liveId, message, replyToId) => {
    if (socketRef.current && user) {
      socketRef.current.emit('send-message', {
        liveId,
        userId: user.id,
        message,
        username: user.username,
        avatar: user.avatar,
        replyToId,
      });
    }
  };
  const on = (event, callback) => socketRef.current?.on(event, callback);
  const off = (event, callback) => socketRef.current?.off(event, callback);

  return (
    <SocketContext.Provider value={{ joinLive, leaveLive, sendLiveMessage, on, off }}>
      {children}
    </SocketContext.Provider>
  );
};