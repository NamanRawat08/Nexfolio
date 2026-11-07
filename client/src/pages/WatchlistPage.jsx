import React from 'react';
import { PageHeader } from './PageHeader.jsx';
import { WatchlistCard } from '../features/dashboard/WatchlistCard.jsx';

/** The watchlist on its own page. */
export function WatchlistPage() {
  return (
    <>
      <PageHeader
        title="Watchlist"
        description="Instruments you are keeping an eye on. Use the search box to find more and tap the star to save them."
      />
      <WatchlistCard />
    </>
  );
}
