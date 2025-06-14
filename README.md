# UNO Online Game

Một game UNO trực tuyến được xây dựng với React, TypeScript, Node.js và Socket.IO.

## 🚀 Tính năng

- **Multiplayer Online**: Chơi với bạn bè trên các máy tính khác nhau qua internet
- **Real-time Communication**: Sử dụng WebSocket để đồng bộ game real-time
- **Room System**: Tạo và tham gia phòng với mật khẩu tùy chọn
- **Enhanced UNO Cards**: Bao gồm các lá bài mới như SwapHands, DrawMinusTwo, ShuffleMyHand, BlockAll
- **Responsive Design**: Giao diện đẹp, tương thích mọi thiết bị
- **AI Players**: Chơi với AI khi không đủ người

## 🛠️ Công nghệ sử dụng

### Frontend
- React 18 + TypeScript
- Tailwind CSS
- Socket.IO Client
- Lucide React (icons)
- Vite

### Backend
- Node.js + Express
- Socket.IO Server
- CORS support
- UUID for unique IDs

## 📦 Cài đặt

### 1. Clone repository
```bash
git clone https://github.com/DucLoi24/BetterUnoGame.git
cd uno-online-game
```

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Tạo file environment
```bash
cp .env.example .env
```

### 4. Chạy ứng dụng

#### Chạy cả frontend và backend cùng lúc:
```bash
npm run dev:full
```

#### Hoặc chạy riêng biệt:

**Backend (Server):**
```bash
npm run server
```

**Frontend (Client):**
```bash
npm run dev
```

## 🌐 Truy cập

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

## 🎮 Cách chơi

### 1. Tạo phòng
- Nhấn "Tạo Phòng Mới"
- Đặt tên phòng và tên người chơi
- Chọn số người chơi tối đa (2-8)
- Tùy chọn đặt mật khẩu

### 2. Tham gia phòng
- Nhấn "Tham Gia Phòng"
- Chọn phòng từ danh sách hoặc nhập ID phòng
- Nhập tên và mật khẩu (nếu có)

### 3. Bắt đầu game
- Chủ phòng đợi tất cả người chơi sẵn sàng
- Nhấn "Bắt Đầu Game" để khởi động

### 4. Luật chơi UNO
- Ghép bài theo màu, số hoặc ký hiệu
- Sử dụng lá bài hành động một cách chiến thuật
- Gọi "UNO" khi còn 1 lá bài
- Người đầu tiên hết bài thắng cuộc

## 🃏 Các lá bài đặc biệt

### Lá bài cơ bản
- **Skip**: Bỏ qua lượt người tiếp theo
- **Reverse**: Đảo chiều chơi
- **Draw 2**: Người tiếp theo rút 2 lá
- **Wild**: Đổi màu
- **Wild Draw 4**: Đổi màu + người tiếp theo rút 4 lá

### Lá bài mới
- **Swap Hands**: Đổi bài với người chơi khác
- **Draw Minus 2**: Người tiếp theo bỏ 2 lá hoặc rút 2 lá
- **Shuffle My Hand**: Bỏ tất cả bài và rút lại
- **Block All**: Chỉ cho phép đánh lá số trong lượt tiếp theo

## 🔧 Cấu hình

### Environment Variables
```env
VITE_SERVER_URL=http://localhost:3001
PORT=3001
```

### CORS Configuration
Server được cấu hình để chấp nhận kết nối từ:
- http://localhost:5173 (Vite dev server)
- http://localhost:3000 (Alternative port)

## 🚀 Deploy

### Frontend
```bash
npm run build
```

### Backend
```bash
npm run server
```

### Docker (Optional)
Có thể tạo Dockerfile để deploy dễ dàng hơn.

## 🐛 Troubleshooting

### Lỗi kết nối
- Kiểm tra server đang chạy trên port 3001
- Kiểm tra CORS configuration
- Kiểm tra firewall settings

### Lỗi WebSocket
- Đảm bảo browser hỗ trợ WebSocket
- Kiểm tra proxy/firewall không block WebSocket

### Lỗi room không đồng bộ
- Server sẽ tự động cleanup rooms cũ sau 30 phút
- Refresh trang để kết nối lại

## 📝 API Endpoints

### REST API
- `GET /api/rooms` - Lấy danh sách phòng
- `GET /api/health` - Health check

### WebSocket Events
- `create-room` - Tạo phòng mới
- `join-room` - Tham gia phòng
- `leave-room` - Rời phòng
- `start-game` - Bắt đầu game
- `toggle-ready` - Thay đổi trạng thái sẵn sàng

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

MIT License - xem file LICENSE để biết thêm chi tiết.
