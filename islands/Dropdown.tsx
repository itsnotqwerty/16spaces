import { useEffect, useRef, useState } from "preact/hooks";

export type DropdownOption = {
  value: string;
  label: string;
};

type DropdownProps = {
  id: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  class?: string;
};

/**
 * Lightweight custom dropdown that renders its own listbox, avoiding the
 * native <select> hover-highlight flicker caused by sibling re-renders.
 */
export default function Dropdown(
  { id, value, options, onChange, class: cls }: DropdownProps,
) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) ?? options[0];

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const commit = (option: DropdownOption) => {
    onChange(option.value);
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        setHighlight(options.findIndex((o) => o.value === value));
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(options.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      commit(options[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const base =
    "px-3 py-2 rounded bg-[#23211d] border border-white/20 text-white";

  return (
    <div ref={rootRef} class={`relative ${cls ?? ""}`} onKeyDown={onKeyDown}>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        class={`${base} w-full flex items-center justify-between gap-2`}
        onClick={() =>
          setOpen((o) =>
            !o
          )}
      >
        <span>{selected?.label}</span>
        <span class="text-gray-400 text-xs">▾</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-labelledby={id}
          class="absolute z-50 mt-1 max-h-64 overflow-auto rounded border border-white/20 bg-[#23211d] shadow-lg"
        >
          {options.map((option, i) => {
            const active = option.value === value;
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={active}
                class={`px-3 py-2 cursor-pointer whitespace-nowrap ${
                  active
                    ? "bg-blue-600 text-white"
                    : i === highlight
                    ? "bg-white/10"
                    : "text-white"
                }`}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => commit(option)}
              >
                {option.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
