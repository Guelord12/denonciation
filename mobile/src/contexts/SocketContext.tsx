import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ✅ IP de la machine pour WebSocket (mise à jour)
const YOUR_PC_IP = '192.168.176.90';

const getSocketUrl = () => {
  if (__DEV__) {
    const url = Platform.select({
      ios: `http://${YOUR_PC_IP}:5000`,
      android: `http://${YOUR_PC_IP}:5000`,
      default: `http://${YOUR_PC_IP}:5000`,
    });
    console.log('🔌 Socket URL:', url);
    return url;
  }
  return 'https://api.denonciation.com';
};

const SOCKET_URL = getSocketUrl();

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let mounted = true;

    const connectSocket = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        
        if (!token) {
          console.log('ℹ️ No access token, skipping socket connection');
          return;
        }

        console.log('🔌 Connecting to socket server...');

        const newSocket = io(SOCKET_URL, {
          auth: { token },
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        newSocket.on('connect', () => {
          console.log('✅ Socket connected');
          if (mounted) {
            setIsConnected(true);
          }
        });

        newSocket.on('disconnect', (reason) => {
          console.log('🔌 Socket disconnected:', reason);
          if (mounted) {
            setIsConnected(false);
          }
        });

        newSocket.on('connect_error', (error) => {
          console.error('❌ Socket connection error:', error.message);
        });

        if (mounted) {
          setSocket(newSocket);
        }
      } catch (error) {
        console.error('Error connecting socket:', error);
      }
    };

    connectSocket();

    return () => {
      mounted = false;
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}