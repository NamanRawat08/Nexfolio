import React from 'react';

/**
 * Badge / Chip primitive.
 *
 * @param {object} props
 * @param {'accent' | 'gain' | 'loss' | 'neutral' | 'outline'} [props.variant]
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 */
export function Badge({
  variant = 'neutral',
  className = '',
  children,
  ...rest
}) {
  const variantClasses = {
    accent: 'bg-accent/15 text-accent border border-accent/30',
    gain: 'bg-gain/15 text-gain border border-gain/30',
    loss: 'bg-loss/15 text-loss border border-loss/30',
    neutral: 'bg-surface-2 text-muted border border-line',
    outline: 'bg-transparent text-muted border border-line',
  }[variant] || 'bg-surface-2 text-muted border border-line';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold tracking-wide rounded-md uppercase select-none ${variantClasses} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
