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

    const newSocket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      // ✅ Log uniquement en développement
      if (import.meta.env.DEV) {
        console.log('✅ Socket connected');
      }
    });

    newSocket.on('disconnect', () => {
      // ✅ Désactivé pour éviter le bruit dans la console
      // console.log('🔌 Socket disconnected');
    });

    newSocket.on('connect_error', (error) => {
      // ✅ Log uniquement en développement
      if (import.meta.env.DEV) {
        console.error('❌ Socket connection error:', error);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [accessToken]);

  return socket;
}