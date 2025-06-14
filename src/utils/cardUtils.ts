import { Card, CardColor, CardType } from '../types/Card';

// Create a complete UNO deck
export function createDeck(): Card[] {
  const cards: Card[] = [];
  const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];
  
  // Number cards (0-9)
  colors.forEach(color => {
    // One 0 per color
    cards.push({
      id: `${color}-0-${Math.random()}`,
      type: 'number',
      color,
      value: 0
    });
    
    // Two of each number 1-9 per color
    for (let num = 1; num <= 9; num++) {
      for (let i = 0; i < 2; i++) {
        cards.push({
          id: `${color}-${num}-${i}-${Math.random()}`,
          type: 'number',
          color,
          value: num
        });
      }
    }
  });
  
  // Standard action cards (2 per color)
  const actionTypes: CardType[] = ['skip', 'reverse', 'draw-two'];
  colors.forEach(color => {
    actionTypes.forEach(type => {
      for (let i = 0; i < 2; i++) {
        cards.push({
          id: `${color}-${type}-${i}-${Math.random()}`,
          type,
          color
        });
      }
    });
  });
  
  // Custom action cards (2 per color)
  const customActionTypes: CardType[] = ['swap-hands', 'draw-minus-two', 'shuffle-my-hand', 'block-all'];
  colors.forEach(color => {
    customActionTypes.forEach(type => {
      for (let i = 0; i < 2; i++) {
        cards.push({
          id: `${color}-${type}-${i}-${Math.random()}`,
          type,
          color
        });
      }
    });
  });
  
  // Wild cards (4 each)
  for (let i = 0; i < 4; i++) {
    cards.push({
      id: `wild-${i}-${Math.random()}`,
      type: 'wild',
      color: 'wild'
    });
    
    cards.push({
      id: `wild-draw-four-${i}-${Math.random()}`,
      type: 'wild-draw-four',
      color: 'wild'
    });
  }
  
  return cards;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function canPlayCard(card: Card, topCard: Card, wildColor?: CardColor): boolean {
  // Wild cards can always be played
  if (card.type === 'wild' || card.type === 'wild-draw-four') {
    return true;
  }
  
  // If there's a wild color set, match that
  if (wildColor && wildColor !== 'wild') {
    return card.color === wildColor;
  }
  
  // Match color
  if (card.color === topCard.color) {
    return true;
  }
  
  // Match number
  if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) {
    return true;
  }
  
  // Match action type
  if (card.type === topCard.type) {
    return true;
  }
  
  return false;
}

export function getCardDisplayName(card: Card): string {
  if (card.type === 'number') {
    return card.value?.toString() || '0';
  }
  
  const typeNames: Record<CardType, string> = {
    'number': '',
    'skip': 'Skip',
    'reverse': 'Reverse',
    'draw-two': 'Draw 2',
    'wild': 'Wild',
    'wild-draw-four': 'Wild +4',
    'swap-hands': 'Swap',
    'draw-minus-two': 'Draw -2',
    'shuffle-my-hand': 'Shuffle',
    'block-all': 'Block'
  };
  
  return typeNames[card.type];
}

export function getCardSymbol(card: Card): string {
  const symbols: Record<CardType, string> = {
    'number': card.value?.toString() || '0',
    'skip': '⊘',
    'reverse': '↻',
    'draw-two': '+2',
    'wild': '★',
    'wild-draw-four': '+4',
    'swap-hands': '⇄',
    'draw-minus-two': '-2',
    'shuffle-my-hand': '🔄',
    'block-all': '🛡️'
  };
  
  return symbols[card.type];
}