import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000", "https://betterunogame.netlify.app"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000", "https://betterunogame.netlify.app"],
  credentials: true
}));
app.use(express.json());

// In-memory storage
const rooms = new Map();
const players = new Map(); // socketId -> playerInfo
const gameStates = new Map(); // roomId -> gameState

// Room management functions
function createRoom(data) {
  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  const playerId = uuidv4();
  
  const hostPlayer = {
    id: playerId,
    name: data.hostName,
    socketId: data.socketId,
    isHost: true,
    isReady: true,
    joinedAt: new Date()
  };

  const room = {
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
    gameInProgress: false,
    gameState: null
  };

  rooms.set(roomId, room);
  players.set(data.socketId, { playerId, roomId });

  return { room, playerId };
}

function joinRoom(data) {
  const room = rooms.get(data.roomId);
  
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

  const playerId = uuidv4();
  const newPlayer = {
    id: playerId,
    name: data.playerName,
    socketId: data.socketId,
    isHost: false,
    isReady: false,
    joinedAt: new Date()
  };

  room.players.push(newPlayer);
  room.currentPlayers++;
  players.set(data.socketId, { playerId, roomId: data.roomId });

  return { success: true, room, playerId };
}

function leaveRoom(socketId) {
  const playerInfo = players.get(socketId);
  if (!playerInfo) return false;

  const room = rooms.get(playerInfo.roomId);
  if (!room) return false;

  // Remove player from room
  room.players = room.players.filter(p => p.id !== playerInfo.playerId);
  room.currentPlayers--;
  players.delete(socketId);

  // If room is empty, delete it
  if (room.players.length === 0) {
    rooms.delete(playerInfo.roomId);
    gameStates.delete(playerInfo.roomId);
    return { roomDeleted: true };
  }

  // If host left, assign new host
  if (room.hostId === playerInfo.playerId) {
    const newHost = room.players[0];
    room.hostId = newHost.id;
    room.hostName = newHost.name;
    newHost.isHost = true;
    
    return { room, newHostId: newHost.id };
  }

  return { room };
}

function getActiveRooms() {
  return Array.from(rooms.values())
    .filter(room => room.status === 'waiting' && !room.gameInProgress)
    .map(room => {
      const { password, ...publicRoom } = room;
      return {
        ...publicRoom,
        players: publicRoom.players.map(p => ({
          id: p.id,
          name: p.name,
          isHost: p.isHost,
          isReady: p.isReady,
          joinedAt: p.joinedAt
        }))
      };
    });
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Create room
  socket.on('create-room', (data, callback) => {
    try {
      const { room, playerId } = createRoom({ ...data, socketId: socket.id });
      
      socket.join(room.id);
      callback({ success: true, room, playerId });
      io.emit('rooms-updated', getActiveRooms());
      
      console.log(`Room created: ${room.id} by ${data.hostName}`);
    } catch (error) {
      callback({ success: false, error: 'Không thể tạo phòng' });
    }
  });

  // Join room
  socket.on('join-room', (data, callback) => {
    try {
      const result = joinRoom({ ...data, socketId: socket.id });
      
      if (result.success) {
        socket.join(data.roomId);
        
        // Notify other players in room
        socket.to(data.roomId).emit('player-joined', {
          player: result.room.players.find(p => p.socketId === socket.id)
        });
        
        callback(result);
        io.emit('rooms-updated', getActiveRooms());
        
        console.log(`${data.playerName} joined room: ${data.roomId}`);
      } else {
        callback(result);
      }
    } catch (error) {
      callback({ success: false, error: 'Không thể tham gia phòng' });
    }
  });

  // Leave room
  socket.on('leave-room', () => {
    const result = leaveRoom(socket.id);
    if (result) {
      const playerInfo = players.get(socket.id) || { roomId: null };
      
      if (result.roomDeleted) {
        socket.leave(playerInfo.roomId);
      } else if (result.room) {
        socket.to(playerInfo.roomId).emit('player-left', {
          playerId: playerInfo.playerId,
          newHost: result.newHostId ? result.room.players.find(p => p.id === result.newHostId) : null
        });
        
        socket.leave(playerInfo.roomId);
      }
      
      io.emit('rooms-updated', getActiveRooms());
    }
  });

  // Toggle ready status
  socket.on('toggle-ready', (callback) => {
    const playerInfo = players.get(socket.id);
    if (!playerInfo) {
      callback({ success: false });
      return;
    }

    const room = rooms.get(playerInfo.roomId);
    if (!room) {
      callback({ success: false });
      return;
    }

    const player = room.players.find(p => p.id === playerInfo.playerId);
    if (!player || player.isHost) {
      callback({ success: false });
      return;
    }

    player.isReady = !player.isReady;
    
    io.to(playerInfo.roomId).emit('room-updated', { room });
    callback({ success: true, isReady: player.isReady });
  });

  // Start game
  socket.on('start-game', (callback) => {
    const playerInfo = players.get(socket.id);
    if (!playerInfo) {
      callback({ success: false });
      return;
    }

    const room = rooms.get(playerInfo.roomId);
    if (!room || room.hostId !== playerInfo.playerId) {
      callback({ success: false });
      return;
    }

    if (room.players.length < 2) {
      callback({ success: false, error: 'Cần ít nhất 2 người chơi' });
      return;
    }

    // Check if all non-host players are ready
    const allReady = room.players.filter(p => !p.isHost).every(p => p.isReady);
    if (!allReady) {
      callback({ success: false, error: 'Chưa tất cả người chơi sẵn sàng' });
      return;
    }

    room.status = 'playing';
    room.gameInProgress = true;

    // Notify all players
    io.to(playerInfo.roomId).emit('game-started', { room });
    io.emit('rooms-updated', getActiveRooms());
    
    callback({ success: true });
  });

  // Get active rooms
  socket.on('get-rooms', (callback) => {
    callback(getActiveRooms());
  });

  // Kick player (host only)
  socket.on('kick-player', (data, callback) => {
    const playerInfo = players.get(socket.id);
    if (!playerInfo) {
      callback({ success: false });
      return;
    }

    const room = rooms.get(playerInfo.roomId);
    if (!room || room.hostId !== playerInfo.playerId) {
      callback({ success: false });
      return;
    }

    const targetPlayer = room.players.find(p => p.id === data.targetPlayerId);
    if (!targetPlayer || targetPlayer.isHost) {
      callback({ success: false });
      return;
    }

    // Remove player
    room.players = room.players.filter(p => p.id !== data.targetPlayerId);
    room.currentPlayers--;
    
    const targetSocketId = targetPlayer.socketId;
    players.delete(targetSocketId);

    // Disconnect the kicked player
    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (targetSocket) {
      targetSocket.emit('kicked-from-room');
      targetSocket.leave(playerInfo.roomId);
    }

    // Notify remaining players
    socket.to(playerInfo.roomId).emit('player-kicked', {
      playerId: data.targetPlayerId,
      playerName: targetPlayer.name
    });

    io.emit('rooms-updated', getActiveRooms());
    callback({ success: true });
  });

  // Game state broadcasting
  socket.on('broadcast-game-state', (gameState) => {
    const playerInfo = players.get(socket.id);
    if (playerInfo) {
      gameStates.set(playerInfo.roomId, gameState);
      socket.to(playerInfo.roomId).emit('game-state-update', gameState);
    }
  });

  socket.on('broadcast-card-play', (data) => {
    const playerInfo = players.get(socket.id);
    if (playerInfo) {
      socket.to(playerInfo.roomId).emit('card-played', data);
    }
  });

  socket.on('broadcast-draw-card', (data) => {
    const playerInfo = players.get(socket.id);
    if (playerInfo) {
      socket.to(playerInfo.roomId).emit('card-drawn', data);
    }
  });

  socket.on('broadcast-uno-call', (data) => {
    const playerInfo = players.get(socket.id);
    if (playerInfo) {
      socket.to(playerInfo.roomId).emit('uno-called', data);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    const result = leaveRoom(socket.id);
    if (result && !result.roomDeleted) {
      const playerInfo = players.get(socket.id) || { roomId: null };
      
      if (result.room) {
        socket.to(playerInfo.roomId).emit('player-left', {
          playerId: playerInfo.playerId,
          newHost: result.newHostId ? result.room.players.find(p => p.id === result.newHostId) : null
        });
      }
      
      io.emit('rooms-updated', getActiveRooms());
    }
  });
});

// REST API endpoints
app.get('/api/rooms', (req, res) => {
  res.json(getActiveRooms());
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    activeRooms: rooms.size,
    connectedPlayers: players.size
  });
});

// Cleanup old rooms every 5 minutes
setInterval(() => {
  const now = new Date();
  const maxInactiveTime = 30 * 60 * 1000; // 30 minutes

  for (const [roomId, room] of rooms.entries()) {
    const inactiveTime = now.getTime() - room.createdAt.getTime();
    
    if (inactiveTime > maxInactiveTime && room.status === 'waiting' && !room.gameInProgress) {
      room.players.forEach(player => {
        players.delete(player.socketId);
      });
      
      rooms.delete(roomId);
      gameStates.delete(roomId);
      console.log(`Cleaned up inactive room: ${roomId}`);
    }
  }
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 UNO Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for connections`);
  console.log(`🌐 CORS enabled for localhost:5173, localhost:3000, and betterunogame.netlify.app`);
});