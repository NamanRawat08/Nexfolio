import React, { useRef } from 'react';

/**
 * Accessible Segmented Control (radiogroup semantics).
 * Keyboard operable with Left/Right arrows.
 *
 * @param {object} props
 * @param {Array<{ label: string, value: string }>} props.options
 * @param {string} props.value
 * @param {(value: string) => void} props.onChange
 * @param {string} [props.ariaLabel]
 * @param {string} [props.className]
 */
export function SegmentedControl({
  options = [],
  value,
  onChange,
  ariaLabel = 'Select range',
  className = '',
}) {
  const containerRef = useRef(null);

  const handleKeyDown = (e, index) => {
    let targetIndex = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      targetIndex = (index + 1) % options.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      targetIndex = (index - 1 + options.length) % options.length;
    } else if (e.key === 'Home') {
      targetIndex = 0;
    } else if (e.key === 'End') {
      targetIndex = options.length - 1;
    }

    if (targetIndex !== -1) {
      e.preventDefault();
      const targetOption = options[targetIndex];
      onChange(targetOption.value);
      const buttons = containerRef.current?.querySelectorAll('button');
      if (buttons && buttons[targetIndex]) {
        buttons[targetIndex].focus();
      }
    }
  };

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label={ariaLabel}
      className={`inline-flex items-center p-1 bg-surface-2 rounded-lg border border-line ${className}`}
    >
      {options.map((opt, idx) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all select-none cursor-pointer min-h-[32px] ${
              isSelected
                ? 'bg-accent text-accent-fg shadow-sm'
                : 'text-muted hover:text-fg hover:bg-line/40'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
