import React from 'react';

/** Title block shown at the top of every page except the dashboard. */
export function PageHeader({ title, description }) {
  return (
    <div>
      <h1 className="text-xl font-extrabold tracking-tight text-fg">{title}</h1>
      {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
    </div>
  );
}
