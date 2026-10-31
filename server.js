const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

// Memoria globale dei punteggi dei giocatori
let globalLeaderboard = [];

io.on('connection', (socket) => {
    // Invia subito la classifica aggiornata al nuovo giocatore
    socket.emit('update-leaderboard', globalLeaderboard);

    // Ricezione nuovo record da un giocatore
    socket.on('submit-score', (data) => {
        if (!data.name || !data.score) return;
        
        let existingUser = globalLeaderboard.find(u => u.name.toLowerCase() === data.name.toLowerCase());
        if (existingUser) {
            if (data.score > existingUser.score) {
                existingUser.score = data.score;
            }
        } else {
            globalLeaderboard.push({ name: data.name, score: data.score });
        }
        
        // Ordina dal livello più alto a quello più basso
        globalLeaderboard.sort((a, b) => b.score - a.score);
        
        // Mantiene solo i primi 20 in classifica
        globalLeaderboard = globalLeaderboard.slice(0, 20);

        // Invia la classifica aggiornata a TUTTI i giocatori connessi
        io.emit('update-leaderboard', globalLeaderboard);
    });

    // Gestione Stanze Multiplayer
    socket.on('create-room', (code) => {
        socket.join(code);
        socket.emit('room-created', code);
    });

    socket.on('join-room', (code) => {
        const room = io.sockets.adapter.rooms.get(code);
        if (room && room.size === 1) {
            socket.join(code);
            socket.emit('room-joined', code);
            io.to(code).emit('start-multiplayer-game');
        } else {
            socket.emit('room-error', 'Stanza piena o non esistente!');
        }
    });

    // Inoltra movimento, punteggio, skin e scia all'avversario
    socket.on('player-move', (data) => {
        socket.to(data.roomCode).emit('opponent-move', data);
    });

    // Quando un giocatore muore in multiplayer, avvisa l'avversario
    socket.on('player-died', (data) => {
        socket.to(data.roomCode).emit('opponent-died');
    });
});

server.listen(PORT, () => {
    console.log(`Server in ascolto sulla porta ${PORT}`);
});