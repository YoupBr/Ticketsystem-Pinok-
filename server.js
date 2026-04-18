const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let activeOrders = [];

function sortOrders() {
  activeOrders.sort((a, b) => a.createdAt - b.createdAt);
}

function broadcastOrders() {
  sortOrders();
  io.emit('ordersUpdated', activeOrders);
}

app.post('/add-order', (req, res) => {
  const number = String(req.body?.number ?? '').trim();

  if (!/^\d{1,4}$/.test(number)) {
    return res.status(400).json({ error: 'Voer een geldig bestelnummer van 1 t/m 4 cijfers in.' });
  }

  const exists = activeOrders.some((order) => order.number === number);
  if (exists) {
    return res.status(409).json({ error: 'Dit nummer staat al op klaar.' });
  }

  const now = Date.now();
  const order = {
    id: now,
    number,
    createdAt: now,
    expiresAt: now + 5 * 60 * 1000,
  };

  activeOrders.push(order);
  broadcastOrders();

  setTimeout(() => {
    activeOrders = activeOrders.filter((o) => o.id !== order.id);
    broadcastOrders();
  }, 5 * 60 * 1000);

  return res.json({ success: true, order });
});

app.post('/remove-order', (req, res) => {
  const id = Number(req.body?.id);
  activeOrders = activeOrders.filter((order) => order.id !== id);
  broadcastOrders();
  return res.json({ success: true });
});

app.post('/clear-orders', (_req, res) => {
  activeOrders = [];
  broadcastOrders();
  return res.json({ success: true });
});

io.on('connection', (socket) => {
  socket.emit('ordersUpdated', activeOrders);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Pinoké lokaal systeem draait op:');
  console.log(`- Admin:   http://localhost:${PORT}/admin.html`);
  console.log(`- Display: http://localhost:${PORT}/display.html`);
});
