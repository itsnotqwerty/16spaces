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
