import React from 'react';

/**
 * Reusable Button primitive.
 * @param {object} props
 * @param {'primary' | 'secondary' | 'outline' | 'ghost'} [props.variant]
 * @param {'sm' | 'md' | 'lg' | 'icon'} [props.size]
 * @param {string} [props.className]
 * @param {boolean} [props.disabled]
 * @param {React.ReactNode} props.children
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  disabled = false,
  children,
  type = 'button',
  ...rest
}) {
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed select-none';

  const variantClasses = {
    primary:
      'bg-accent text-accent-fg hover:bg-accent-hover font-semibold shadow-sm disabled:opacity-50 disabled:hover:bg-accent',
    secondary:
      'bg-surface-2 text-fg hover:bg-line border border-line disabled:opacity-40 disabled:hover:bg-surface-2',
    outline:
      'bg-transparent text-fg hover:bg-surface-2 border border-line disabled:opacity-40',
    ghost:
      'bg-transparent text-muted hover:text-fg hover:bg-surface-2 disabled:opacity-40',
  }[variant] || '';

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5 min-h-[32px]',
    md: 'text-sm px-4 py-2 min-h-[40px]',
    lg: 'text-base px-5 py-2.5 min-h-[44px]',
    icon: 'p-2 min-w-[44px] min-h-[44px] rounded-lg',
  }[size] || 'text-sm px-4 py-2 min-h-[40px]';

  return (
    <button
      type={type}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
