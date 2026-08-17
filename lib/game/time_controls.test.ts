import { assertEquals } from "$std/assert/mod.ts";
import {
  parseCustomTimeControl,
  resolveTimeControl,
  TIME_CONTROLS,
} from "./time_controls.ts";

Deno.test("parses X:XX+Y format", () => {
  assertEquals(parseCustomTimeControl("2:30+2"), {
    initialMs: 150_000,
    incrementMs: 2_000,
  });
});

Deno.test("parses without increment", () => {
  assertEquals(parseCustomTimeControl("5:00"), {
    initialMs: 300_000,
    incrementMs: 0,
  });
});

Deno.test("parses whole-minutes shorthand M+Y", () => {
  assertEquals(parseCustomTimeControl("3+2"), {
    initialMs: 180_000,
    incrementMs: 2_000,
  });
});

Deno.test("rejects invalid input", () => {
  assertEquals(parseCustomTimeControl("abc"), null);
  assertEquals(parseCustomTimeControl("0:00"), null);
  assertEquals(parseCustomTimeControl("2:75"), null);
  assertEquals(parseCustomTimeControl(""), null);
});

Deno.test("resolveTimeControl returns presets unchanged", () => {
  assertEquals(resolveTimeControl("3+2"), TIME_CONTROLS["3+2"]);
});

Deno.test("resolveTimeControl parses custom ids", () => {
  const custom = resolveTimeControl("custom:1:30+1");
  assertEquals(custom.initialMs, 90_000);
  assertEquals(custom.incrementMs, 1_000);
  assertEquals(custom.label, "1:30+1");
});

Deno.test("resolveTimeControl falls back on bad custom id", () => {
  assertEquals(resolveTimeControl("custom:bogus"), TIME_CONTROLS.classic);
  assertEquals(resolveTimeControl("unknown"), TIME_CONTROLS.classic);
});
