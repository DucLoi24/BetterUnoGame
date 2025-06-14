import React, { useState } from 'react';
import { X, Search, Lock, Users, Clock } from 'lucide-react';
import { Room, JoinRoomData } from '../../types/Room';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinRoom: (data: JoinRoomData) => Promise<any>;
  activeRooms: Omit<Room, 'password'>[];
  loading: boolean;
}

const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  isOpen,
  onClose,
  onJoinRoom,
  activeRooms,
  loading
}) => {
  const [mode, setMode] = useState<'browse' | 'direct'>('browse');
  const [formData, setFormData] = useState({
    roomId: '',
    playerName: '',
    password: ''
  });
  const [selectedRoom, setSelectedRoom] = useState<Omit<Room, 'password'> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.playerName.trim()) {
      newErrors.playerName = 'Tên người chơi không được để trống';
    }
    
    if (mode === 'direct' && !formData.roomId.trim()) {
      newErrors.roomId = 'ID phòng không được để trống';
    }
    
    if (mode === 'browse' && !selectedRoom) {
      newErrors.room = 'Vui lòng chọn một phòng';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const joinData: JoinRoomData = {
      roomId: mode === 'direct' ? formData.roomId.trim() : selectedRoom!.id,
      playerName: formData.playerName.trim(),
      password: formData.password.trim() || undefined
    };

    const result = await onJoinRoom(joinData);
    if (result.success) {
      onClose();
      // Reset form
      setFormData({ roomId: '', playerName: '', password: '' });
      setSelectedRoom(null);
      setErrors({});
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleRoomSelect = (room: Omit<Room, 'password'>) => {
    setSelectedRoom(room);
    if (errors.room) {
      setErrors(prev => ({ ...prev, room: '' }));
    }
  };

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Tham Gia Phòng</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setMode('browse')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === 'browse'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Duyệt Phòng
            </button>
            <button
              onClick={() => setMode('direct')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === 'direct'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Nhập ID Phòng
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Browse Mode */}
            {mode === 'browse' && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Search className="w-5 h-5 text-gray-400" />
                  <h3 className="font-medium text-gray-800">Phòng Đang Hoạt Động</h3>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {activeRooms.length}
                  </span>
                </div>

                {activeRooms.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Không có phòng nào đang hoạt động</p>
                    <p className="text-sm">Hãy tạo phòng mới hoặc thử lại sau</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {activeRooms.map(room => (
                      <div
                        key={room.id}
                        onClick={() => handleRoomSelect(room)}
                        className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                          selectedRoom?.id === room.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-gray-800">{room.name}</h4>
                              {room.hasPassword && (
                                <Lock className="w-4 h-4 text-amber-500" />
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                <span>{room.currentPlayers}/{room.maxPlayers}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>{formatTimeAgo(room.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-400 mb-1">ID: {room.id}</div>
                            <div className="text-xs text-gray-500">Host: {room.hostName}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {errors.room && (
                  <p className="text-red-500 text-sm mt-2">{errors.room}</p>
                )}
              </div>
            )}

            {/* Direct Mode */}
            {mode === 'direct' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID Phòng *
                </label>
                <input
                  type="text"
                  value={formData.roomId}
                  onChange={(e) => handleInputChange('roomId', e.target.value.toUpperCase())}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.roomId ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Nhập ID phòng (VD: ABC123)..."
                  maxLength={10}
                />
                {errors.roomId && (
                  <p className="text-red-500 text-sm mt-1">{errors.roomId}</p>
                )}
              </div>
            )}

            {/* Player Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên Của Bạn *
              </label>
              <input
                type="text"
                value={formData.playerName}
                onChange={(e) => handleInputChange('playerName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.playerName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Nhập tên của bạn..."
                maxLength={20}
              />
              {errors.playerName && (
                <p className="text-red-500 text-sm mt-1">{errors.playerName}</p>
              )}
            </div>

            {/* Password (if needed) */}
            {((mode === 'browse' && selectedRoom?.hasPassword) || mode === 'direct') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mật Khẩu {mode === 'browse' && selectedRoom?.hasPassword ? '*' : '(nếu có)'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nhập mật khẩu..."
                  maxLength={20}
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="p-6 border-t border-gray-200">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg hover:from-green-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Đang tham gia...' : 'Tham Gia'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinRoomModal;