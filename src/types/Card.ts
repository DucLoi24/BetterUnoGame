export type CardColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';

export type CardType = 
  // Number cards
  | 'number'
  // Standard action cards
  | 'skip' 
  | 'reverse' 
  | 'draw-two'
  | 'wild'
  | 'wild-draw-four'
  // Custom action cards
  | 'swap-hands'
  | 'draw-minus-two'
  | 'shuffle-my-hand'
  | 'block-all';

export interface Card {
  id: string;
  type: CardType;
  color: CardColor;
  value?: number; // For number cards (0-9)
}

export interface Player {
  id: string;
  name: string;
  cards: Card[];
  isHuman: boolean;
  hasCalledUno: boolean;
}

export type GameDirection = 'clockwise' | 'counterclockwise';

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  direction: GameDirection;
  topCard: Card;
  drawPile: Card[];
  discardPile: Card[];
  wildColor?: CardColor; // Current color after wild card
  gamePhase: 'waiting' | 'playing' | 'finished';
  winner?: Player;
  isBlockAllActive: boolean; // For BlockAll card effect
}