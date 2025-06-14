import { useState, useCallback } from 'react';
import { GameState, Player, Card, CardColor } from '../types/Card';
import { createDeck, shuffleDeck, canPlayCard } from '../utils/cardUtils';

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(() => initializeGame());

  function initializeGame(): GameState {
    const deck = shuffleDeck(createDeck());
    const players: Player[] = [
      { id: 'human', name: 'You', cards: [], isHuman: true, hasCalledUno: false },
      { id: 'ai1', name: 'Player 2', cards: [], isHuman: false, hasCalledUno: false },
      { id: 'ai2', name: 'Player 3', cards: [], isHuman: false, hasCalledUno: false },
      { id: 'ai3', name: 'Player 4', cards: [], isHuman: false, hasCalledUno: false }
    ];

    // Deal 7 cards to each player
    let cardIndex = 0;
    for (let i = 0; i < 7; i++) {
      players.forEach(player => {
        player.cards.push(deck[cardIndex++]);
      });
    }

    // Find first non-action card for top card
    let topCardIndex = cardIndex;
    while (deck[topCardIndex].type !== 'number') {
      topCardIndex++;
    }

    const topCard = deck[topCardIndex];
    const remainingDeck = deck.filter((_, index) => index !== topCardIndex && index >= cardIndex);

    return {
      players,
      currentPlayerIndex: 0,
      direction: 'clockwise',
      topCard,
      drawPile: remainingDeck,
      discardPile: [topCard],
      gamePhase: 'playing',
      isBlockAllActive: false
    };
  }

  const drawCard = useCallback((playerId: string, count: number = 1): Card[] => {
    const drawnCards: Card[] = [];
    
    setGameState(prev => {
      const newState = { ...prev };
      const player = newState.players.find(p => p.id === playerId);
      
      if (!player) return prev;

      for (let i = 0; i < count; i++) {
        if (newState.drawPile.length === 0) {
          // Reshuffle discard pile into draw pile
          const newDrawPile = shuffleDeck(newState.discardPile.slice(0, -1));
          newState.drawPile = newDrawPile;
          newState.discardPile = [newState.topCard];
        }

        if (newState.drawPile.length > 0) {
          const card = newState.drawPile.pop()!;
          player.cards.push(card);
          drawnCards.push(card);

          // Check 50 card limit
          if (player.cards.length > 50) {
            // Remove player from game
            newState.players = newState.players.filter(p => p.id !== playerId);
            if (newState.currentPlayerIndex >= newState.players.length) {
              newState.currentPlayerIndex = 0;
            }
          }
        }
      }

      return newState;
    });

    return drawnCards;
  }, []);

  const playCard = useCallback((playerId: string, card: Card, chosenColor?: CardColor) => {
    setGameState(prev => {
      const newState = { ...prev };
      const player = newState.players.find(p => p.id === playerId);
      const currentPlayer = newState.players[newState.currentPlayerIndex];
      
      if (!player || player.id !== currentPlayer.id) return prev;

      // Check if card can be played
      if (!canPlayCard(card, newState.topCard, newState.wildColor)) {
        return prev;
      }

      // Check BlockAll restriction
      if (newState.isBlockAllActive && card.type !== 'number') {
        return prev;
      }

      // Remove card from player's hand
      player.cards = player.cards.filter(c => c.id !== card.id);
      
      // Add to discard pile
      newState.discardPile.push(card);
      newState.topCard = card;
      
      // Clear wild color unless new card is wild
      if (card.type === 'wild' || card.type === 'wild-draw-four') {
        newState.wildColor = chosenColor || 'red';
      } else {
        newState.wildColor = undefined;
      }

      // Reset BlockAll effect
      newState.isBlockAllActive = false;
      
      // Check for UNO (player has 1 card left)
      if (player.cards.length === 1 && !player.hasCalledUno) {
        // Auto-call UNO for AI players
        if (!player.isHuman) {
          player.hasCalledUno = true;
        }
      }

      // Check win condition
      if (player.cards.length === 0) {
        newState.gamePhase = 'finished';
        newState.winner = player;
        return newState;
      }

      // Apply card effects and determine next player
      let nextPlayerIndex = getNextPlayerIndex(newState.currentPlayerIndex, newState.players.length, newState.direction);
      
      switch (card.type) {
        case 'skip':
          // Skip next player
          nextPlayerIndex = getNextPlayerIndex(nextPlayerIndex, newState.players.length, newState.direction);
          break;
          
        case 'reverse':
          newState.direction = newState.direction === 'clockwise' ? 'counterclockwise' : 'clockwise';
          if (newState.players.length === 2) {
            // In 2-player game, reverse acts like skip
            nextPlayerIndex = getNextPlayerIndex(nextPlayerIndex, newState.players.length, newState.direction);
          }
          break;
          
        case 'draw-two':
          drawCardsForPlayer(newState, nextPlayerIndex, 2);
          nextPlayerIndex = getNextPlayerIndex(nextPlayerIndex, newState.players.length, newState.direction);
          break;
          
        case 'wild-draw-four':
          drawCardsForPlayer(newState, nextPlayerIndex, 4);
          nextPlayerIndex = getNextPlayerIndex(nextPlayerIndex, newState.players.length, newState.direction);
          break;
          
        case 'swap-hands':
          // For AI, swap with a random player (excluding self)
          const otherPlayers = newState.players.filter(p => p.id !== player.id);
          if (otherPlayers.length > 0) {
            const targetPlayer = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
            const tempCards = player.cards;
            player.cards = targetPlayer.cards;
            targetPlayer.cards = tempCards;
          }
          break;
          
        case 'draw-minus-two':
          const nextPlayer = newState.players[nextPlayerIndex];
          if (nextPlayer.cards.length >= 2) {
            // Discard 2 random cards
            for (let i = 0; i < 2; i++) {
              const randomIndex = Math.floor(Math.random() * nextPlayer.cards.length);
              const discardedCard = nextPlayer.cards.splice(randomIndex, 1)[0];
              newState.discardPile.push(discardedCard);
            }
          } else {
            // Draw 2 cards instead
            drawCardsForPlayer(newState, nextPlayerIndex, 2);
          }
          break;
          
        case 'shuffle-my-hand':
          // Discard all cards and redraw same amount
          const cardCount = player.cards.length;
          newState.discardPile.push(...player.cards);
          player.cards = [];
          drawCardsForPlayer(newState, newState.currentPlayerIndex, cardCount);
          break;
          
        case 'block-all':
          newState.isBlockAllActive = true;
          break;
      }

      newState.currentPlayerIndex = nextPlayerIndex;
      return newState;
    });
  }, []);

  const callUno = useCallback((playerId: string) => {
    setGameState(prev => {
      const newState = { ...prev };
      const player = newState.players.find(p => p.id === playerId);
      
      if (player && player.cards.length === 1) {
        player.hasCalledUno = true;
      }
      
      return newState;
    });
  }, []);

  const resetGame = useCallback(() => {
    setGameState(initializeGame());
  }, []);

  return {
    gameState,
    drawCard,
    playCard,
    callUno,
    resetGame
  };
}

function getNextPlayerIndex(currentIndex: number, totalPlayers: number, direction: 'clockwise' | 'counterclockwise'): number {
  if (direction === 'clockwise') {
    return (currentIndex + 1) % totalPlayers;
  } else {
    return currentIndex === 0 ? totalPlayers - 1 : currentIndex - 1;
  }
}

function drawCardsForPlayer(gameState: GameState, playerIndex: number, count: number) {
  const player = gameState.players[playerIndex];
  
  for (let i = 0; i < count; i++) {
    if (gameState.drawPile.length === 0) {
      // Reshuffle discard pile into draw pile
      const newDrawPile = shuffleDeck(gameState.discardPile.slice(0, -1));
      gameState.drawPile = newDrawPile;
      gameState.discardPile = [gameState.topCard];
    }

    if (gameState.drawPile.length > 0) {
      const card = gameState.drawPile.pop()!;
      player.cards.push(card);

      // Check 50 card limit
      if (player.cards.length > 50) {
        gameState.players = gameState.players.filter(p => p.id !== player.id);
        if (gameState.currentPlayerIndex >= gameState.players.length) {
          gameState.currentPlayerIndex = 0;
        }
        break;
      }
    }
  }
}