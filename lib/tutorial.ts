export const AI_TUTORIAL_STORAGE_KEY = "16spaces.aiTutorialSeen";

export function hasSeenAiTutorial(storage: Storage | null | undefined): boolean {
  if (!storage) {
    return false;
  }

  try {
    return storage.getItem(AI_TUTORIAL_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function markAiTutorialSeen(storage: Storage | null | undefined): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(AI_TUTORIAL_STORAGE_KEY, "true");
  } catch {
    // Ignore storage errors and continue without a tutorial lock.
  }
}

export function shouldShowAiTutorial(storage: Storage | null | undefined): boolean {
  return !hasSeenAiTutorial(storage);
}
