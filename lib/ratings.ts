import { applyEloResult } from "./elo.ts";

export type RatingProfile = {
  userId: string;
  rating: number;
  ratedGames: number;
  wins: number;
  losses: number;
  draws: number;
};

export type RatedOutcome = "win" | "loss" | "draw";

export type RatingUpdateResult = {
  profileA: RatingProfile;
  profileB: RatingProfile;
  deltaA: number;
  deltaB: number;
};

const ratingsByUser = new Map<string, RatingProfile>();

function clone(profile: RatingProfile): RatingProfile {
  return { ...profile };
}

function ensureProfile(userId: string): RatingProfile {
  const existing = ratingsByUser.get(userId);
  if (existing) {
    return existing;
  }

  const initial: RatingProfile = {
    userId,
    rating: 1000,
    ratedGames: 0,
    wins: 0,
    losses: 0,
    draws: 0,
  };
  ratingsByUser.set(userId, initial);
  return initial;
}

export function getRatingProfile(userId: string): RatingProfile {
  return clone(ensureProfile(userId));
}

export function applyRatedOutcome(
  userAId: string,
  userBId: string,
  outcomeForA: RatedOutcome,
): RatingUpdateResult {
  const profileA = ensureProfile(userAId);
  const profileB = ensureProfile(userBId);

  const elo = applyEloResult({
    ratingA: profileA.rating,
    ratingB: profileB.rating,
    gamesPlayedA: profileA.ratedGames,
    gamesPlayedB: profileB.ratedGames,
    resultA: outcomeForA,
  });

  profileA.rating = elo.ratingA;
  profileB.rating = elo.ratingB;
  profileA.ratedGames += 1;
  profileB.ratedGames += 1;

  if (outcomeForA === "win") {
    profileA.wins += 1;
    profileB.losses += 1;
  } else if (outcomeForA === "loss") {
    profileA.losses += 1;
    profileB.wins += 1;
  } else {
    profileA.draws += 1;
    profileB.draws += 1;
  }

  return {
    profileA: clone(profileA),
    profileB: clone(profileB),
    deltaA: elo.deltaA,
    deltaB: elo.deltaB,
  };
}
