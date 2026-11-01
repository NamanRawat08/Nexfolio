import React from 'react';

/**
 * Reusable Card primitive.
 * @param {object} props
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 * @param {'surface' | 'surface-2'} [props.variant]
 * @param {'none' | 'sm' | 'md' | 'lg'} [props.padding]
 * @param {React.ElementType} [props.as]
 */
export function Card({
  className = '',
  children,
  variant = 'surface',
  padding = 'md',
  as: Component = 'div',
  ...rest
}) {
  const bgClasses = {
    'surface': 'bg-surface border border-line',
    'surface-2': 'bg-surface-2 border border-line',
  }[variant] || 'bg-surface border border-line';

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-6',
  }[padding] || 'p-4 sm:p-5';

  return (
    <Component
      className={`rounded-xl transition-colors ${bgClasses} ${paddingClasses} ${className}`}
      {...rest}
    >
      {children}
    </Component>
  );
}
