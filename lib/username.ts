const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/;
const PLACEHOLDER_USERNAME_REGEX = /^user_[a-f0-9]{8}$/i;

const RESERVED_USERNAMES = new Set([
  "admin",
  "api",
  "play",
  "local",
  "login",
  "signup",
  "settings",
  "leaderboard",
  "u",
  "l",
  "queue",
  "auth",
  "guest",
  "anonymous",
  "16spaces",
]);

export function validateUsername(username: string): string | null {
  const trimmed = username.trim();

  if (!USERNAME_REGEX.test(trimmed)) {
    return "Username must be 3-20 chars, start with a letter, and use only letters, numbers, or _.";
  }

  if (RESERVED_USERNAMES.has(trimmed.toLowerCase())) {
    return "That username is reserved.";
  }

  return null;
}

export function normalizeUsername(username: string): string {
  return username.trim();
}

export function isPlaceholderUsername(username: string | null | undefined): boolean {
  if (!username) {
    return true;
  }

  return PLACEHOLDER_USERNAME_REGEX.test(username.trim());
}
