import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

export const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within SocketProvider');
  return context;
};

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user) return;
    const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000');
    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, [user]);

  const joinLive = (liveId) => socket && socket.emit('join-live', liveId);
  const leaveLive = (liveId) => socket && socket.emit('leave-live', liveId);
  const sendLiveMessage = (liveId, message, replyToId) => {
    if (socket && user) {
      socket.emit('send-message', { liveId, userId: user.id, message, username: user.username, avatar: user.avatar, replyToId });
    }
  };
  const onNewMessage = (callback) => { socket?.on('new-message', callback); return () => socket?.off('new-message'); };
  const onMessageHistory = (callback) => { socket?.on('message-history', callback); return () => socket?.off('message-history'); };
  const onMessageRejected = (callback) => { socket?.on('message-rejected', callback); return () => socket?.off('message-rejected'); };
  const onParticipantJoined = (callback) => { socket?.on('participant-joined', callback); return () => socket?.off('participant-joined'); };
  const onParticipantLeft = (callback) => { socket?.on('participant-left', callback); return () => socket?.off('participant-left'); };
  const onLiveStarted = (callback) => { socket?.on('live_started', callback); return () => socket?.off('live_started'); };
  const onLiveEnded = (callback) => { socket?.on('live_ended', callback); return () => socket?.off('live_ended'); };

  return (
    <SocketContext.Provider value={{
      socket,
      joinLive,
      leaveLive,
      sendLiveMessage,
      onNewMessage,
      onMessageHistory,
      onMessageRejected,
      onParticipantJoined,
      onParticipantLeft,
      onLiveStarted,
      onLiveEnded
    }}>
      {children}
    </SocketContext.Provider>
  );
};