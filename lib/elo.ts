export type EloResult = "win" | "loss" | "draw";

export type EloUpdateInput = {
  ratingA: number;
  ratingB: number;
  gamesPlayedA: number;
  gamesPlayedB: number;
  resultA: EloResult;
};

export type EloUpdate = {
  ratingA: number;
  ratingB: number;
  deltaA: number;
  deltaB: number;
};

export function expectedScore(rating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400));
}

export function kFactor(gamesPlayed: number): number {
  return gamesPlayed < 10 ? 40 : 20;
}

function scoreFromResult(result: EloResult): number {
  if (result === "win") {
    return 1;
  }
  if (result === "draw") {
    return 0.5;
  }
  return 0;
}

function clampRating(value: number): number {
  return Math.max(100, value);
}

export function applyEloResult(input: EloUpdateInput): EloUpdate {
  const scoreA = scoreFromResult(input.resultA);
  const scoreB = 1 - scoreA;

  const expectedA = expectedScore(input.ratingA, input.ratingB);
  const expectedB = expectedScore(input.ratingB, input.ratingA);

  const deltaA = Math.round(kFactor(input.gamesPlayedA) * (scoreA - expectedA));
  const deltaB = Math.round(kFactor(input.gamesPlayedB) * (scoreB - expectedB));

  const ratingA = clampRating(input.ratingA + deltaA);
  const ratingB = clampRating(input.ratingB + deltaB);

  return {
    ratingA,
    ratingB,
    deltaA: ratingA - input.ratingA,
    deltaB: ratingB - input.ratingB,
  };
}
