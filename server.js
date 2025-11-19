const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const qrcode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Phục vụ file tĩnh từ thư mục public
app.use(express.static('public'));

// Lưu trữ sessions (key: sessionId, value: {socketId, passwordVerified})
const sessions = {};
const correctPassword = 'password123'; // Mật khẩu mặc định (thay đổi trong production, hash bằng bcrypt)

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Máy tính tham gia session
  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
    sessions[sessionId] = { socketId: socket.id, passwordVerified: false };
    console.log(`Computer joined session: ${sessionId}`);
  });

  // Điện thoại gửi mật khẩu
  socket.on('submit-password', (data) => {
    const { sessionId, password } = data;
    if (sessions[sessionId] && password === correctPassword) {
      sessions[sessionId].passwordVerified = true;
      io.to(sessionId).emit('play-video'); // Gửi lệnh đến máy tính
      console.log(`Password correct for session: ${sessionId}`);
    } else {
      socket.emit('password-incorrect'); // Gửi lỗi về điện thoại
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Dọn dẹp sessions nếu cần (tùy chọn nâng cao)
  });
});

// Endpoint tạo QR code
app.get('/qr/:sessionId', async (req, res) => {
  const sessionId = req.params.sessionId;
  if (!sessionId) return res.status(400).send('Invalid session ID');
  
  const url = `http://localhost:3000/mobile.html?session=${sessionId}`; // URL cho điện thoại (thay localhost bằng domain thật nếu deploy)
  try {
    const qrCodeDataURL = await qrcode.toDataURL(url, { width: 400, height: 400 }); // QR to hơn
    res.json({ qrCode: qrCodeDataURL });
  } catch (err) {
    console.error('Error generating QR:', err);
    res.status(500).send('Error generating QR code');
  }
});

// Xử lý lỗi 404
app.use((req, res) => {
  res.status(404).send('Page not found');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});