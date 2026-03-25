const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let rooms = {};

io.on("connection", (socket) => {
  socket.on("joinRoom", ({ roomId, name }) => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: [],
        status: "waiting"
      };
    }

    rooms[roomId].players.push({
      id: socket.id,
      name,
      role: null,
      condition: "",
      selected: false
    });

    io.to(roomId).emit("updatePlayers", rooms[roomId].players);
  });

  socket.on("startGame", (roomId) => {
    const room = rooms[roomId];
    const players = room.players;

    const parentIndex = Math.floor(Math.random() * players.length);

    players.forEach((p, i) => {
      p.role = i === parentIndex ? "parent" : "child";
    });

    room.status = "input";

    io.to(roomId).emit("gameStarted", players);
  });

  socket.on("submitCondition", ({ roomId, condition }) => {
    const player = rooms[roomId].players.find(p => p.id === socket.id);
    player.condition = condition;

    const allDone = rooms[roomId].players
      .filter(p => p.role === "child")
      .every(p => p.condition);

    if (allDone) {
      rooms[roomId].status = "select";
      io.to(roomId).emit("allConditionsReady", rooms[roomId].players);
    }
  });

  socket.on("selectPlayers", ({ roomId, selectedIds }) => {
    const room = rooms[roomId];

    room.players.forEach(p => {
      p.selected = selectedIds.includes(p.id);
    });

    room.status = "result";

    io.to(roomId).emit("showResult", room.players);
  });
});

server.listen(3000, () => {
  console.log("Server running");
});
