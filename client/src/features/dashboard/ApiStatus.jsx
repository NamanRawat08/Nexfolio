import React from 'react';
import { useHealthCheck } from '../../hooks/useHealthCheck.js';

/**
 * Health check status indicator component.
 *
 * @param {object} props
 * @param {boolean} [props.showLabel] - Whether to show the text label alongside the status dot
 * @param {string} [props.className]
 */
export function ApiStatus({ showLabel = true, className = '' }) {
  const { status } = useHealthCheck();

  const config = {
    checking: {
      color: 'bg-accent animate-pulse',
      label: 'Checking API...',
      title: 'Health check in progress',
    },
    online: {
      color: 'bg-gain',
      label: 'API online',
      title: 'Backend Express server connected',
    },
    unreachable: {
      color: 'bg-loss',
      label: 'API unreachable',
      title: 'Backend server not responding on /api/health',
    },
  }[status] || {
    color: 'bg-muted',
    label: 'Checking...',
    title: 'Health check status',
  };

  return (
    <div
      className={`inline-flex items-center gap-2 select-none ${className}`}
      title={config.title}
    >
      <span
        aria-hidden="true"
        className={`w-2 h-2 rounded-full flex-shrink-0 ${config.color}`}
      />
      {showLabel && (
        <span className="text-xs text-muted truncate">{config.label}</span>
      )}
    </div>
  );
}
