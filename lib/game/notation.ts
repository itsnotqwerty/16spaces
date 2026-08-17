import type { Coord, Move } from "./types.ts";

export function coordToNotation(coord: Coord): string {
  return `${String.fromCharCode(65 + coord.y)}${coord.x + 1}`;
}

export function moveToNotation(move: Move): string {
  if (move.kind === "place") {
    return coordToNotation(move.to);
  }

  return `${coordToNotation(move.from)}->${coordToNotation(move.to)}`;
}
