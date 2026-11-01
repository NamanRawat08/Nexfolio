import React from 'react';

/**
 * Avatar primitive for user profiles and ticker badges.
 *
 * @param {object} props
 * @param {string} props.initials
 * @param {'sm' | 'md' | 'lg'} [props.size]
 * @param {string} [props.className]
 * @param {string} [props.ariaLabel]
 */
export function Avatar({
  initials,
  size = 'md',
  className = '',
  ariaLabel,
}) {
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs font-semibold',
    md: 'w-9 h-9 text-xs font-bold tracking-tight',
    lg: 'w-11 h-11 text-sm font-bold',
  }[size] || 'w-9 h-9 text-xs font-bold';

  return (
    <div
      role="img"
      aria-label={ariaLabel || initials}
      className={`inline-flex items-center justify-center rounded-lg bg-surface-2 border border-line text-accent select-none font-sans ${sizeClasses} ${className}`}
    >
      {initials}
    </div>
  );
}
