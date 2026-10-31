const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const rooms = {};

io.on('connection', (socket) => {
    console.log('Un giocatore si è connesso:', socket.id);

    // Crea una stanza con il codice
    socket.on('create-room', (roomCode) => {
        if (rooms[roomCode]) {
            socket.emit('room-error', 'Questa stanza esiste già!');
        } else {
            rooms[roomCode] = { players: [socket.id] };
            socket.join(roomCode);
            socket.emit('room-created', roomCode);
            console.log(`Stanza creata: ${roomCode}`);
        }
    });

    // Entra in una stanza esistente con il codice
    socket.on('join-room', (roomCode) => {
        let room = rooms[roomCode];
        if (room && room.players.length < 2) {
            room.players.push(socket.id);
            socket.join(roomCode);
            socket.emit('room-joined', roomCode);
            io.to(roomCode).emit('start-multiplayer-game');
            console.log(`Giocatore entrato nella stanza: ${roomCode}`);
        } else {
            socket.emit('room-error', 'Stanza piena o inesistente!');
        }
    });

    // Sincronizzazione dei movimenti in tempo reale
    socket.on('player-move', (data) => {
        socket.to(data.roomCode).emit('opponent-move', data);
    });

    socket.on('disconnect', () => {
        console.log('Giocatore disconnesso:', socket.id);
    });
});

server.listen(3000, () => {
    console.log('Server in ascolto sulla porta 3000');
});