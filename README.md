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
      api/
        auth.js           # Fetch wrapper for /api/auth (cookie session, typed ApiError)
      context/
        AuthContext.jsx   # AuthProvider/useAuth: loading, authenticated or anonymous state
      features/
        auth/
          AuthPage.jsx    # Sign-in / create-account screen for anonymous visitors
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

### Authentication in the Client
Anonymous visitors see a sign-in / create-account screen; the dashboard renders only after `GET /api/auth/me` succeeds. Registering signs the user in straight away (the server's register route does not start a session, so the client calls login next). The header shows the signed-in username with initials and a sign-out button. The session lives in the HTTP-only cookie; the client never handles the token. The dashboard data itself is still sample data.

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
The server requires `DATABASE_URL` (e.g. `postgresql://USER:PASSWORD@localhost:5432/DBNAME`) and `JWT_SECRET` (at least 32 characters long) to be configured in `server/.env` before starting.

The user must generate `JWT_SECRET` themselves (e.g. using Node's crypto module) and never commit it:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

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
To run backend tests using Node.js built-in test runner (tests do not require a running database or `server/.env`):
```bash
cd server && npm test
```

### 5. Run Database Migrations
Migrations are managed with [node-pg-migrate](https://salsita.github.io/node-pg-migrate/). The user runs migrations manually — the server does not auto-migrate.

Set up `server/.env` with a valid `DATABASE_URL` first (see `server/.env.example`), then from the `server/` directory:

```bash
# Apply all pending migrations
npm run migrate:up

# Roll back the most recent migration
npm run migrate:down

# Create a new migration file
npm run migrate:create <migration_name>
```

Migrations live in `server/migrations/`:
- `0001_create_users_table`: Creates `users` table with `id`, `email`, `username`, `password_hash`, `token_version`, `created_at`, and `updated_at` columns, along with case-insensitive unique indexes on `lower(email)` and `lower(username)`.
- `0002_create_instruments_table`: Creates `instruments` table with `id`, `symbol`, `name`, `sector`, and `created_at` columns, symbol/name check constraints, and a unique expression index on `upper(symbol)`.
- `0003_create_price_history_table`: Creates `price_history` table with composite primary key `(instrument_id, trade_date)` and foreign key referencing `instruments(id) ON DELETE CASCADE`, tracking daily `close_price` (`NUMERIC(12,2) > 0`).
- `0004_create_wallets_table`: Creates `wallets` (one row per user, `cash_paise BIGINT >= 0`, cascade delete). A trigger on `users` gives every new user a wallet with 1,00,00,000 paise (₹10,00,000) in the same transaction as the user insert; existing users are backfilled.
- `0005_create_holdings_and_orders_tables`: Creates `holdings` (one row per user and instrument while quantity > 0, with `quantity` and `total_cost_paise`) and `orders` (immutable log of `BUY`/`SELL` fills with `quantity`, `price_paise`, `total_paise` and `realized_pnl_paise` on sells). All amounts are integer paise.

### 6. Seed Market Data
To populate the database with initial instruments and deterministic historical closing prices:
```bash
cd server && npm run seed
```
- Populates exactly 18 Indian large-cap instruments (`instrumentsData`) and generates 366 consecutive calendar days of closing prices ending `2026-10-26` via a deterministic Mulberry32 PRNG.
- Runs inside a single transaction (`BEGIN` / `COMMIT`, rolling back on error).
- Idempotent: uses `ON CONFLICT ((upper(symbol))) DO NOTHING` for instruments and `ON CONFLICT (instrument_id, trade_date) DO NOTHING` for price history.
- The seed script strictly refuses to run when `NODE_ENV === 'production'`.

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Express server liveness check. Returns `{ status, service, timestamp }`. |
| GET | `/api/health/db` | Database connectivity check. Returns `{ status, database, timestamp }` on success, or `503 DB_UNAVAILABLE` on failure or timeout (2 s). |
| POST | `/api/auth/register` | User registration. Validates email, username, and password (8–72 bytes). Returns `201 { user: { id, email, username, createdAt } }`. Does not set cookie. Rate limited (10 req / 15 min). |
| POST | `/api/auth/login` | User authentication via email or username. Returns `200 { user: { id, email, username } }`. Sets `nexfolio_token` HTTP-only cookie. Token never appears in body. Rate limited (10 req / 15 min). |
| POST | `/api/auth/logout` | User logout. Requires auth. Increments token version in DB to invalidate existing sessions and clears `nexfolio_token` cookie. Returns `204` No Content. |
| GET | `/api/auth/me` | Current user profile. Requires auth via `nexfolio_token` cookie. Returns `200 { user: { id, email, username, createdAt } }`. |
| GET | `/api/instruments` | List instruments with latest and previous close (prices as decimal strings). Requires auth. Query: `search` (max 50 chars, matches symbol or name), `limit` (1–100, default 50), `offset` (default 0). Returns `200 { instruments: [...] }`. Invalid query returns `400 INVALID_QUERY`. |
| GET | `/api/instruments/:symbol` | Single instrument (case-insensitive symbol). Requires auth. Returns `200 { instrument }`, `400 INVALID_SYMBOL`, or `404 INSTRUMENT_NOT_FOUND`. |
| GET | `/api/instruments/:symbol/history` | Daily close prices. Requires auth. Query: `range` = `1M`, `3M`, `6M` or `1Y` (default `1Y`). Returns `200 { symbol, range, history: [{ date, close }] }`, or `400 INVALID_RANGE` / `404 INSTRUMENT_NOT_FOUND`. |
| GET | `/api/wallet` | Signed-in user's simulated cash. Requires auth. Returns `200 { wallet: { cashPaise, cash, currency } }` (`cashPaise` is an integer string, `cash` is rupees with 2 decimals, currency `INR`). New users start with ₹10,00,000. |
| POST | `/api/orders` | Place a simulated **market** order that fills immediately at the instrument's latest close. Requires auth. Body: `{ symbol, side: "BUY"\|"SELL", quantity }` (`quantity` a whole number, 1–1,000,000). Returns `201 { order, wallet }`. Errors: `400 VALIDATION_ERROR`, `404 INSTRUMENT_NOT_FOUND`, `409 NO_PRICE_AVAILABLE`, `422 INSUFFICIENT_FUNDS`, `422 INSUFFICIENT_HOLDINGS`. |
| GET | `/api/orders` | The signed-in user's orders, newest first. Requires auth. Query: `limit` (1–100, default 50), `offset`. Returns `200 { orders }` with amounts in paise and rupees; `realizedPnl*` is set on sells only. |
| GET | `/api/holdings` | Current positions with quantity, average cost, last price, value and unrealized P&L. Requires auth. Returns `200 { holdings }`. |

### Trading Rules
- Orders are simulated market orders only (no limit orders yet) and fill instantly at the latest close in `price_history`.
- Each order runs in one database transaction that first locks the user's wallet row, so a user's orders apply one at a time. Cash, holdings and the order log always change together, and concurrent orders cannot overspend.
- Cost basis is tracked per position. A sell removes cost pro rata (rounded down) and records realized P&L; selling the whole position uses the exact remaining cost.
- Shares are whole numbers and money is integer paise (BigInt in code); there is no short selling and no margin.

### Authentication & Cookie Behavior

- **Cookie Name**: `nexfolio_token`
- **Cookie Attributes**: `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, `maxAge: 86400000` (24 hours). `secure: true` in production (`secure: false` in development).
- **Session Revocation**: Logout increments `token_version` on the user record; existing JWTs carrying stale `token_version` are rejected immediately on subsequent requests.
- **Timing Equalization**: On login with an unknown email or username, dummy bcrypt verification is performed to equalize execution duration and eliminate timing attack side channels.

### Known Limitations

- **No CSRF Tokens**: Relies on `SameSite: 'lax'` cookie policy.
- **Enumeration**: Registration returns `409 EMAIL_TAKEN` or `409 USERNAME_TAKEN`, revealing whether an email or username exists.
- **No Email Verification**: Accounts are active immediately without email confirmation.
- **No Password Reset**: Password recovery workflows are not implemented.
- **In-Memory Rate Limiting**: Rate limiting uses in-memory tracking per IP address, which resets on server restarts and is not shared across horizontal server instances.
- **Email Lowercased**: Emails are normalized and stored lowercased for case-insensitive lookup.
- **JWT Secret Validation**: `JWT_SECRET` is only validated for minimum character length (32 chars) at startup.
- **Frontend Auth UI**: Backend authentication endpoints are fully implemented; frontend login and registration UI forms are not yet built (the dashboard runs in simulated demo mode).

## Status & Scope Boundaries

Current status: responsive dashboard UI with sample data and backend authentication foundation with PostgreSQL migration.
- **Implemented**: Express 5 server with health checks (`/api/health`, `/api/health/db`), PostgreSQL database connection pooling and migration for `users` table, market data HTTP endpoints (`/api/instruments`), backend authentication HTTP layer (`/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`) with HTTP-only cookies and in-memory rate limiting, dual desktop/mobile layout shells, Recharts visualizations with tooltips and visible keyboard focus rings, and deterministic sample data.
- **Not Implemented**: Real money trading, brokerage integration, exchange APIs, frontend authentication UI/forms, order matching engines.
