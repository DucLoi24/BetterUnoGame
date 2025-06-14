import React from 'react';
import { GameState } from '../types/Card';
import { Trophy, Users, Zap } from 'lucide-react';

interface GameStatusProps {
  gameState: GameState;
  onUnoCall: () => void;
  onRestart: () => void;
}

const GameStatus: React.FC<GameStatusProps> = ({ gameState, onUnoCall, onRestart }) => {
  const humanPlayer = gameState.players.find(p => p.isHuman);
  const canCallUno = humanPlayer && humanPlayer.cards.length === 1 && !humanPlayer.hasCalledUno;

  if (gameState.gamePhase === 'finished') {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Trophy className="w-8 h-8 text-yellow-400" />
          <h2 className="text-2xl font-bold text-white">Game Over!</h2>
        </div>
        
        <p className="text-lg text-white/90 mb-6">
          🎉 <strong>{gameState.winner?.name}</strong> wins!
        </p>
        
        <button
          onClick={onRestart}
          className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:scale-105 shadow-lg"
        >
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
      <div className="flex items-center justify-between">
        {/* Game info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-white/70">
            <Users className="w-4 h-4" />
            <span className="text-sm">{gameState.players.length} players</span>
          </div>
          
          <div className="flex items-center gap-2 text-white/70">
            <Zap className="w-4 h-4" />
            <span className="text-sm">Cards left: {gameState.drawPile.length}</span>
          </div>
        </div>

        {/* UNO button */}
        {canCallUno && (
          <button
            onClick={onUnoCall}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold py-2 px-4 rounded-xl transition-all duration-200 hover:scale-105 shadow-lg animate-pulse"
          >
            Call UNO!
          </button>
        )}
        
        {humanPlayer?.hasCalledUno && humanPlayer.cards.length === 1 && (
          <div className="bg-yellow-500 text-black px-3 py-2 rounded-xl font-bold">
            UNO Called! ✨
          </div>
        )}
      </div>
    </div>
  );
};

export default GameStatus;