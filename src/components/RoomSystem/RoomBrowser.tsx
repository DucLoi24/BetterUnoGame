import React, { useState } from 'react';
import { Plus, Users, Search, RefreshCw, Wifi, WifiOff, Server } from 'lucide-react';
import { Room } from '../../types/Room';
import CreateRoomModal from './CreateRoomModal';
import JoinRoomModal from './JoinRoomModal';

interface RoomBrowserProps {
  activeRooms: Omit<Room, 'password'>[];
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  onCreateRoom: (data: any) => Promise<any>;
  onJoinRoom: (data: any) => Promise<any>;
  onRefresh: () => void;
  onClearError: () => void;
}

const RoomBrowser: React.FC<RoomBrowserProps> = ({
  activeRooms,
  loading,
  error,
  isConnected,
  onCreateRoom,
  onJoinRoom,
  onRefresh,
  onClearError
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Vừa tạo';
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return `${Math.floor(diffHours / 24)} ngày trước`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      {/* Background pattern */}
      <div className="fixed inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width=%2260%22%20height=%2260%22%20viewBox=%220%200%2060%2060%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg%20fill=%22none%22%20fill-rule=%22evenodd%22%3E%3Cg%20fill=%22%23ffffff%22%20fill-opacity=%220.1%22%3E%3Ccircle%20cx=%2230%22%20cy=%2230%22%20r=%224%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] bg-repeat" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight">
              UNO Online
            </h1>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm border ${
              isConnected 
                ? 'bg-green-500/20 text-green-200 border-green-500/30' 
                : 'bg-red-500/20 text-red-200 border-red-500/30'
            }`}>
              {isConnected ? <Server className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              {isConnected ? 'Kết nối server' : 'Mất kết nối'}
            </div>
          </div>
          
          <p className="text-white/70 text-lg mb-6">
            Chơi UNO trực tuyến với bạn bè trên toàn thế giới
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={!isConnected}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Plus className="w-5 h-5" />
              Tạo Phòng Mới
            </button>
            
            <button
              onClick={() => setShowJoinModal(true)}
              disabled={!isConnected}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Search className="w-5 h-5" />
              Tham Gia Phòng
            </button>
          </div>
        </div>

        {/* Connection Status Warning */}
        {!isConnected && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 text-center">
            <div className="flex items-center justify-center gap-2 text-red-200 mb-2">
              <WifiOff className="w-5 h-5" />
              <span className="font-medium">Mất kết nối server</span>
            </div>
            <p className="text-red-300 text-sm">
              Đang thử kết nối lại... Vui lòng kiểm tra kết nối internet
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 text-center">
            <p className="text-red-200">{error}</p>
            <button
              onClick={onClearError}
              className="mt-2 text-red-300 hover:text-red-100 underline text-sm"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Active Rooms */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-white" />
              <h2 className="text-xl font-bold text-white">Phòng Đang Hoạt Động</h2>
              <span className="bg-blue-500/20 text-blue-200 px-3 py-1 rounded-full text-sm border border-blue-500/30">
                {activeRooms.length} phòng
              </span>
            </div>
            
            <button
              onClick={onRefresh}
              disabled={loading || !isConnected}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>

          {activeRooms.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-white/30" />
              <h3 className="text-lg font-medium text-white/70 mb-2">
                {isConnected ? 'Chưa có phòng nào đang hoạt động' : 'Không thể tải danh sách phòng'}
              </h3>
              <p className="text-white/50 mb-6">
                {isConnected 
                  ? 'Hãy tạo phòng mới để bắt đầu chơi với bạn bè'
                  : 'Vui lòng kiểm tra kết nối server'
                }
              </p>
              {isConnected && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 shadow-lg"
                >
                  Tạo Phòng Đầu Tiên
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeRooms.map(room => (
                <div
                  key={room.id}
                  className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-200 hover:scale-105 cursor-pointer group"
                  onClick={() => setShowJoinModal(true)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-white truncate group-hover:text-blue-200 transition-colors">
                      {room.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      {room.hasPassword && (
                        <div className="w-2 h-2 bg-amber-400 rounded-full" title="Có mật khẩu" />
                      )}
                      <div className={`w-2 h-2 rounded-full ${
                        room.currentPlayers < room.maxPlayers ? 'bg-green-400' : 'bg-red-400'
                      }`} />
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-white/70">
                    <div className="flex items-center justify-between">
                      <span>Người chơi:</span>
                      <span className="text-white font-medium">
                        {room.currentPlayers}/{room.maxPlayers}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Chủ phòng:</span>
                      <span className="text-white truncate ml-2">{room.hostName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>ID:</span>
                      <span className="text-white font-mono text-xs bg-white/10 px-2 py-1 rounded">
                        {room.id}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/50">
                        {formatTimeAgo(room.createdAt)}
                      </span>
                      <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded">
                        {room.currentPlayers < room.maxPlayers ? 'Có thể tham gia' : 'Đã đầy'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <h3 className="text-white font-semibold mb-2">Hướng dẫn:</h3>
          <ul className="text-white/70 text-sm space-y-1">
            <li>• <strong>Kết nối server:</strong> Game sử dụng WebSocket để kết nối real-time</li>
            <li>• <strong>Tạo phòng mới:</strong> Đặt tên phòng, chọn số người chơi và tùy chọn mật khẩu</li>
            <li>• <strong>Tham gia phòng:</strong> Duyệt danh sách phòng hoặc nhập trực tiếp ID phòng</li>
            <li>• <strong>Chia sẻ phòng:</strong> Gửi ID phòng cho bạn bè để họ tham gia từ máy tính khác</li>
            <li>• <strong>Chơi online:</strong> Các máy tính khác nhau có thể chơi chung qua internet</li>
          </ul>
        </div>
      </div>

      {/* Modals */}
      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateRoom={onCreateRoom}
        loading={loading}
      />

      <JoinRoomModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoinRoom={onJoinRoom}
        activeRooms={activeRooms}
        loading={loading}
      />
    </div>
  );
};

export default RoomBrowser;