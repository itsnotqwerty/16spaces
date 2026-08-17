import { useEffect, useState } from "preact/hooks";
import { parseCustomTimeControl, TIME_CONTROLS } from "../lib/game/index.ts";
import Dropdown from "./Dropdown.tsx";

const CUSTOM_VALUE = "__custom__";

export function formatCustom(preset: {
  initialMs: number;
  incrementMs: number;
}): string {
  const totalSec = Math.floor(preset.initialMs / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  const inc = Math.floor(preset.incrementMs / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}+${inc}`;
}

type TimeControlPickerProps = {
  /** Current control id — a preset id or "custom:X:XX+Y". */
  value: string;
  onChange: (id: string) => void;
  /** Render the built-in label; callers that render their own should pass false. */
  showLabel?: boolean;
  labelClass?: string;
  selectClass?: string;
};

export default function TimeControlPicker({
  value,
  onChange,
  showLabel = true,
  labelClass = "text-sm text-gray-300",
  selectClass =
    "px-3 py-2 rounded bg-[#23211d] border border-white/20 text-white",
}: TimeControlPickerProps) {
  const isCustom = value.startsWith("custom:");
  const [customText, setCustomText] = useState("2:30+0");
  const [customValid, setCustomValid] = useState(true);

  // Keep the text field in sync when a custom value comes from elsewhere.
  useEffect(() => {
    if (isCustom) {
      setCustomText(value.slice("custom:".length));
    }
  }, [value]);

  const applyCustom = (text: string) => {
    setCustomText(text);
    const parsed = parseCustomTimeControl(text);
    setCustomValid(parsed !== null);
    if (parsed) {
      onChange(`custom:${formatCustom(parsed)}`);
    }
  };

  return (
    <>
      {showLabel && (
        <label class={labelClass} for="time-control-select">
          Time preset
        </label>
      )}
      <Dropdown
        id="time-control-select"
        value={isCustom ? CUSTOM_VALUE : value}
        options={[
          ...Object.values(TIME_CONTROLS).map((control) => ({
            value: control.id,
            label: control.label,
          })),
          { value: CUSTOM_VALUE, label: "Custom…" },
        ]}
        onChange={(v) => {
          if (v === CUSTOM_VALUE) {
            const parsed = parseCustomTimeControl(customText);
            if (parsed) {
              onChange(`custom:${formatCustom(parsed)}`);
            } else {
              onChange(`custom:${customText}`);
            }
          } else {
            onChange(v);
          }
        }}
        class="w-full"
      />

      {isCustom && (
        <input
          type="text"
          inputMode="text"
          placeholder="X:XX+Y"
          value={customText}
          onInput={(e) =>
            applyCustom((e.currentTarget as HTMLInputElement).value)}
          class={`${selectClass} mt-2 w-full ${
            customValid ? "" : "border-red-500"
          }`}
          title="Minutes:Seconds+Increment, e.g. 2:30+2"
        />
      )}
    </>
  );
}
