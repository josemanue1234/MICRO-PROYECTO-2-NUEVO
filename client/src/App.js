import React, { useEffect, useRef, useState } from "react";
import "./App.css";

const WS_URL = "ws://192.168.1.73:3000"; 

function App() {
  const ws = useRef(null);
  const [pantalla, setPantalla] = useState("login");
  const [nombre, setNombre] = useState("");
  const [jugadores, setJugadores] = useState([]);
  const [miTurno, setMiTurno] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [historial, setHistorial] = useState([]);
  const [numero, setNumero] = useState("");

  useEffect(() => {
    ws.current = new WebSocket(WS_URL);

    ws.current.onopen = () => {
      console.log("✅ Conectado al servidor WebSocket");
    };

    ws.current.onmessage = (e) => {
      const msg = JSON.parse(e.data);

      switch (msg.tipo) {
        case "jugadores":
          setJugadores(msg.datos);
          break;

        case "juego_iniciado":
          setPantalla("juego");
          setHistorial([]);
          setMensaje("El juego ha comenzado. Espera tu turno.");
          setMiTurno(false);
          break;

        case "tu_turno":
          setMiTurno(true);
          setMensaje("🎯 ¡Es tu turno! Adivina el número entre 1 y 200.");
          break;

        case "resultado":
          setMensaje("🧪 Resultado: Tu número es " + msg.datos);
          break;

        case "info":
          setHistorial((prev) => [...prev, msg.datos]);
          setMiTurno(false);
          break;

        case "historial":
          setHistorial(msg.datos);
          break;

        case "ganador":
          setPantalla("ganador");
          setMensaje("🏆 ¡" + msg.datos + " ha ganado! 🎉");
          break;

        case "error":
          alert(msg.datos);
          setPantalla("login");
          break;

        default:
          break;
      }
    };

    ws.current.onclose = () => {
      console.log("❌ Desconectado del servidor");
      setMensaje("Conexión perdida");
      setPantalla("login");
      setJugadores([]);
      setHistorial([]);
    };

    return () => ws.current.close();
  }, []);

  function enviar(tipo, datos) {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ tipo, datos }));
    }
  }

  function login() {
    if (!nombre.trim()) {
      alert("Escribe tu nombre");
      return;
    }
    enviar("login", { nombre: nombre.trim() });
    setPantalla("esperando");
  }

  function adivinar() {
    const num = parseInt(numero);
    if (isNaN(num) || num < 1 || num > 200) {
      alert("Número inválido");
      return;
    }
    enviar("adivinar", { numero: num });
    setNumero("");
    setMiTurno(false);
  }

  // UI renderizado
  if (pantalla === "login") {
    return (
      <div className="container">
        <h1>🎮 Adivina el Número</h1>
        <input
          placeholder="Tu nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <button onClick={login}>Entrar</button>
      </div>
    );
  }

  if (pantalla === "esperando") {
    return (
      <div className="container">
        <h2>⌛ Esperando jugadores...</h2>
        <ul>
          {jugadores.map((j, i) => (
            <li key={i}>👤 {j}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (pantalla === "juego") {
    return (
      <div className="container">
        <h2>🎯 Adivina el número (1 a 200)</h2>
        <p>{mensaje}</p>
        {miTurno && (
          <>
            <input
              type="number"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              min={1}
              max={200}
              placeholder="Tu número"
            />
            <button onClick={adivinar}>Enviar</button>
          </>
        )}
        {historial.length > 0 && (
          <div className="historial">
            <h4>📜 Historial</h4>
            {historial.map((h, i) => (
              <p key={i}>{h}</p>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (pantalla === "ganador") {
    return (
      <div className="container">
        <h1>{mensaje}</h1>
        <p>Reinicia la página si deseas volver a jugar.</p>
      </div>
    );
  }

  return null;
}

export default App;
