import { io, Socket } from 'socket.io-client';
import { Room, RoomPlayer, CreateRoomData, JoinRoomData, RoomEvent } from '../types/Room';
import { GameState, Card, CardColor } from '../types/Card';

interface ServerResponse<T = any> {
  success: boolean;
  error?: string;
  data?: T;
  room?: Room;
  playerId?: string;
}

class SocketService {
  private socket: Socket | null = null;
  private eventListeners: Map<string, ((event: RoomEvent) => void)[]> = new Map();
  private gameEventListeners: ((event: any) => void)[] = [];
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    this.connect();
  }

  private connect() {
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Connected to UNO server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      this.isConnected = false;
      
      if (reason === 'io server disconnect') {
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔴 Connection error:', error);
      this.isConnected = false;
      this.handleReconnect();
    });

    // Room events
    this.socket.on('rooms-updated', (rooms: Omit<Room, 'password'>[]) => {
      this.emitGlobalEvent({ type: 'ROOMS_UPDATED', rooms });
    });

    this.socket.on('player-joined', (data: { player: RoomPlayer }) => {
      this.emitRoomEvent({ type: 'PLAYER_JOINED', player: data.player });
    });

    this.socket.on('player-left', (data: { playerId: string; newHost?: RoomPlayer }) => {
      this.emitRoomEvent({ type: 'PLAYER_LEFT', playerId: data.playerId });
      if (data.newHost) {
        this.emitRoomEvent({ type: 'HOST_CHANGED', newHostId: data.newHost.id });
      }
    });

    this.socket.on('player-kicked', (data: { playerId: string; playerName: string }) => {
      this.emitRoomEvent({ type: 'PLAYER_KICKED', playerId: data.playerId });
    });

    this.socket.on('room-updated', (data: { room: Room }) => {
      this.emitRoomEvent({ type: 'ROOM_UPDATED', room: data.room });
    });

    this.socket.on('game-started', (data: { room: Room }) => {
      this.emitRoomEvent({ type: 'GAME_STARTED' });
    });

    this.socket.on('kicked-from-room', () => {
      this.emitRoomEvent({ type: 'KICKED_FROM_ROOM' });
    });

    // Game events
    this.socket.on('game-state-update', (gameState: GameState) => {
      this.emitGameEvent({ type: 'GAME_STATE_UPDATE', gameState });
    });

    this.socket.on('card-played', (data: { playerId: string; card: Card; chosenColor?: CardColor }) => {
      this.emitGameEvent({ type: 'CARD_PLAYED', ...data });
    });

    this.socket.on('card-drawn', (data: { playerId: string; count: number }) => {
      this.emitGameEvent({ type: 'CARD_DRAWN', ...data });
    });

    this.socket.on('uno-called', (data: { playerId: string }) => {
      this.emitGameEvent({ type: 'UNO_CALLED', ...data });
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
      
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
      
      setTimeout(() => {
        if (this.socket) {
          this.socket.connect();
        }
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached');
      this.emitGlobalEvent({ type: 'CONNECTION_FAILED' });
    }
  }

  // Public methods
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  async createRoom(data: CreateRoomData): Promise<{ success: boolean; room?: Room; playerId?: string; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket || !this.isConnected) {
        resolve({ success: false, error: 'Không có kết nối đến server' });
        return;
      }

      this.socket.emit('create-room', data, (response: ServerResponse) => {
        resolve(response);
      });
    });
  }

  async joinRoom(data: JoinRoomData): Promise<{ success: boolean; room?: Room; playerId?: string; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket || !this.isConnected) {
        resolve({ success: false, error: 'Không có kết nối đến server' });
        return;
      }

      this.socket.emit('join-room', data, (response: ServerResponse) => {
        resolve(response);
      });
    });
  }

  leaveRoom(): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave-room');
    }
  }

  async toggleReady(): Promise<{ success: boolean; isReady?: boolean }> {
    return new Promise((resolve) => {
      if (!this.socket || !this.isConnected) {
        resolve({ success: false });
        return;
      }

      this.socket.emit('toggle-ready', (response: { success: boolean; isReady?: boolean }) => {
        resolve(response);
      });
    });
  }

  async startGame(): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket || !this.isConnected) {
        resolve({ success: false, error: 'Không có kết nối đến server' });
        return;
      }

      this.socket.emit('start-game', (response: { success: boolean; error?: string }) => {
        resolve(response);
      });
    });
  }

  async kickPlayer(targetPlayerId: string): Promise<{ success: boolean }> {
    return new Promise((resolve) => {
      if (!this.socket || !this.isConnected) {
        resolve({ success: false });
        return;
      }

      this.socket.emit('kick-player', { targetPlayerId }, (response: { success: boolean }) => {
        resolve(response);
      });
    });
  }

  async getActiveRooms(): Promise<Omit<Room, 'password'>[]> {
    return new Promise((resolve) => {
      if (!this.socket || !this.isConnected) {
        resolve([]);
        return;
      }

      this.socket.emit('get-rooms', (rooms: Omit<Room, 'password'>[]) => {
        resolve(rooms);
      });
    });
  }

  // Game actions
  broadcastGameState(gameState: GameState): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('broadcast-game-state', gameState);
    }
  }

  broadcastCardPlay(playerId: string, card: Card, chosenColor?: CardColor): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('broadcast-card-play', { playerId, card, chosenColor });
    }
  }

  broadcastDrawCard(playerId: string, count: number): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('broadcast-draw-card', { playerId, count });
    }
  }

  broadcastUnoCall(playerId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('broadcast-uno-call', { playerId });
    }
  }

  // Event system
  addEventListener(roomId: string, callback: (event: RoomEvent) => void): () => void {
    if (!this.eventListeners.has(roomId)) {
      this.eventListeners.set(roomId, []);
    }
    
    const listeners = this.eventListeners.get(roomId)!;
    listeners.push(callback);

    return () => {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  addGlobalEventListener(callback: (event: any) => void): () => void {
    return this.addEventListener('__global__', callback);
  }

  addGameEventListener(callback: (event: any) => void): () => void {
    this.gameEventListeners.push(callback);
    
    return () => {
      const index = this.gameEventListeners.indexOf(callback);
      if (index > -1) {
        this.gameEventListeners.splice(index, 1);
      }
    };
  }

  private emitRoomEvent(event: RoomEvent): void {
    this.eventListeners.forEach((listeners) => {
      listeners.forEach(callback => callback(event));
    });
  }

  private emitGlobalEvent(event: any): void {
    const listeners = this.eventListeners.get('__global__');
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }
  }

  private emitGameEvent(event: any): void {
    this.gameEventListeners.forEach(callback => callback(event));
  }

  // Cleanup
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.eventListeners.clear();
    this.gameEventListeners = [];
  }
}

// Singleton instance
export const socketService = new SocketService();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  socketService.disconnect();
});