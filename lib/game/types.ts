export type Player = "X" | "O";
export type Cell = Player | null;

export type Board = Cell[][];

export type Coord = {
  x: number;
  y: number;
};

export type PlaceMove = {
  kind: "place";
  to: Coord;
};

export type SlideMove = {
  kind: "slide";
  from: Coord;
  to: Coord;
};

export type Move = PlaceMove | SlideMove;

export type TimeControl = {
  id: string;
  label: string;
  initialMs: number;
  incrementMs: number;
};

export type ClockState = {
  remainingMsX: number;
  remainingMsO: number;
  incrementMs: number;
  turnStartedAt: string | null;
  clocksStartedAt: string | null;
};

export type TerminalReason =
  | "four_in_a_row"
  | "timeout"
  | "no_legal_moves"
  | "ply_cap"
  | "resign";

export type TerminalState = {
  winner: Player | null;
  reason: TerminalReason;
};

export type GameSnapshot = {
  board: Board;
  /** Board dimension N (board is N×N); matches board.length. */
  size: number;
  toMove: Player;
  ply: number;
  clock: ClockState;
  terminal: TerminalState | null;
};

export type MoveResult =
  | {
    ok: true;
    snapshot: GameSnapshot;
    notation: string;
  }
  | {
    ok: false;
    error: "illegal" | "game_over" | "flag_fell";
    snapshot: GameSnapshot;
  };
