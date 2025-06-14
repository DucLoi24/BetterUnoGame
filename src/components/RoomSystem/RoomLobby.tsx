import React from 'react';
import { 
  Users, 
  Crown, 
  UserX, 
  Play, 
  LogOut, 
  Copy, 
  Check,
  Shield,
  Clock
} from 'lucide-react';
import { Room, RoomPlayer } from '../../types/Room';

interface RoomLobbyProps {
  room: Room;
  currentPlayerId: string;
  isHost: boolean;
  onLeaveRoom: () => void;
  onKickPlayer: (playerId: string) => void;
  onStartGame: () => void;
  onToggleReady: () => void;
}

const RoomLobby: React.FC<RoomLobbyProps> = ({
  room,
  currentPlayerId,
  isHost,
  onLeaveRoom,
  onKickPlayer,
  onStartGame,
  onToggleReady
}) => {
  const [copied, setCopied] = React.useState(false);
  const currentPlayer = room.players.find(p => p.id === currentPlayerId);
  const canStartGame = room.players.length >= 2 && 
    room.players.filter(p => !p.isHost).every(p => p.isReady);

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(room.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = room.id;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatJoinTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">{room.name}</h1>
              <div className="flex items-center gap-4 text-white/70">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{room.currentPlayers}/{room.maxPlayers} người chơi</span>
                </div>
                {room.hasPassword && (
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span>Có mật khẩu</span>
                  </div>
                )}
              </div>
            </div>
            
            <button
              onClick={onLeaveRoom}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition-colors border border-red-500/30"
            >
              <LogOut className="w-4 h-4" />
              Rời Phòng
            </button>
          </div>

          {/* Room ID */}
          <div className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
            <div className="flex-1">
              <div className="text-white/70 text-sm mb-1">ID Phòng (chia sẻ với bạn bè)</div>
              <div className="text-white font-mono text-lg">{room.id}</div>
            </div>
            <button
              onClick={copyRoomId}
              className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 rounded-lg transition-colors border border-blue-500/30"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Đã sao chép
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Sao chép
                </>
              )}
            </button>
          </div>
        </div>

        {/* Players List */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Danh Sách Người Chơi</h2>
          
          <div className="grid gap-3">
            {room.players.map(player => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                  player.id === currentPlayerId
                    ? 'bg-blue-500/20 border-blue-500/50'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    {player.isHost && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                        <Crown className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{player.name}</span>
                      {player.id === currentPlayerId && (
                        <span className="text-blue-300 text-sm">(Bạn)</span>
                      )}
                      {player.isHost && (
                        <span className="bg-yellow-500/20 text-yellow-200 text-xs px-2 py-1 rounded-full border border-yellow-500/30">
                          Chủ phòng
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-white/60 text-sm">
                      <Clock className="w-3 h-3" />
                      <span>Tham gia lúc {formatJoinTime(player.joinedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Ready Status */}
                  {!player.isHost && (
                    <div className={`px-3 py-1 rounded-full text-sm font-medium border ${
                      player.isReady
                        ? 'bg-green-500/20 text-green-200 border-green-500/30'
                        : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                    }`}>
                      {player.isReady ? 'Sẵn sàng' : 'Chưa sẵn sàng'}
                    </div>
                  )}

                  {/* Kick Button (Host only) */}
                  {isHost && !player.isHost && (
                    <button
                      onClick={() => onKickPlayer(player.id)}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition-colors border border-red-500/30"
                      title="Kick người chơi"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Empty Slots */}
            {Array.from({ length: room.maxPlayers - room.currentPlayers }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className="flex items-center justify-center p-4 rounded-lg border border-dashed border-white/20 text-white/40"
              >
                <Users className="w-5 h-5 mr-2" />
                <span>Đang chờ người chơi...</span>
              </div>
            ))}
          </div>
        </div>

        {/* Game Controls */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div className="text-white">
              {isHost ? (
                <div>
                  <div className="font-medium mb-1">Bạn là chủ phòng</div>
                  <div className="text-white/70 text-sm">
                    {canStartGame 
                      ? 'Tất cả người chơi đã sẵn sàng. Có thể bắt đầu game!'
                      : 'Đang chờ người chơi sẵn sàng...'
                    }
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-medium mb-1">
                    {currentPlayer?.isReady ? 'Bạn đã sẵn sàng' : 'Bạn chưa sẵn sàng'}
                  </div>
                  <div className="text-white/70 text-sm">
                    Nhấn nút để thay đổi trạng thái sẵn sàng
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {isHost ? (
                <button
                  onClick={onStartGame}
                  disabled={!canStartGame}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  <Play className="w-5 h-5" />
                  Bắt Đầu Game
                </button>
              ) : (
                <button
                  onClick={onToggleReady}
                  className={`flex items-center gap-2 px-6 py-3 font-semibold rounded-lg transition-all shadow-lg ${
                    currentPlayer?.isReady
                      ? 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white'
                      : 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white'
                  }`}
                >
                  <Check className="w-5 h-5" />
                  {currentPlayer?.isReady ? 'Hủy Sẵn Sàng' : 'Sẵn Sàng'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomLobby;