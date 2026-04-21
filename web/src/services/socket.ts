import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<Function>> = new Map();

  /**
   * Initialiser la connexion Socket.IO
   */
  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    const token = useAuthStore.getState().accessToken;
    const user = useAuthStore.getState().user;

    console.log('🔌 Connecting to socket server:', SOCKET_URL);

    this.socket = io(SOCKET_URL, {
      auth: {
        token: token || '',
        userId: user?.id || null,
        username: user?.username || null,
      },
      transports: ['polling', 'websocket'],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: true,
      withCredentials: true,
    });

    this.setupListeners();
    return this.socket;
  }

  /**
   * Configurer les écouteurs d'événements de base
   */
  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Socket connected with ID:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('🔌 Socket disconnected:', reason);
      
      if (reason === 'io server disconnect') {
        // Reconnexion manuelle si déconnecté par le serveur
        setTimeout(() => {
          this.socket?.connect();
        }, 1000);
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('❌ Socket connection error:', error.message);
      this.reconnectAttempts++;
    });

    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log('✅ Socket reconnected after', attemptNumber, 'attempts');
    });

    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log('🔄 Reconnect attempt:', attemptNumber);
    });

    this.socket.on('reconnect_error', (error: Error) => {
      console.error('❌ Reconnect error:', error.message);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Reconnect failed after max attempts');
    });
  }

  /**
   * Récupérer l'instance du socket
   */
  getSocket(): Socket | null {
    if (!this.socket || !this.socket.connected) {
      return this.connect();
    }
    return this.socket;
  }

  /**
   * Vérifier si le socket est connecté
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Émettre un événement
   */
  emit(event: string, data?: any): void {
    const socket = this.getSocket();
    if (socket) {
      socket.emit(event, data);
    }
  }

  /**
   * Écouter un événement
   */
  on(event: string, callback: Function): void {
    const socket = this.getSocket();
    if (socket) {
      socket.on(event, callback as any);
      
      // Stocker le listener pour pouvoir le nettoyer plus tard
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set());
      }
      this.listeners.get(event)?.add(callback);
    }
  }

  /**
   * Arrêter d'écouter un événement
   */
  off(event: string, callback?: Function): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback as any);
        this.listeners.get(event)?.delete(callback);
      } else {
        this.socket.off(event);
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Supprimer tous les écouteurs
   */
  removeAllListeners(): void {
    if (this.socket) {
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          this.socket?.off(event, callback as any);
        });
      });
      this.listeners.clear();
    }
  }

  /**
   * Déconnecter le socket
   */
  disconnect(): void {
    if (this.socket) {
      this.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Reconnecter avec un nouveau token
   */
  reconnectWithNewToken(token: string): void {
    if (this.socket) {
      this.socket.auth = { token };
      this.socket.disconnect().connect();
    }
  }

  // =====================================================
  // ÉVÉNEMENTS SPÉCIFIQUES À L'APPLICATION
  // =====================================================

  /**
   * Rejoindre un stream
   */
  joinStream(streamId: string): void {
    this.emit('join_stream', streamId);
  }

  /**
   * Quitter un stream
   */
  leaveStream(streamId: string): void {
    this.emit('leave_stream', streamId);
  }

  /**
   * Envoyer un message dans le chat
   */
  sendChatMessage(streamId: string, message: string): void {
    this.emit('chat_message', { streamId, message });
  }

  /**
   * Liker un stream
   */
  likeStream(streamId: string): void {
    this.emit('like_stream', { streamId });
  }

  /**
   * Démarrer une diffusion
   */
  startBroadcast(streamId: string): void {
    this.emit('start_broadcast', { streamId });
  }

  /**
   * Arrêter une diffusion
   */
  endBroadcast(streamId: string): void {
    this.emit('end_broadcast', { streamId });
  }

  /**
   * Envoyer des données de stream
   */
  sendStreamData(streamId: string, chunk: string): void {
    this.emit('stream_data', { streamId, chunk });
  }

  /**
   * Obtenir la liste des spectateurs
   */
  getViewers(streamId: string): void {
    this.emit('get_viewers', { streamId });
  }
}

// Exporter une instance singleton
export const socketService = new SocketService();
export default socketService;