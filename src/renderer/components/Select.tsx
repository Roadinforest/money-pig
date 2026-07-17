// Headless-styled custom select. The native <select> popup is OS-rendered
// and cannot be themed, so we render our own listbox while keeping a button
// trigger that visually matches the form inputs.

import { Check, ChevronDown } from "lucide-react";
import {
  KeyboardEvent,
  MouseEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState
} from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange(value: string): void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  className,
  ariaLabel
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selected = options.find((option) => option.value === value);
  const displayLabel = selected?.label ?? placeholder ?? "";
  const isPlaceholder = !selected;

  // Sync the keyboard highlight to the currently-selected value as soon as
  // the popup mounts. useLayoutEffect runs before paint, so reopening never
  // flashes a stale highlight from the previous open session.
  useLayoutEffect(() => {
    if (!open) return;
    const idx = options.findIndex((option) => option.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
  }, [open, options, value]);

  // Click-outside and Escape close the popup. Listeners depend only on `open`
  // so they aren't churned every time the parent's options array identity
  // changes (parents recompute it inline on every render).
  useEffect(() => {
    if (!open) return;

    function handleMouseDown(event: globalThis.MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    switch (event.key) {
      case "Enter":
      case " ":
        event.preventDefault();
        if (open && activeIndex >= 0) {
          onChange(options[activeIndex].value);
          setOpen(false);
        } else {
          setOpen(true);
        }
        break;
      case "ArrowDown":
        event.preventDefault();
        if (!open) {
          setOpen(true);
        } else {
          setActiveIndex((index) => (options.length === 0 ? -1 : (index + 1) % options.length));
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!open) {
          setOpen(true);
        } else {
          setActiveIndex((index) =>
            options.length === 0 ? -1 : (index - 1 + options.length) % options.length
          );
        }
        break;
      case "Home":
        if (open) {
          event.preventDefault();
          setActiveIndex(0);
        }
        break;
      case "End":
        if (open) {
          event.preventDefault();
          setActiveIndex(options.length - 1);
        }
        break;
    }
  }

  function commit(value: string) {
    onChange(value);
    setOpen(false);
  }

  // Swallow mousedown on the popup so focus stays on the trigger button.
  // Without this the focus would jump into the <ul>, and on unmount focus
  // would fall back to <body>, breaking keyboard repeat-open behavior.
  function swallowMouseDown(event: MouseEvent) {
    event.preventDefault();
  }

  return (
    <div
      ref={containerRef}
      className={`custom-select${open ? " open" : ""}${disabled ? " disabled" : ""}${
        className ? ` ${className}` : ""
      }`}
    >
      <button
        type="button"
        className="custom-select-trigger"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => !disabled && setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        data-placeholder={isPlaceholder || undefined}
      >
        <span className="custom-select-label">{displayLabel}</span>
        <ChevronDown size={16} className="custom-select-chevron" aria-hidden />
      </button>
      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          className="custom-select-popup"
          tabIndex={-1}
          onMouseDown={swallowMouseDown}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === activeIndex;
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                className={`custom-select-option${isSelected ? " selected" : ""}${
                  isActive ? " active" : ""
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={(event) => {
                  // Most Selects live inside a <label>. Cancel its default
                  // activation so this click does not re-click the trigger
                  // after commit unmounts the popup.
                  event.preventDefault();
                  commit(option.value);
                }}
              >
                <span className="custom-select-option-label">{option.label}</span>
                {isSelected ? <Check size={14} aria-hidden /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
