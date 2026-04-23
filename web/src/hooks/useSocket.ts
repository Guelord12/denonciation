import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { accessToken } = useAuthStore();

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    // ✅ CORRECTION : Utiliser l'URL absolue de production
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 
      (import.meta.env.PROD ? 'http://16.171.39.76:5000' : 'http://localhost:5000');

    console.log('🔌 Connecting to socket:', socketUrl);

    const newSocket = io(socketUrl, {
      auth: { token: accessToken },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected');
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [accessToken]);

  return socket;
}