export const FEATURE_FLAG_NAMES = [
  "FEATURE_AUTH",
  "FEATURE_ONLINE",
  "FEATURE_MATCHMAKING",
  "FEATURE_RATED",
] as const;

export type FeatureFlagName = (typeof FEATURE_FLAG_NAMES)[number];

export function flag(name: FeatureFlagName): boolean {
  const raw = Deno.env.get(name);
  if (!raw) {
    return false;
  }

  const normalized = raw.trim().replaceAll('"', "").toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

export function allFlags(): Record<FeatureFlagName, boolean> {
  return {
    FEATURE_AUTH: flag("FEATURE_AUTH"),
    FEATURE_ONLINE: flag("FEATURE_ONLINE"),
    FEATURE_MATCHMAKING: flag("FEATURE_MATCHMAKING"),
    FEATURE_RATED: flag("FEATURE_RATED"),
  };
}
