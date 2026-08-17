import { assertEquals } from "$std/assert/mod.ts";
import { normalizeUsername, validateUsername } from "./username.ts";

Deno.test("validateUsername accepts valid usernames", () => {
  assertEquals(validateUsername("Sam_123"), null);
});

Deno.test("validateUsername rejects invalid format", () => {
  assertEquals(
    validateUsername("1sam"),
    "Username must be 3-20 chars, start with a letter, and use only letters, numbers, or _.",
  );
});

Deno.test("validateUsername rejects reserved names", () => {
  assertEquals(validateUsername("login"), "That username is reserved.");
});

Deno.test("normalizeUsername trims whitespace", () => {
  assertEquals(normalizeUsername("  Sam_123  "), "Sam_123");
});
