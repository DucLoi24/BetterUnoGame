import React from 'react';
import { Card as CardType, CardColor } from '../types/Card';
import { getCardSymbol } from '../utils/cardUtils';

interface CardProps {
  card: CardType;
  isPlayable?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

const Card: React.FC<CardProps> = ({ 
  card, 
  isPlayable = false, 
  isSelected = false, 
  onClick, 
  className = '',
  size = 'medium'
}) => {
  const getColorClasses = (color: CardColor): string => {
    const colorMap = {
      red: 'bg-gradient-to-br from-red-500 to-red-600 text-white',
      blue: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white',
      green: 'bg-gradient-to-br from-green-500 to-green-600 text-white',
      yellow: 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-black',
      wild: 'bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 text-white'
    };
    return colorMap[color];
  };

  const getSizeClasses = (): string => {
    const sizeMap = {
      small: 'w-12 h-16 text-xs',
      medium: 'w-16 h-24 text-sm',
      large: 'w-20 h-28 text-base'
    };
    return sizeMap[size];
  };

  const baseClasses = `
    ${getSizeClasses()}
    ${getColorClasses(card.color)}
    rounded-xl border-2 border-white/20
    shadow-lg
    flex flex-col items-center justify-center
    font-bold
    transition-all duration-200
    relative
    overflow-hidden
    ${className}
  `;

  const interactiveClasses = onClick ? `
    cursor-pointer
    hover:scale-105 hover:shadow-xl
    active:scale-95
    ${isPlayable ? 'ring-2 ring-white/50 hover:ring-white/80' : ''}
    ${isSelected ? 'ring-4 ring-yellow-400 scale-105' : ''}
  ` : '';

  const symbol = getCardSymbol(card);

  return (
    <div 
      className={`${baseClasses} ${interactiveClasses}`}
      onClick={onClick}
    >
      {/* Top-left corner */}
      <div className="absolute top-1 left-1 text-xs font-bold">
        {symbol}
      </div>
      
      {/* Center symbol */}
      <div className="flex-1 flex items-center justify-center">
        <span className={size === 'large' ? 'text-2xl' : size === 'medium' ? 'text-lg' : 'text-sm'}>
          {symbol}
        </span>
      </div>
      
      {/* Bottom-right corner (rotated) */}
      <div className="absolute bottom-1 right-1 text-xs font-bold transform rotate-180">
        {symbol}
      </div>
      
      {/* Decorative shine effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
    </div>
  );
};

export default Card;