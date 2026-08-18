import { assertEquals } from "$std/assert/mod.ts";
import {
  hasSeenAiTutorial,
  markAiTutorialSeen,
  shouldShowAiTutorial,
} from "./tutorial.ts";

function createStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.has(key) ? values.get(key)! : null;
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, String(value));
    },
  } as Storage;
}

Deno.test("first-time users should see the AI tutorial and the menu highlight", () => {
  const storage = createStorage();

  assertEquals(shouldShowAiTutorial(storage), true);
  assertEquals(hasSeenAiTutorial(storage), false);

  markAiTutorialSeen(storage);
  assertEquals(hasSeenAiTutorial(storage), true);
  assertEquals(shouldShowAiTutorial(storage), false);
});
