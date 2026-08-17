import type { TimeControl } from "./types.ts";
export const TIME_CONTROLS: Record<string, TimeControl> = {
  bullet30: { id: "bullet30", label: "30s", initialMs: 30_000, incrementMs: 0 },
  "1+0": { id: "1+0", label: "1+0", initialMs: 60_000, incrementMs: 0 },
  "2+1": { id: "2+1", label: "2+1", initialMs: 120_000, incrementMs: 1_000 },
  classic: {
    id: "classic",
    label: "Classic 2:30",
    initialMs: 150_000,
    incrementMs: 0,
  },
  "3+0": { id: "3+0", label: "3+0", initialMs: 180_000, incrementMs: 0 },
  "3+2": { id: "3+2", label: "3+2", initialMs: 180_000, incrementMs: 2_000 },
  "5+0": { id: "5+0", label: "5+0", initialMs: 300_000, incrementMs: 0 },
  "5+3": { id: "5+3", label: "5+3", initialMs: 300_000, incrementMs: 3_000 },
};

export const DEFAULT_TIME_CONTROL_ID = "classic";

const CUSTOM_ID_PREFIX = "custom:";

/**
 * Parses "X:XX+Y" (minutes:seconds + increment-seconds), also accepting
 * "M+Y" (whole minutes + increment) and bare "X:XX". Returns milliseconds.
 */
export function parseCustomTimeControl(
  input: string,
): { initialMs: number; incrementMs: number } | null {
  const trimmed = input.trim();
  const match = /^(?:(\d+):([0-5]?\d)|(\d+))(?:\+(\d+))?$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const minutes = match[1] !== undefined
    ? Number(match[1])
    : match[3] !== undefined
    ? Number(match[3])
    : 0;
  const seconds = match[2] !== undefined ? Number(match[2]) : 0;
  const increment = match[4] !== undefined ? Number(match[4]) : 0;

  const initialMs = (minutes * 60 + seconds) * 1000;
  if (initialMs <= 0) {
    return null;
  }

  return { initialMs, incrementMs: increment * 1000 };
}

/** Resolves a preset id or a "custom:X:XX+Y" id into a TimeControl. */
export function resolveTimeControl(id: string): TimeControl {
  const preset = TIME_CONTROLS[id];
  if (preset) {
    return preset;
  }

  if (id.startsWith(CUSTOM_ID_PREFIX)) {
    const parsed = parseCustomTimeControl(id.slice(CUSTOM_ID_PREFIX.length));
    if (parsed) {
      return {
        id,
        label: id.slice(CUSTOM_ID_PREFIX.length),
        initialMs: parsed.initialMs,
        incrementMs: parsed.incrementMs,
      };
    }
  }

  return TIME_CONTROLS[DEFAULT_TIME_CONTROL_ID];
}
