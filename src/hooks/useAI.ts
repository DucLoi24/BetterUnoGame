import { useEffect } from 'react';
import { GameState, Card, CardColor } from '../types/Card';
import { canPlayCard } from '../utils/cardUtils';

interface AIActions {
  playCard: (playerId: string, card: Card, chosenColor?: CardColor) => void;
  drawCard: (playerId: string, count?: number) => Card[];
  callUno: (playerId: string) => void;
}

export function useAI(gameState: GameState, actions: AIActions) {
  useEffect(() => {
    // Only run AI logic for local single-player games
    if (gameState.gamePhase !== 'playing') return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    // Skip AI logic if current player is human or if all players are human (multiplayer)
    if (!currentPlayer || currentPlayer.isHuman) return;
    
    // Check if this is a multiplayer game (all players are human)
    const isMultiplayer = gameState.players.every(p => p.isHuman);
    if (isMultiplayer) return;

    // AI turn logic for single-player mode only
    const timer = setTimeout(() => {
      // Check if AI should call UNO
      if (currentPlayer.cards.length === 1 && !currentPlayer.hasCalledUno) {
        actions.callUno(currentPlayer.id);
      }

      // Find playable cards
      const playableCards = currentPlayer.cards.filter(card => 
        canPlayCard(card, gameState.topCard, gameState.wildColor) &&
        (!gameState.isBlockAllActive || card.type === 'number')
      );

      if (playableCards.length > 0) {
        // AI strategy: prioritize action cards, then high numbers
        const sortedCards = playableCards.sort((a, b) => {
          // Prioritize action cards
          const aIsAction = a.type !== 'number';
          const bIsAction = b.type !== 'number';
          
          if (aIsAction && !bIsAction) return -1;
          if (!aIsAction && bIsAction) return 1;
          
          // For number cards, prefer higher values
          if (a.type === 'number' && b.type === 'number') {
            return (b.value || 0) - (a.value || 0);
          }
          
          return 0;
        });

        const cardToPlay = sortedCards[0];
        let chosenColor: CardColor | undefined;

        // Choose color for wild cards
        if (cardToPlay.type === 'wild' || cardToPlay.type === 'wild-draw-four') {
          // Choose the color most represented in hand
          const colorCounts = { red: 0, blue: 0, green: 0, yellow: 0 };
          currentPlayer.cards.forEach(card => {
            if (card.color !== 'wild') {
              colorCounts[card.color]++;
            }
          });
          
          chosenColor = Object.entries(colorCounts).reduce((a, b) => 
            colorCounts[a[0] as CardColor] > colorCounts[b[0] as CardColor] ? a : b
          )[0] as CardColor;
        }

        actions.playCard(currentPlayer.id, cardToPlay, chosenColor);
      } else {
        // No playable cards, draw one
        const drawnCards = actions.drawCard(currentPlayer.id, 1);
        
        // Check if drawn card can be played immediately
        if (drawnCards.length > 0) {
          const drawnCard = drawnCards[0];
          if (canPlayCard(drawnCard, gameState.topCard, gameState.wildColor) &&
              (!gameState.isBlockAllActive || drawnCard.type === 'number')) {
            
            let chosenColor: CardColor | undefined;
            if (drawnCard.type === 'wild' || drawnCard.type === 'wild-draw-four') {
              chosenColor = 'red'; // Simple fallback
            }
            
            setTimeout(() => {
              actions.playCard(currentPlayer.id, drawnCard, chosenColor);
            }, 500);
          }
        }
      }
    }, 1000 + Math.random() * 1000); // Random delay 1-2 seconds

    return () => clearTimeout(timer);
  }, [gameState.currentPlayerIndex, gameState.gamePhase, gameState.topCard, gameState.wildColor, gameState.isBlockAllActive]);
}