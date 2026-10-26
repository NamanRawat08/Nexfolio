# Nexfolio

Nexfolio is a full-stack stock trading simulation platform designed for learning, testing, and paper trading strategies using simulated market data. The platform involves no real money and has no brokerage integrations, providing a risk-free environment for simulated portfolio management and market observation.

## Tech Stack

- **Frontend**: React 19 (JavaScript), Vite 6 / 8, Tailwind CSS v4 (`@tailwindcss/vite`), Recharts, Lucide React
- **Backend**: Node.js, Express 5 (ES Modules)
- **Database**: PostgreSQL (planned; not yet integrated)
- **Tooling**: Concurrently, dotenv, helmet, cors, morgan, oxlint

## Prerequisites

- **Node.js**: v20+ (developed on v24.19.0)
- **npm**: v10+ (developed on 11.17.0)
- **Git**: v2+

## Project Structure

```
nexfolio/
  client/                 # Vite React application
    src/
      components/
        ui/               # Reusable UI primitives (Card, Button, SegmentedControl, Avatar, Skeleton, Badge)
      data/               # Static simulated sample data (mockDashboardData.js)
      features/
        dashboard/        # Layout-agnostic dashboard widgets (PortfolioChart, WalletCards, MonthlyPerformanceChart, RecentOrders, ApiStatus)
      hooks/              # Custom hooks (useMediaQuery, useHealthCheck)
      layouts/            # Viewport-specific shells (DesktopLayout, MobileLayout)
      utils/              # Formatting helpers and chart data adapters (format.js)
      App.jsx             # Root component switching layout via useMediaQuery
      index.css           # Tailwind v4 theme tokens and global base styles
      main.jsx            # React root mount entrypoint
    vite.config.js        # Vite config with React and Tailwind CSS v4 plugins
    package.json          # Frontend dependencies and scripts
  server/
    src/
      config/             # Environment loading and startup validation
      routes/             # API route definitions
      controllers/        # Request handlers
      services/           # Business logic layer
      middleware/         # 404 handler and centralized error middleware
      utils/              # Shared helper functions
      app.js              # Express application assembly (no listen call)
      server.js           # Server entrypoint and port listener
    .env.example          # Environment variable template with comments
    package.json          # Backend dependencies and scripts
  .gitignore              # Global git ignore configuration
  package.json            # Root workspace scripts and dev tooling
  README.md               # Project documentation
```

## Responsive Layout Architecture

Nexfolio uses a clean dual-layout architecture chosen dynamically by viewport width:
- **Breakpoint**: `1024px` (`(min-width: 1024px)`)
- **Hook**: `useMediaQuery` powered by `useSyncExternalStore` for flash-free hydration and layout switching.
- **Desktop Layout (>= 1024px)**: Features a collapsible icon rail sidebar (with state persisted to `localStorage`), top navigation header with simulated data badge, and a 12-column dashboard grid.
- **Mobile Layout (< 1024px)**: Features a compact sticky header, single-column widget stack, horizontal snap carousel for wallet cards, modal search dialog, and fixed bottom tab navigation with safe-area padding.
- **Zero DOM Duplication**: Unlike CSS-based `hidden lg:block` toggling, only one layout shell is mounted in the DOM at any given time. Shared section components remain layout-agnostic, accepting a `compact` prop for sizing adjustments.

## Static Sample Data & UI Placeholders

- **Sample Data**: All figures shown on the dashboard originate from `client/src/data/mockDashboardData.js`. These are deterministic, simulated sample data points with monetary values modeled as strings (mirroring PostgreSQL `NUMERIC` data types to prevent floating-point inaccuracies).
- **Controls & Actions**: Interactive navigation items (Portfolio, Orders, Watchlist, Settings), global search, workspace switcher, notification triggers, and Buy/Sell buttons are styled visual placeholders (`aria-disabled="true"` with informative tooltip titles) awaiting future route and backend integration.

## Environment Variables

The server requires specific environment variables defined in `server/.env`. Use `server/.env.example` as a template:

| Variable | Description | Required | Default |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Application environment (`development`, `production`, `test`) | No | `development` |
| `PORT` | Port number on which the Express server listens | No | `5001` |
| `CLIENT_ORIGIN` | Allowed client origin for CORS restrictions | No | `http://localhost:5173` |

## Setup Steps

1. Clone or open the repository.
2. Install all root, server, and client dependencies:
   ```bash
   npm run install:all
   ```
3. Create local server environment configuration:
   ```bash
   cp server/.env.example server/.env
   ```

## How to Run in Development

To start both the client and server concurrently:
```bash
npm run dev
```

Alternatively, you can run services individually:
- Start backend server:
  ```bash
  npm run dev:server
  ```
- Start frontend client:
  ```bash
  npm run dev:client
  ```

Once running:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5001`
- Backend Health Check: `http://localhost:5001/api/health`

## Status

Phase 1 (Project Foundation & Dashboard UI Shell) is complete:
- Express 5 backend with health check API (`/api/health`), centralized error handling, and security headers.
- Vite React client with Tailwind CSS v4 design tokens, WCAG AA compliance, and dark theme.
- Responsive dual layout architecture with Recharts visual charts, simulated wallet metrics, order history, and live API connectivity indicator.
- Authentication, real exchange connectivity, database persistence, and order placement engines are not yet implemented.
