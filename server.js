const express = require("express");
const { WebSocketServer } = require("ws");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const app = express();
const PORT = 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

const wss = new WebSocketServer({ server });

let jugadores = []; // { id, nombre, socket }
let numeroSecreto = null;
let juegoIniciado = false;
let historial = [];
let turnoIndex = 0; // índice del jugador que tiene el turno

function broadcast(tipo, datos) {
  jugadores.forEach((j) => {
    if (j.socket.readyState === j.socket.OPEN) {
      j.socket.send(JSON.stringify({ tipo, datos }));
    }
  });
}

function enviarTurno() {
  if (jugadores.length === 2 && juegoIniciado) {
    const jugadorTurno = jugadores[turnoIndex];
    jugadorTurno.socket.send(JSON.stringify({ tipo: "tu_turno" }));
  }
}

function reiniciarJuego() {
  numeroSecreto = Math.floor(Math.random() * 200) + 1; // 1 a 200
  juegoIniciado = true;
  historial = [];
  turnoIndex = 0;
  broadcast("juego_iniciado", {});
  enviarTurno();
}

wss.on("connection", (ws) => {
  ws.id = uuidv4();

  ws.on("message", (data) => {
    const msg = JSON.parse(data);
    const { tipo, datos } = msg;

    if (tipo === "login") {
      const { nombre } = datos;
      if (!nombre) {
        ws.send(JSON.stringify({ tipo: "error", datos: "Nombre requerido" }));
        return;
      }

      if (jugadores.length >= 2) {
        ws.send(JSON.stringify({ tipo: "error", datos: "Juego lleno" }));
        return;
      }

      jugadores.push({ id: ws.id, nombre, socket: ws });
      broadcast("jugadores", jugadores.map((j) => j.nombre));

      if (jugadores.length === 2) {
        reiniciarJuego();
      }
    }

    if (tipo === "adivinar") {
      if (!juegoIniciado) return;

      if (jugadores[turnoIndex].id !== ws.id) {
        ws.send(JSON.stringify({ tipo: "error", datos: "No es tu turno" }));
        return;
      }

      const jugador = jugadores[turnoIndex];
      const otro = jugadores[(turnoIndex + 1) % 2];

      const num = parseInt(datos.numero);
      if (isNaN(num) || num < 1 || num > 200) return;

      let resultado = "";
      if (num < numeroSecreto) resultado = "mayor";
      else if (num > numeroSecreto) resultado = "menor";
      else {
        resultado = "correcto";
        broadcast("ganador", jugador.nombre);
        juegoIniciado = false;
        return;
      }

      const msgHistorial = `${jugador.nombre} dijo ${num} → ${resultado}`;
      historial.push(msgHistorial);

      jugador.socket.send(JSON.stringify({ tipo: "resultado", datos: resultado }));
      otro.socket.send(JSON.stringify({ tipo: "info", datos: msgHistorial }));

      turnoIndex = (turnoIndex + 1) % 2;
      enviarTurno();
    }

    if (tipo === "reiniciar") {
      if (jugadores.length === 2) reiniciarJuego();
    }
  });

  ws.on("close", () => {
    jugadores = jugadores.filter((j) => j.id !== ws.id);
    juegoIniciado = false;
    numeroSecreto = null;
    historial = [];
    turnoIndex = 0;
    broadcast("info", "Un jugador se ha desconectado. Esperando nuevo jugador...");
  });
});

app.use(express.static(path.join(__dirname, "public")));
