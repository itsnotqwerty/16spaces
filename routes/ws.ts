import { FreshContext } from "$fresh/server.ts";

type GameState = {
  ploys: Ploy[],
  currentPlayer: Player,
  timeX: number,
  timeO: number,
  winner: Player,
};

type Ploy = {
  index: number;
  xMove: string | null;
  oMove: string | null;
}

type Player = "X" | "O" | null;

const rooms: Record<string, Set<WebSocket>> = {};

const checkWin = (boardPos: Player[][]): { winner: "X" | "O"; line: number[][] } | null => {
  const lines = [
    ...boardPos.map((row, i) => row.map((_, j) => [i, j])), // Rows
    ...boardPos[0].map((_, col) => boardPos.map((_, row) => [row, col])), // Columns
    boardPos.map((_, i) => [i, i]), // Main diagonal
    boardPos.map((_, i) => [i, boardPos.length - 1 - i]), // Anti-diagonal
  ];

  for (const line of lines) {
    const cells = line.map(([x, y]) => boardPos[x][y]);
    if (cells.every((cell) => cell === "X")) return { winner: "X", line };
    if (cells.every((cell) => cell === "O")) return { winner: "O", line };
  }

  return null;
};

const reconstructBoard = (ploys: Ploy[]): Player[][] => {
  const newBoard: Player[][] = Array(4).fill(null).map(() => Array(4).fill(null));
  let currentPlayer: Player = "X";

  for (const ploy of ploys) {
    if (ploy.xMove) {
      const [from, to] = ploy.xMove.split("->");
      if (to) {
        // Move stone
        const [fromCol, fromRow] = [from.charCodeAt(0) - 65, parseInt(from[1]) - 1];
        const [toCol, toRow] = [to.charCodeAt(0) - 65, parseInt(to[1]) - 1];
        newBoard[fromRow][fromCol] = null;
        newBoard[toRow][toCol] = "X";
      } else {
        // Place stone
        const [col, row] = [from.charCodeAt(0) - 65, parseInt(from[1]) - 1];
        newBoard[row][col] = "X";
      }
    }

    if (ploy.oMove) {
      const [from, to] = ploy.oMove.split("->");
      if (to) {
        // Move stone
        const [fromCol, fromRow] = [from.charCodeAt(0) - 65, parseInt(from[1]) - 1];
        const [toCol, toRow] = [to.charCodeAt(0) - 65, parseInt(to[1]) - 1];
        newBoard[fromRow][fromCol] = null;
        newBoard[toRow][toCol] = "O";
      } else {
        // Place stone
        const [col, row] = [from.charCodeAt(0) - 65, parseInt(from[1]) - 1];
        newBoard[row][col] = "O";
      }
    }

    currentPlayer = currentPlayer === "X" ? "O" : "X";
  }

  return newBoard;
};

export const handler = (req: Request, _ctx: FreshContext): Response => {
  let gameState: GameState = {
    ploys: [],
    currentPlayer: "X",
    timeX: 150,
    timeO: 150,
    winner: null,
  };

  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.onopen = () => {
    console.log("WebSocket connection established");
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "connect") {
      const room = data.room;
      if (!rooms[room]) {
        rooms[room] = new Set();
      }
      rooms[room].add(socket);
      console.log(`Client connected to room: ${room}`);

      // Send the current game state to the newly connected client
      socket.send(JSON.stringify({ type: "state", ...gameState }));
    } else if (data.type === "move") {
      gameState = { ...gameState, ...data };
      const board = reconstructBoard(gameState.ploys);
      broadcastToRoom(data.room, JSON.stringify({ type: "move", ...gameState }));
      const winner = checkWin(board);
      if (winner) {
        const winningPlayer = winner.winner;
        broadcastToRoom(data.room, JSON.stringify({ type: "win", winner: winningPlayer, line: winner.line }));
        gameState.winner = winningPlayer;
      }
    } else if (data.type === "reset") {
      gameState = {
        ploys: [],
        currentPlayer: "X",
        timeX: 150,
        timeO: 150,
        winner: null,
      };
      broadcastToRoom(data.room, JSON.stringify({ type: "reset" }));
    }
  };

  socket.onclose = () => {
    console.log("WebSocket connection closed");
    for (const room in rooms) {
      rooms[room].delete(socket);
      if (rooms[room].size === 0) {
        delete rooms[room];
      }
    }
  };

  socket.onerror = (err) => {
    console.error("WebSocket error:", err);
  };

  return response;
};

function broadcastToRoom(room: string, message: string) {
  if (rooms[room]) {
    for (const client of rooms[room]) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }
}