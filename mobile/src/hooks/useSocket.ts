import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/constants';

// ✅ URL du socket en fonction de la plateforme
const getSocketUrl = () => {
  if (__DEV__) {
    // En développement
    return Platform.select({
      ios: 'http://192.168.131.90:5000',
      android: 'http://192.168.131.90:5000',
      default: 'http://192.168.131.90:5000',
    });
  }
  // En production
  return 'https://api.denonciation.com';
};

const SOCKET_URL = getSocketUrl();

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  reconnect: () => void;
  disconnect: () => void;
}

export function useSocket(): UseSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const { accessToken, user, refreshToken, tokenExpiry } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

  // ✅ Fonction pour récupérer le token valide le plus récent
  const getValidToken = useCallback(async (): Promise<string | null> => {
    // 1. Vérifier le token du store
    if (accessToken) {
      // Vérifier si le token n'est pas expiré
      if (tokenExpiry && new Date(tokenExpiry) > new Date()) {
        console.log('🔑 Token from store is valid, expires:', new Date(tokenExpiry).toLocaleString());
        return accessToken;
      } else if (tokenExpiry) {
        console.log('⚠️ Token from store is expired, trying refresh...');
      } else {
        console.log('🔑 Using token from store (no expiry info)');
        return accessToken;
      }
    }
    
    // 2. Essayer de récupérer depuis AsyncStorage
    try {
      const storedToken = await AsyncStorage.getItem('accessToken');
      const storedExpiry = await AsyncStorage.getItem('tokenExpiry');
      
      if (storedToken && storedExpiry) {
        if (new Date(storedExpiry) > new Date()) {
          console.log('🔑 Token from AsyncStorage is valid');
          return storedToken;
        } else {
          console.log('⚠️ Token from AsyncStorage is expired');
        }
      } else if (storedToken) {
        console.log('🔑 Using token from AsyncStorage (no expiry info)');
        return storedToken;
      }
    } catch (error) {
      console.error('❌ Failed to get token from AsyncStorage:', error);
    }
    
    // 3. Essayer de rafraîchir le token
    if (refreshToken) {
      try {
        console.log('🔄 Attempting to refresh token...');
        const refreshUrl = `${API_BASE_URL}/auth/refresh`;
        
        const response = await fetch(refreshUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Stocker le nouveau token
          await AsyncStorage.setItem('accessToken', data.accessToken);
          if (data.expiresIn) {
            const expiry = new Date(Date.now() + data.expiresIn * 1000);
            await AsyncStorage.setItem('tokenExpiry', expiry.toISOString());
          }
          
          console.log('✅ Token refreshed successfully');
          return data.accessToken;
        } else {
          console.error('❌ Token refresh failed:', response.status);
        }
      } catch (error) {
        console.error('❌ Failed to refresh token:', error);
      }
    }
    
    console.warn('⚠️ No valid token available');
    return null;
  }, [accessToken, tokenExpiry, refreshToken]);

  // ✅ Fonction pour créer une nouvelle connexion socket
  const createSocketConnection = useCallback(async () => {
    const token = await getValidToken();
    
    if (!token) {
      console.error('❌ Cannot create socket connection: No authentication token');
      setConnectionError('Authentication required - No token');
      return null;
    }

    // Fermer l'ancienne connexion si elle existe
    if (socketRef.current) {
      console.log('🔌 Closing existing socket connection');
      socketRef.current.removeAllListeners();
      socketRef.current.close();
      socketRef.current = null;
    }

    console.log('🔌 Creating new socket connection to:', SOCKET_URL);
    console.log('🔐 Auth token:', token.substring(0, 20) + '...');
    console.log('👤 User ID:', user?.id);
    console.log('📱 Platform:', Platform.OS);

    // ✅ Configuration complète du socket
    const newSocket = io(SOCKET_URL, {
      auth: {
        token: token,
        userId: user?.id,
        username: user?.username,
      },
      // Transports : essayer polling d'abord (plus fiable sur certains réseaux)
      transports: ['polling', 'websocket'],
      // Permettre l'upgrade vers WebSocket
      upgrade: true,
      // Reconnection
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      // Timeouts
      timeout: 30000,
      connectTimeout: 30000,
      // Force nouvelle connexion
      forceNew: true,
      // Désactiver la compression pour éviter des bugs
      perMessageDeflate: false,
      // Headers supplémentaires
      extraHeaders: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      },
      // Configuration spécifique React Native
      jsonp: false,
      withCredentials: true,
    });

    // =====================================================
    // ÉVÉNEMENTS DE CONNEXION
    // =====================================================

    newSocket.on('connect', () => {
      console.log('✅ Socket connected successfully');
      console.log('   Socket ID:', newSocket.id);
      console.log('   Transport:', newSocket.io.engine.transport.name);
      console.log('   Connected:', newSocket.connected);
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttemptsRef.current = 0;
      
      // Effacer le timer de reconnexion
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      console.error('   Error details:', error);
      console.error('   Transport:', newSocket.io.engine?.transport?.name || 'unknown');
      setConnectionError(error.message);
      setIsConnected(false);
      
      // Incrémenter le compteur de tentatives
      reconnectAttemptsRef.current++;
      
      // Si trop de tentatives, arrêter
      if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        console.error('❌ Max reconnection attempts reached');
        setConnectionError('Max reconnection attempts reached');
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      console.log('   Was connected:', newSocket.connected);
      setIsConnected(false);
      
      // Si déconnecté par le serveur, tenter une reconnexion manuelle
      if (reason === 'io server disconnect') {
        console.log('🔄 Server disconnected, attempting manual reconnect...');
        reconnectTimerRef.current = setTimeout(() => {
          newSocket.connect();
        }, 1000);
      }
      
      // Si déconnecté à cause d'un problème de transport
      if (reason === 'transport close' || reason === 'transport error') {
        console.log('🔄 Transport issue, socket will auto-reconnect');
      }
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('✅ Socket reconnected after', attemptNumber, 'attempts');
      console.log('   Transport:', newSocket.io.engine.transport.name);
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttemptsRef.current = 0;
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Reconnect attempt:', attemptNumber, '/', maxReconnectAttempts);
      console.log('   Transport:', newSocket.io.engine?.transport?.name || 'unknown');
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('❌ Reconnect error:', error.message);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('❌ Reconnect failed after max attempts');
      setConnectionError('Failed to reconnect after multiple attempts');
      setIsConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });

    // =====================================================
    // ÉVÉNEMENTS MÉTIER
    // =====================================================

    newSocket.on('new_stream', (data) => {
      console.log('📡 New stream event received:', data);
    });

    newSocket.on('stream_ended_global', (data) => {
      console.log('📡 Stream ended event received:', data);
    });

    newSocket.on('viewer_count_update', (data) => {
      // Silencieux pour éviter le spam
      // console.log('📡 Viewer count update:', data);
    });

    newSocket.on('new_chat_message', (data) => {
      // console.log('💬 New chat message:', data);
    });

    newSocket.on('like_update', (data) => {
      // console.log('❤️ Like update:', data);
    });

    newSocket.on('broadcast_started', (data) => {
      console.log('🎥 Broadcast started:', data);
    });

    newSocket.on('broadcast_ended', (data) => {
      console.log('🛑 Broadcast ended:', data);
    });

    newSocket.on('stream_chunk', (data) => {
      // Données vidéo - ne pas logger pour éviter le spam
    });

    // Événement pour détecter le changement de transport
    newSocket.io.engine.on('upgrade', (transport) => {
      console.log('🔄 Socket transport upgraded to:', transport.name);
    });

    newSocket.io.engine.on('upgradeError', (error) => {
      console.error('❌ Socket transport upgrade error:', error);
    });

    newSocket.io.engine.on('packet', (packet) => {
      // Silencieux - pour déboguer uniquement
      // console.log('📦 Socket packet:', packet.type);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
    
    return newSocket;
  }, [user, getValidToken]);

  // ✅ Fonction de reconnexion manuelle
  const reconnect = useCallback(() => {
    console.log('🔄 Manual reconnect requested');
    reconnectAttemptsRef.current = 0;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    createSocketConnection();
  }, [createSocketConnection]);

  // ✅ Fonction de déconnexion
  const disconnect = useCallback(() => {
    console.log('🔌 Manual disconnect requested');
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.close();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  // ✅ Initialisation de la connexion
  useEffect(() => {
    console.log('🚀 useSocket initializing...');
    createSocketConnection();

    return () => {
      console.log('🧹 useSocket cleanup');
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.close();
        socketRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [createSocketConnection]);

  // ✅ Reconnexion quand le token change
  useEffect(() => {
    if (accessToken && socketRef.current && !isConnected) {
      console.log('🔄 Token changed, reconnecting socket...');
      createSocketConnection();
    }
  }, [accessToken, isConnected, createSocketConnection]);

  return {
    socket,
    isConnected,
    connectionError,
    reconnect,
    disconnect,
  };
}

// ✅ Export par défaut
export default useSocket;