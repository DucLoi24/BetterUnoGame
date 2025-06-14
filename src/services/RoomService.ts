import { Room, RoomPlayer, CreateRoomData, JoinRoomData, RoomEvent } from '../types/Room';

class RoomService {
  private rooms: Map<string, Room> = new Map();
  private eventListeners: Map<string, ((event: RoomEvent) => void)[]> = new Map();
  private playerRoomMap: Map<string, string> = new Map(); // playerId -> roomId

  // Generate unique room ID
  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // Generate unique player ID
  private generatePlayerId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // Create new room
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

    this.rooms.set(roomId, room);
    this.playerRoomMap.set(playerId, roomId);
    this.eventListeners.set(roomId, []);

    return { room, playerId };
  }

  // Join existing room
  joinRoom(data: JoinRoomData): { success: boolean; room?: Room; playerId?: string; error?: string } {
    const room = this.rooms.get(data.roomId);
    
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
    this.playerRoomMap.set(playerId, data.roomId);

    // Notify all players in room
    this.emitToRoom(data.roomId, { type: 'PLAYER_JOINED', player: newPlayer });

    return { success: true, room, playerId };
  }

  // Leave room
  leaveRoom(playerId: string): boolean {
    const roomId = this.playerRoomMap.get(playerId);
    if (!roomId) return false;

    const room = this.rooms.get(roomId);
    if (!room) return false;

    // Remove player from room
    room.players = room.players.filter(p => p.id !== playerId);
    room.currentPlayers--;
    this.playerRoomMap.delete(playerId);

    // If room is empty, delete it
    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      this.eventListeners.delete(roomId);
      return true;
    }

    // If host left, assign new host
    if (room.hostId === playerId) {
      const newHost = room.players[0];
      room.hostId = newHost.id;
      room.hostName = newHost.name;
      newHost.isHost = true;
      
      this.emitToRoom(roomId, { type: 'HOST_CHANGED', newHostId: newHost.id });
    }

    // Notify remaining players
    this.emitToRoom(roomId, { type: 'PLAYER_LEFT', playerId });

    return true;
  }

  // Kick player (host only)
  kickPlayer(hostId: string, targetPlayerId: string): boolean {
    const roomId = this.playerRoomMap.get(hostId);
    if (!roomId) return false;

    const room = this.rooms.get(roomId);
    if (!room || room.hostId !== hostId) return false;

    const targetPlayer = room.players.find(p => p.id === targetPlayerId);
    if (!targetPlayer || targetPlayer.isHost) return false;

    // Remove player
    room.players = room.players.filter(p => p.id !== targetPlayerId);
    room.currentPlayers--;
    this.playerRoomMap.delete(targetPlayerId);

    // Notify all players
    this.emitToRoom(roomId, { type: 'PLAYER_KICKED', playerId: targetPlayerId });

    return true;
  }

  // Get room by ID
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  // Get all active rooms (public info only)
  getActiveRooms(): Omit<Room, 'password'>[] {
    return Array.from(this.rooms.values())
      .filter(room => room.status === 'waiting' && !room.gameInProgress)
      .map(room => {
        const { password, ...publicRoom } = room;
        return publicRoom;
      });
  }

  // Get player's current room
  getPlayerRoom(playerId: string): Room | undefined {
    const roomId = this.playerRoomMap.get(playerId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  // Start game in room
  startGame(hostId: string): boolean {
    const roomId = this.playerRoomMap.get(hostId);
    if (!roomId) return false;

    const room = this.rooms.get(roomId);
    if (!room || room.hostId !== hostId) return false;

    if (room.players.length < 2) return false;

    room.status = 'playing';
    room.gameInProgress = true;

    this.emitToRoom(roomId, { type: 'GAME_STARTED' });
    return true;
  }

  // End game in room
  endGame(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.status = 'waiting';
    room.gameInProgress = false;

    // Reset all players ready status
    room.players.forEach(player => {
      if (!player.isHost) {
        player.isReady = false;
      }
    });

    this.emitToRoom(roomId, { type: 'GAME_ENDED' });
    return true;
  }

  // Toggle player ready status
  toggleReady(playerId: string): boolean {
    const roomId = this.playerRoomMap.get(playerId);
    if (!roomId) return false;

    const room = this.rooms.get(roomId);
    if (!room) return false;

    const player = room.players.find(p => p.id === playerId);
    if (!player || player.isHost) return false;

    player.isReady = !player.isReady;
    this.emitToRoom(roomId, { type: 'ROOM_UPDATED', room });
    return true;
  }

  // Event system
  addEventListener(roomId: string, callback: (event: RoomEvent) => void): () => void {
    if (!this.eventListeners.has(roomId)) {
      this.eventListeners.set(roomId, []);
    }
    
    const listeners = this.eventListeners.get(roomId)!;
    listeners.push(callback);

    // Return unsubscribe function
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

  // Cleanup inactive rooms (call periodically)
  cleanupInactiveRooms(): void {
    const now = new Date();
    const maxInactiveTime = 30 * 60 * 1000; // 30 minutes

    for (const [roomId, room] of this.rooms.entries()) {
      const inactiveTime = now.getTime() - room.createdAt.getTime();
      
      if (inactiveTime > maxInactiveTime && room.status === 'waiting' && !room.gameInProgress) {
        // Remove all players from tracking
        room.players.forEach(player => {
          this.playerRoomMap.delete(player.id);
        });
        
        // Delete room
        this.rooms.delete(roomId);
        this.eventListeners.delete(roomId);
      }
    }
  }
}

// Singleton instance
export const roomService = new RoomService();

// Auto cleanup every 5 minutes
setInterval(() => {
  roomService.cleanupInactiveRooms();
}, 5 * 60 * 1000);