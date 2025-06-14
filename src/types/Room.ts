export interface Room {
  id: string;
  name: string;
  hostId: string;
  hostName: string;
  maxPlayers: number;
  currentPlayers: number;
  hasPassword: boolean;
  password?: string;
  players: RoomPlayer[];
  status: 'waiting' | 'playing' | 'finished';
  createdAt: Date;
  gameInProgress: boolean;
}

export interface RoomPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  joinedAt: Date;
}

export interface CreateRoomData {
  name: string;
  maxPlayers: number;
  password?: string;
  hostName: string;
}

export interface JoinRoomData {
  roomId: string;
  playerName: string;
  password?: string;
}

export type RoomEvent = 
  | { type: 'PLAYER_JOINED'; player: RoomPlayer }
  | { type: 'PLAYER_LEFT'; playerId: string }
  | { type: 'PLAYER_KICKED'; playerId: string }
  | { type: 'ROOM_UPDATED'; room: Room }
  | { type: 'GAME_STARTED' }
  | { type: 'GAME_ENDED' }
  | { type: 'HOST_CHANGED'; newHostId: string }
  | { type: 'KICKED_FROM_ROOM' };