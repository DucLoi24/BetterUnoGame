import { useState, useEffect, useCallback } from 'react';
import { Room, RoomPlayer, CreateRoomData, JoinRoomData, RoomEvent } from '../types/Room';
import { GameState, Player, Card, CardColor } from '../types/Card';
import { socketService } from '../services/SocketService';
import { createDeck, shuffleDeck } from '../utils/cardUtils';

interface RoomSystemState {
  currentRoom: Room | null;
  currentPlayerId: string | null;
  isHost: boolean;
  activeRooms: Omit<Room, 'password'>[];
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  gameState: GameState | null;
}

export function useRoomSystem() {
  const [state, setState] = useState<RoomSystemState>({
    currentRoom: null,
    currentPlayerId: null,
    isHost: false,
    activeRooms: [],
    loading: false,
    error: null,
    isConnected: false,
    gameState: null
  });

  // Monitor connection status
  useEffect(() => {
    const checkConnection = () => {
      setState(prev => ({ 
        ...prev, 
        isConnected: socketService.isSocketConnected() 
      }));
    };

    checkConnection();
    const interval = setInterval(checkConnection, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize game state when game starts
  const initializeGameState = useCallback((room: Room) => {
    const deck = shuffleDeck(createDeck());
    
    // Convert room players to game players (no AI players in multiplayer)
    const players: Player[] = room.players.map(roomPlayer => ({
      id: roomPlayer.id,
      name: roomPlayer.name,
      cards: [],
      isHuman: true, // All players in multiplayer are human
      hasCalledUno: false
    }));

    // Deal 7 cards to each player
    let cardIndex = 0;
    for (let i = 0; i < 7; i++) {
      players.forEach(player => {
        if (cardIndex < deck.length) {
          player.cards.push(deck[cardIndex++]);
        }
      });
    }

    // Find first non-action card for top card
    let topCardIndex = cardIndex;
    while (topCardIndex < deck.length && deck[topCardIndex].type !== 'number') {
      topCardIndex++;
    }

    const topCard = deck[topCardIndex] || deck[cardIndex];
    const remainingDeck = deck.filter((_, index) => index !== topCardIndex && index >= cardIndex);

    const gameState: GameState = {
      players,
      currentPlayerIndex: 0,
      direction: 'clockwise',
      topCard,
      drawPile: remainingDeck,
      discardPile: [topCard],
      gamePhase: 'playing',
      isBlockAllActive: false
    };

    setState(prev => ({ ...prev, gameState }));
    
    // Broadcast game state to all players
    socketService.broadcastGameState(gameState);
  }, []);

  // Load active rooms
  const loadActiveRooms = useCallback(async () => {
    if (!socketService.isSocketConnected()) {
      setState(prev => ({ ...prev, activeRooms: [] }));
      return;
    }

    try {
      const rooms = await socketService.getActiveRooms();
      setState(prev => ({ ...prev, activeRooms: rooms }));
    } catch (error) {
      console.error('Failed to load rooms:', error);
    }
  }, []);

  // Create room
  const createRoom = useCallback(async (data: CreateRoomData) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await socketService.createRoom(data);
      
      if (result.success && result.room && result.playerId) {
        setState(prev => ({
          ...prev,
          currentRoom: result.room!,
          currentPlayerId: result.playerId!,
          isHost: true,
          loading: false,
          gameState: null // Reset game state
        }));
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: result.error || 'Không thể tạo phòng'
        }));
      }

      return result;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Lỗi kết nối đến server'
      }));
      return { success: false, error: 'Lỗi kết nối đến server' };
    }
  }, []);

  // Join room
  const joinRoom = useCallback(async (data: JoinRoomData) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await socketService.joinRoom(data);
      
      if (result.success && result.room && result.playerId) {
        setState(prev => ({
          ...prev,
          currentRoom: result.room!,
          currentPlayerId: result.playerId!,
          isHost: false,
          loading: false,
          gameState: null // Reset game state
        }));
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: result.error || 'Không thể tham gia phòng'
        }));
      }
      
      return result;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Lỗi kết nối đến server'
      }));
      return { success: false, error: 'Lỗi kết nối đến server' };
    }
  }, []);

  // Leave room
  const leaveRoom = useCallback(() => {
    socketService.leaveRoom();
    setState(prev => ({
      ...prev,
      currentRoom: null,
      currentPlayerId: null,
      isHost: false,
      gameState: null
    }));
  }, []);

  // Kick player
  const kickPlayer = useCallback(async (targetPlayerId: string) => {
    if (state.isHost) {
      const result = await socketService.kickPlayer(targetPlayerId);
      return result.success;
    }
    return false;
  }, [state.isHost]);

  // Start game
  const startGame = useCallback(async () => {
    if (state.isHost && state.currentRoom) {
      const result = await socketService.startGame();
      if (result.success) {
        // Initialize game state for multiplayer
        initializeGameState(state.currentRoom);
        return true;
      } else if (result.error) {
        setState(prev => ({ ...prev, error: result.error! }));
      }
      return false;
    }
    return false;
  }, [state.isHost, state.currentRoom, initializeGameState]);

  // Toggle ready
  const toggleReady = useCallback(async () => {
    if (!state.isHost) {
      const result = await socketService.toggleReady();
      return result.success;
    }
    return false;
  }, [state.isHost]);

  // Game actions for multiplayer
  const playCard = useCallback((playerId: string, card: Card, chosenColor?: CardColor) => {
    if (!state.gameState || !state.currentPlayerId) return;
    
    // Broadcast card play to all players
    socketService.broadcastCardPlay(playerId, card, chosenColor);
    
    // Update local game state
    setState(prev => {
      if (!prev.gameState) return prev;
      
      const newGameState = { ...prev.gameState };
      const player = newGameState.players.find(p => p.id === playerId);
      const currentPlayer = newGameState.players[newGameState.currentPlayerIndex];
      
      if (!player || player.id !== currentPlayer.id) return prev;
      
      // Remove card from player's hand
      player.cards = player.cards.filter(c => c.id !== card.id);
      
      // Add to discard pile
      newGameState.discardPile.push(card);
      newGameState.topCard = card;
      
      // Handle wild color
      if (card.type === 'wild' || card.type === 'wild-draw-four') {
        newGameState.wildColor = chosenColor || 'red';
      } else {
        newGameState.wildColor = undefined;
      }
      
      // Check win condition
      if (player.cards.length === 0) {
        newGameState.gamePhase = 'finished';
        newGameState.winner = player;
      } else {
        // Move to next player (simplified)
        newGameState.currentPlayerIndex = (newGameState.currentPlayerIndex + 1) % newGameState.players.length;
      }
      
      return { ...prev, gameState: newGameState };
    });
  }, [state.gameState, state.currentPlayerId]);

  const drawCard = useCallback((playerId: string, count: number = 1) => {
    if (!state.gameState || !state.currentPlayerId) return [];
    
    // Broadcast draw action
    socketService.broadcastDrawCard(playerId, count);
    
    const drawnCards: Card[] = [];
    setState(prev => {
      if (!prev.gameState) return prev;
      
      const newGameState = { ...prev.gameState };
      const player = newGameState.players.find(p => p.id === playerId);
      
      if (!player) return prev;
      
      for (let i = 0; i < count; i++) {
        if (newGameState.drawPile.length > 0) {
          const card = newGameState.drawPile.pop()!;
          player.cards.push(card);
          drawnCards.push(card);
        }
      }
      
      return { ...prev, gameState: newGameState };
    });
    
    return drawnCards;
  }, [state.gameState, state.currentPlayerId]);

  const callUno = useCallback((playerId: string) => {
    if (!state.gameState) return;
    
    // Broadcast UNO call
    socketService.broadcastUnoCall(playerId);
    
    setState(prev => {
      if (!prev.gameState) return prev;
      
      const newGameState = { ...prev.gameState };
      const player = newGameState.players.find(p => p.id === playerId);
      
      if (player && player.cards.length === 1) {
        player.hasCalledUno = true;
      }
      
      return { ...prev, gameState: newGameState };
    });
  }, [state.gameState]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Set up event listeners
  useEffect(() => {
    // Global events
    const unsubscribeGlobal = socketService.addGlobalEventListener((event: any) => {
      switch (event.type) {
        case 'ROOMS_UPDATED':
          setState(prev => ({ ...prev, activeRooms: event.rooms }));
          break;
        case 'CONNECTION_FAILED':
          setState(prev => ({ 
            ...prev, 
            error: 'Mất kết nối đến server. Vui lòng thử lại.',
            isConnected: false
          }));
          break;
      }
    });

    // Room-specific events
    const unsubscribeRoom = socketService.addEventListener('current-room', (event: RoomEvent) => {
      setState(prev => {
        switch (event.type) {
          case 'PLAYER_JOINED':
            if (prev.currentRoom) {
              const updatedRoom = { ...prev.currentRoom };
              updatedRoom.players.push(event.player);
              updatedRoom.currentPlayers++;
              return { ...prev, currentRoom: updatedRoom };
            }
            return prev;

          case 'PLAYER_LEFT':
            if (prev.currentRoom) {
              const updatedRoom = { ...prev.currentRoom };
              updatedRoom.players = updatedRoom.players.filter(p => p.id !== event.playerId);
              updatedRoom.currentPlayers--;
              return { ...prev, currentRoom: updatedRoom };
            }
            return prev;

          case 'HOST_CHANGED':
            const newIsHost = prev.currentPlayerId === event.newHostId;
            if (prev.currentRoom) {
              const updatedRoom = { ...prev.currentRoom };
              updatedRoom.hostId = event.newHostId;
              updatedRoom.players.forEach(p => {
                p.isHost = p.id === event.newHostId;
              });
              return { ...prev, currentRoom: updatedRoom, isHost: newIsHost };
            }
            return { ...prev, isHost: newIsHost };

          case 'GAME_STARTED':
            if (prev.currentRoom) {
              const updatedRoom = { ...prev.currentRoom };
              updatedRoom.status = 'playing';
              updatedRoom.gameInProgress = true;
              return { ...prev, currentRoom: updatedRoom };
            }
            return prev;

          case 'KICKED_FROM_ROOM':
            return {
              ...prev,
              currentRoom: null,
              currentPlayerId: null,
              isHost: false,
              gameState: null,
              error: 'Bạn đã bị kick khỏi phòng'
            };

          default:
            return prev;
        }
      });
    });

    // Game events
    const unsubscribeGame = socketService.addGameEventListener((event: any) => {
      setState(prev => {
        switch (event.type) {
          case 'GAME_STATE_UPDATE':
            return { ...prev, gameState: event.gameState };
          case 'CARD_PLAYED':
            // Handle card play from other players
            return prev;
          case 'CARD_DRAWN':
            // Handle card draw from other players
            return prev;
          case 'UNO_CALLED':
            // Handle UNO call from other players
            return prev;
          default:
            return prev;
        }
      });
    });

    return () => {
      unsubscribeGlobal();
      unsubscribeRoom();
      unsubscribeGame();
    };
  }, []);

  // Auto-refresh active rooms
  useEffect(() => {
    loadActiveRooms();
    const interval = setInterval(loadActiveRooms, 5000);
    return () => clearInterval(interval);
  }, [loadActiveRooms]);

  return {
    ...state,
    createRoom,
    joinRoom,
    leaveRoom,
    kickPlayer,
    startGame,
    toggleReady,
    loadActiveRooms,
    clearError,
    playCard,
    drawCard,
    callUno
  };
}