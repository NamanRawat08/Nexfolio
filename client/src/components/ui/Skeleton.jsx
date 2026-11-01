import React from 'react';

/**
 * Skeleton placeholder primitive for loading states.
 *
 * @param {object} props
 * @param {string} [props.className]
 */
export function Skeleton({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-surface-2 ${className}`}
    />
  );
}
