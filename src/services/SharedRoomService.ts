import { Room, RoomPlayer, CreateRoomData, JoinRoomData, RoomEvent } from '../types/Room';

interface SharedRoomData {
  rooms: Record<string, Room>;
  lastUpdated: number;
}

class SharedRoomService {
  private readonly STORAGE_KEY = 'uno_shared_rooms';
  private readonly UPDATE_INTERVAL = 2000; // 2 seconds
  private eventListeners: Map<string, ((event: RoomEvent) => void)[]> = new Map();
  private playerRoomMap: Map<string, string> = new Map();
  private updateTimer: NodeJS.Timeout | null = null;
  private lastKnownUpdate = 0;

  constructor() {
    this.startPolling();
    this.cleanupOldRooms();
    
    // Listen for storage changes from other tabs
    window.addEventListener('storage', this.handleStorageChange.bind(this));
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', this.cleanup.bind(this));
  }

  private startPolling() {
    this.updateTimer = setInterval(() => {
      this.checkForUpdates();
    }, this.UPDATE_INTERVAL);
  }

  private stopPolling() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  private handleStorageChange(event: StorageEvent) {
    if (event.key === this.STORAGE_KEY) {
      this.checkForUpdates();
    }
  }

  private checkForUpdates() {
    const data = this.getSharedData();
    if (data.lastUpdated > this.lastKnownUpdate) {
      this.lastKnownUpdate = data.lastUpdated;
      // Emit room updates to listeners
      Object.values(data.rooms).forEach(room => {
        this.emitToRoom(room.id, { type: 'ROOM_UPDATED', room });
      });
    }
  }

  private getSharedData(): SharedRoomData {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        // Convert date strings back to Date objects
        Object.values(data.rooms).forEach((room: any) => {
          room.createdAt = new Date(room.createdAt);
          room.players.forEach((player: any) => {
            player.joinedAt = new Date(player.joinedAt);
          });
        });
        return data;
      }
    } catch (error) {
      console.error('Error reading shared room data:', error);
    }
    
    return { rooms: {}, lastUpdated: 0 };
  }

  private setSharedData(data: SharedRoomData) {
    try {
      data.lastUpdated = Date.now();
      this.lastKnownUpdate = data.lastUpdated;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving shared room data:', error);
    }
  }

  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  private generatePlayerId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  createRoom(data: CreateRoomData): { room: Room; playerId: string } {
    const roomId = this.generateRoomId();
    const playerId = this.generatePlayerId();
    
    const hostPlayer: RoomPlayer = {
      id: playerId,
      name: data.hostName,
      isHost: true,
      isReady: true,
      joinedAt: new Date()
    };

    const room: Room = {
      id: roomId,
      name: data.name,
      hostId: playerId,
      hostName: data.hostName,
      maxPlayers: data.maxPlayers,
      currentPlayers: 1,
      hasPassword: !!data.password,
      password: data.password,
      players: [hostPlayer],
      status: 'waiting',
      createdAt: new Date(),
      gameInProgress: false
    };

    // Save to shared storage
    const sharedData = this.getSharedData();
    sharedData.rooms[roomId] = room;
    this.setSharedData(sharedData);

    this.playerRoomMap.set(playerId, roomId);
    this.eventListeners.set(roomId, []);

    return { room, playerId };
  }

  joinRoom(data: JoinRoomData): { success: boolean; room?: Room; playerId?: string; error?: string } {
    const sharedData = this.getSharedData();
    const room = sharedData.rooms[data.roomId];
    
    if (!room) {
      return { success: false, error: 'Phòng không tồn tại' };
    }

    if (room.currentPlayers >= room.maxPlayers) {
      return { success: false, error: 'Phòng đã đầy' };
    }

    if (room.hasPassword && room.password !== data.password) {
      return { success: false, error: 'Mật khẩu không đúng' };
    }

    if (room.gameInProgress) {
      return { success: false, error: 'Game đang diễn ra' };
    }

    const playerId = this.generatePlayerId();
    const newPlayer: RoomPlayer = {
      id: playerId,
      name: data.playerName,
      isHost: false,
      isReady: false,
      joinedAt: new Date()
    };

    room.players.push(newPlayer);
    room.currentPlayers++;
    
    // Update shared storage
    sharedData.rooms[data.roomId] = room;
    this.setSharedData(sharedData);

    this.playerRoomMap.set(playerId, data.roomId);

    // Notify all players in room
    this.emitToRoom(data.roomId, { type: 'PLAYER_JOINED', player: newPlayer });

    return { success: true, room, playerId };
  }

  leaveRoom(playerId: string): boolean {
    const roomId = this.playerRoomMap.get(playerId);
    if (!roomId) return false;

    const sharedData = this.getSharedData();
    const room = sharedData.rooms[roomId];
    if (!room) return false;

    // Remove player from room
    room.players = room.players.filter(p => p.id !== playerId);
    room.currentPlayers--;
    this.playerRoomMap.delete(playerId);

    // If room is empty, delete it
    if (room.players.length === 0) {
      delete sharedData.rooms[roomId];
      this.eventListeners.delete(roomId);
    } else {
      // If host left, assign new host
      if (room.hostId === playerId) {
        const newHost = room.players[0];
        room.hostId = newHost.id;
        room.hostName = newHost.name;
        newHost.isHost = true;
        
        this.emitToRoom(roomId, { type: 'HOST_CHANGED', newHostId: newHost.id });
      }

      // Update room in shared storage
      sharedData.rooms[roomId] = room;
      
      // Notify remaining players
      this.emitToRoom(roomId, { type: 'PLAYER_LEFT', playerId });
    }

    this.setSharedData(sharedData);
    return true;
  }

  kickPlayer(hostId: string, targetPlayerId: string): boolean {
    const roomId = this.playerRoomMap.get(hostId);
    if (!roomId) return false;

    const sharedData = this.getSharedData();
    const room = sharedData.rooms[roomId];
    if (!room || room.hostId !== hostId) return false;

    const targetPlayer = room.players.find(p => p.id === targetPlayerId);
    if (!targetPlayer || targetPlayer.isHost) return false;

    // Remove player
    room.players = room.players.filter(p => p.id !== targetPlayerId);
    room.currentPlayers--;
    this.playerRoomMap.delete(targetPlayerId);

    // Update shared storage
    sharedData.rooms[roomId] = room;
    this.setSharedData(sharedData);

    // Notify all players
    this.emitToRoom(roomId, { type: 'PLAYER_KICKED', playerId: targetPlayerId });

    return true;
  }

  getRoom(roomId: string): Room | undefined {
    const sharedData = this.getSharedData();
    return sharedData.rooms[roomId];
  }

  getActiveRooms(): Omit<Room, 'password'>[] {
    const sharedData = this.getSharedData();
    return Object.values(sharedData.rooms)
      .filter(room => room.status === 'waiting' && !room.gameInProgress)
      .map(room => {
        const { password, ...publicRoom } = room;
        return publicRoom;
      });
  }

  getPlayerRoom(playerId: string): Room | undefined {
    const roomId = this.playerRoomMap.get(playerId);
    return roomId ? this.getRoom(roomId) : undefined;
  }

  startGame(hostId: string): boolean {
    const roomId = this.playerRoomMap.get(hostId);
    if (!roomId) return false;

    const sharedData = this.getSharedData();
    const room = sharedData.rooms[roomId];
    if (!room || room.hostId !== hostId) return false;

    if (room.players.length < 2) return false;

    room.status = 'playing';
    room.gameInProgress = true;

    // Update shared storage
    sharedData.rooms[roomId] = room;
    this.setSharedData(sharedData);

    this.emitToRoom(roomId, { type: 'GAME_STARTED' });
    return true;
  }

  endGame(roomId: string): boolean {
    const sharedData = this.getSharedData();
    const room = sharedData.rooms[roomId];
    if (!room) return false;

    room.status = 'waiting';
    room.gameInProgress = false;

    // Reset all players ready status
    room.players.forEach(player => {
      if (!player.isHost) {
        player.isReady = false;
      }
    });

    // Update shared storage
    sharedData.rooms[roomId] = room;
    this.setSharedData(sharedData);

    this.emitToRoom(roomId, { type: 'GAME_ENDED' });
    return true;
  }

  toggleReady(playerId: string): boolean {
    const roomId = this.playerRoomMap.get(playerId);
    if (!roomId) return false;

    const sharedData = this.getSharedData();
    const room = sharedData.rooms[roomId];
    if (!room) return false;

    const player = room.players.find(p => p.id === playerId);
    if (!player || player.isHost) return false;

    player.isReady = !player.isReady;
    
    // Update shared storage
    sharedData.rooms[roomId] = room;
    this.setSharedData(sharedData);
    
    this.emitToRoom(roomId, { type: 'ROOM_UPDATED', room });
    return true;
  }

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

  private emitToRoom(roomId: string, event: RoomEvent): void {
    const listeners = this.eventListeners.get(roomId);
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }
  }

  private cleanupOldRooms(): void {
    const cleanup = () => {
      const sharedData = this.getSharedData();
      const now = new Date();
      const maxInactiveTime = 30 * 60 * 1000; // 30 minutes
      let hasChanges = false;

      Object.entries(sharedData.rooms).forEach(([roomId, room]) => {
        const inactiveTime = now.getTime() - room.createdAt.getTime();
        
        if (inactiveTime > maxInactiveTime && room.status === 'waiting' && !room.gameInProgress) {
          delete sharedData.rooms[roomId];
          hasChanges = true;
        }
      });

      if (hasChanges) {
        this.setSharedData(sharedData);
      }
    };

    // Run cleanup immediately and then every 5 minutes
    cleanup();
    setInterval(cleanup, 5 * 60 * 1000);
  }

  private cleanup(): void {
    // Leave current room if any
    const currentPlayerId = Array.from(this.playerRoomMap.keys())[0];
    if (currentPlayerId) {
      this.leaveRoom(currentPlayerId);
    }
    
    this.stopPolling();
    window.removeEventListener('storage', this.handleStorageChange.bind(this));
    window.removeEventListener('beforeunload', this.cleanup.bind(this));
  }
}

export const sharedRoomService = new SharedRoomService();