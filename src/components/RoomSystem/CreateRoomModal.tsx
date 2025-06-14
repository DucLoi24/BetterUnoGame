import React, { useState } from 'react';
import { X, Users, Lock, Unlock } from 'lucide-react';
import { CreateRoomData } from '../../types/Room';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (data: CreateRoomData) => Promise<any>;
  loading: boolean;
}

const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onCreateRoom,
  loading
}) => {
  const [formData, setFormData] = useState({
    name: '',
    hostName: '',
    maxPlayers: 4,
    password: '',
    hasPassword: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Tên phòng không được để trống';
    }
    
    if (!formData.hostName.trim()) {
      newErrors.hostName = 'Tên người chơi không được để trống';
    }
    
    if (formData.hasPassword && !formData.password.trim()) {
      newErrors.password = 'Mật khẩu không được để trống';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const createData: CreateRoomData = {
      name: formData.name.trim(),
      hostName: formData.hostName.trim(),
      maxPlayers: formData.maxPlayers,
      password: formData.hasPassword ? formData.password.trim() : undefined
    };

    const result = await onCreateRoom(createData);
    if (result.success) {
      onClose();
      // Reset form
      setFormData({
        name: '',
        hostName: '',
        maxPlayers: 4,
        password: '',
        hasPassword: false
      });
      setErrors({});
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Tạo Phòng Mới</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Room Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tên Phòng *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Nhập tên phòng..."
              maxLength={50}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Host Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tên Của Bạn *
            </label>
            <input
              type="text"
              value={formData.hostName}
              onChange={(e) => handleInputChange('hostName', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.hostName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Nhập tên của bạn..."
              maxLength={20}
            />
            {errors.hostName && (
              <p className="text-red-500 text-sm mt-1">{errors.hostName}</p>
            )}
          </div>

          {/* Max Players */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Số Người Chơi Tối Đa
            </label>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              <select
                value={formData.maxPlayers}
                onChange={(e) => handleInputChange('maxPlayers', parseInt(e.target.value))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {[2, 3, 4, 5, 6, 7, 8].map(num => (
                  <option key={num} value={num}>{num} người</option>
                ))}
              </select>
            </div>
          </div>

          {/* Password Toggle */}
          <div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleInputChange('hasPassword', !formData.hasPassword)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  formData.hasPassword 
                    ? 'bg-blue-50 border-blue-200 text-blue-700' 
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              >
                {formData.hasPassword ? (
                  <Lock className="w-4 h-4" />
                ) : (
                  <Unlock className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {formData.hasPassword ? 'Có mật khẩu' : 'Không mật khẩu'}
                </span>
              </button>
            </div>
          </div>

          {/* Password Input */}
          {formData.hasPassword && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mật Khẩu *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Nhập mật khẩu..."
                maxLength={20}
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
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
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang tạo...' : 'Tạo Phòng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRoomModal;