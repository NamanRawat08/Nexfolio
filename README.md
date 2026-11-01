# Nexfolio

Nexfolio is a full-stack stock trading simulation platform designed for learning, testing, and paper trading strategies using simulated market data. The platform involves no real money, no real capital at risk, and has no brokerage integrations, providing a risk-free environment for simulated portfolio management and market observation.

## Tech Stack & Versions

Based on `package.json` dependencies:

### Frontend (`client/`)
- **React**: `19.3.1` (with `react-dom` `19.3.1`, `@types/react` `19.3.0`, `@types/react-dom` `19.3.0`)
- **Build Tool**: Vite `8.3.5` (with `@vitejs/plugin-react` `6.1.2`)
- **Styling**: Tailwind CSS `4.3.3` (with `@tailwindcss/vite` `4.3.3`)
- **Charts**: Recharts `3.10.1`
- **Icons**: Lucide React `1.61.0`
- **Linter**: Oxlint `1.89.0`

### Backend (`server/`)
- **Framework**: Express `5.3.0` (ES Modules)
- **Security**: Helmet `8.3.0`, CORS `2.8.6`
- **Logging**: Morgan `1.12.1`
- **Environment**: Dotenv `16.6.1`
- **Runtime**: Node.js v24.19.0 (compatible with v20+)

## Project Structure

```text
nexfolio/
  client/
    public/
      favicon.svg         # SVG favicon with brand mark
    src/
      components/
        ui/               # UI primitives (Avatar, Badge, Button, Card, SegmentedControl, Skeleton)
      config/
        navItems.js       # Centralized navigation item definitions
      data/
        mockDashboardData.js # Deterministic seeded master series and derived ranges/metrics
      features/
        dashboard/        # Layout-agnostic dashboard widgets
          ApiStatus.jsx               # Express health check indicator
          MonthlyPerformanceChart.jsx # Grouped bar chart comparing capital and returns
          PortfolioChart.jsx          # Valuation chart with range selector & mobile tick logic
          RecentOrders.jsx            # Order history list and empty state
          WalletCards.jsx             # Liquid balances, snap carousel, and quick actions
      hooks/
        useHealthCheck.js # Single-fetch health check hook tracking API status on mount
        useMediaQuery.js  # useSyncExternalStore-backed media query listener
      layouts/
        DesktopLayout.jsx # Desktop shell (collapsible sidebar rail, top header, 12-col grid)
        MobileLayout.jsx  # Mobile shell (compact sticky header, bottom navigation bar)
      utils/
        format.js         # Currency, UTC date, month, percentage formatters, and chart adapters
      App.jsx             # Layout selection via useMediaQuery('(min-width: 1024px)')
      index.css           # Tailwind v4 @theme design tokens, accessible focus rings, utilities
      main.jsx            # Application root mount
    index.html            # HTML entrypoint linking favicon.svg
    vite.config.js        # Vite build configuration with React and Tailwind plugins
    package.json          # Client dependencies and npm scripts
  server/
    src/
      config/             # Environment loading and port validation
      controllers/        # Health check controller
      middleware/         # 404 handler and centralized error middleware
      routes/             # Health routes and API router assembly
      services/           # Business logic directory placeholder (.gitkeep)
      utils/              # Utility helpers directory placeholder (.gitkeep)
      app.js              # Express app setup and middleware configuration
      server.js           # Server listen entrypoint
    .env.example          # Environment variable template (PORT, CLIENT_ORIGIN, DATABASE_URL)
    package.json          # Server dependencies and npm scripts
  .gitignore              # Global git ignore configuration
  package.json            # Root workspace scripts (npm run dev, install:all, etc.)
  README.md               # Project documentation
```

## Responsive Layout Architecture

Nexfolio switches between two layouts dynamically based on viewport width:
- **Breakpoint**: `1024px` (`(min-width: 1024px)`)
- **Hook**: `useMediaQuery` powered by `useSyncExternalStore` with module-level store caching to ensure stable subscription identities.
- **Desktop Layout (`>= 1024px`)**:
  - Collapsible icon rail sidebar with persistent state in `localStorage` (`nexfolio_sidebar_collapsed`).
  - Top navigation bar featuring search input, simulated data badge, workspace switcher pill, notification and theme toggle buttons, and user profile.
  - Multi-column dashboard grid.
- **Mobile Layout (`< 1024px`)**:
  - Sticky mobile header with compact branding and simulated mode badge.
  - Horizontally scrollable snap carousel for simulated wallet balances with active dot indicators.
  - Fixed bottom navigation bar with safe-area bottom inset padding.
- **Zero DOM Duplication**: Only one layout shell is mounted at any given time. Shared dashboard widgets accept a `compact` prop to adjust tick density, chart height, and padding.

## Sample Data & Visual Placeholders

### Deterministic Seeded Series
All portfolio figures and time ranges are derived from a single deterministic seeded master series (`masterPortfolioSeries` in `mockDashboardData.js`):
- Master series spans 366 daily points ending at sample date `2026-10-26`.
- Ranges (`1Y`, `6M`, `3M`, `1M`) are exact slices of this master series.
- Day P&L is calculated directly from the change between the last two daily points (`-₹1,798.90` / `-0.14%`).
- Monthly performance returns (12 buckets from `2025-11` to `2026-10`) are derived from month-end valuation delta in the master series.
- All financial calculations are done in integer paise arithmetic to avoid floating-point inaccuracies.

### Visual Placeholders & Disabled Controls
The following controls are intentional visual placeholders awaiting future backend and engine integration:
1. **Sidebar / Bottom Navigation Tabs**: `Portfolio`, `Orders`, `Watchlist`, `Settings` (styled with `aria-disabled="true"` and inactive indicators).
2. **Search Inputs**: Desktop search input and mobile search button (both `disabled`).
3. **Notifications**: Bell notification button in header (`disabled`).
4. **Theme Toggle**: Light theme toggle button in desktop header (`disabled`).
5. **Quick Actions**: "Buy" and "Sell" buttons in wallet cards (`disabled` with simulation-only tooltips).

## How to Run in Development

### 1. Prerequisites
- Node.js v20+ (tested on Node v24)
- npm v10+

### 2. Install Dependencies
```bash
npm run install:all
```

### 3. Start Development Servers
The server requires `DATABASE_URL` (e.g. `postgresql://USER:PASSWORD@localhost:5432/DBNAME` from `server/.env.example`) to be configured before starting.

To start both client and server concurrently:
```bash
npm run dev
```

Or run them individually in separate terminals:
- Backend Express server (Port 5001):
  ```bash
  npm run dev:server
  ```
- Frontend Vite client (Port 5173):
  ```bash
  npm run dev:client
  ```

### 4. Run Tests
To run backend tests using Node.js built-in test runner:
```bash
cd server && npm test
```

## Status & Scope Boundaries

Current status: dashboard UI with sample data. No auth, database or trading logic yet.
- **Implemented**: Express 5 server with health check (`/api/health`), Vite React frontend with dark theme design tokens, dual desktop/mobile layout shells, Recharts visualizations with tooltips and visible keyboard focus rings, and deterministic sample data.
- **Not Implemented**: Real money trading, brokerage integration, exchange APIs, user authentication, session persistence, order matching engines, and PostgreSQL database storage.
