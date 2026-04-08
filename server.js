const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);


app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

let activeOrders = [];

function broadcastOrders() {
  io.emit("ordersUpdated", activeOrders);
}

app.post("/add-order", (req, res) => {
  const { number } = req.body;

  if (!number || String(number).trim() === "") {
    return res.status(400).json({ error: "Geen geldig ordernummer." });
  }

  const now = Date.now();
 // Lengte van bestellingen
  const order = {
    id: now,
    number: String(number).trim(),
    createdAt: now,
    expiresAt: now + 1 * 60 * 1000
  };

  activeOrders.push(order);

  activeOrders.sort((a, b) => a.createdAt - b.createdAt);

  broadcastOrders();
 //Duratie 
  setTimeout(() => {
    activeOrders = activeOrders.filter((o) => o.id !== order.id);
    broadcastOrders();
  }, 4 * 60 * 1000);

  res.json({ success: true, order });
});

app.post("/remove-order", (req, res) => {
  const { id } = req.body;

  activeOrders = activeOrders.filter((order) => order.id !== id);
  broadcastOrders();

  res.json({ success: true });
});

io.on("connection", (socket) => {
  socket.emit("ordersUpdated", activeOrders);
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server draait op http://localhost:${PORT}`);
});