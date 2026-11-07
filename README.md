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

## Dashboard Data, Pages and Theme

### Live Dashboard Data
Once signed in, the dashboard loads `GET /api/portfolio/summary`, `/api/holdings` and `/api/orders` through `PortfolioProvider`/`usePortfolio` (`client/src/context/PortfolioContext.jsx`) and refreshes them after each trade. The wallet cards, the new Holdings card and Recent Orders show real data. **Buy** and **Sell** (in the hero card at the top of the dashboard) open a modal (`features/trading/TradeDialog.jsx`) that places a simulated market order; the total shown in the dialog is an estimate, and the server fills at the latest close. The Portfolio Value chart and Monthly Performance chart load `GET /api/portfolio/history` and `GET /api/portfolio/performance`; nothing on the dashboard uses sample data any more.

#### How portfolio history is computed
The server replays the user's orders over the market calendar (the last 366 trading dates in `price_history`): value on a date = cash + Σ shares × that day's close. Starting cash is reconstructed from the current balance and the order log. If prices have not been advanced to the day an order was placed (see `npm run market:advance`), that order is applied on the last price date; the final point therefore always equals the current portfolio value. History is flat until prices move after you trade, and an order's own fill price is its price at the time, so the day of a trade can show a small step if the market moved since the last close. Monthly `invested` is the value of holdings at month end and `returns` is the change in total value over the month (there are no deposits or withdrawals).

### Pages, Navigation and Theme
The navigation items are real pages, chosen by the URL hash (`#dashboard`, `#portfolio`, `#orders`, `#watchlist`, `#settings`) through `useHashRoute`, so links, the back button and bookmarks work without a router library. Unknown hashes fall back to the dashboard.
- **Dashboard**: the overview (charts, balances, holdings, watchlist, open and recent orders).
- **Portfolio**: key numbers (total, invested, available cash, unrealized and day P&L), the value chart, holdings and an allocation breakdown by sector and cash.
- **Orders**: the complete order history with All / Open / Filled / Cancelled filters, "Show more" paging, cancel for open orders, and profit or loss on sells.
- **Watchlist**: the watchlist card on its own page.
- **Settings**: theme (match device, light or dark), account details, change password and sign out.

The theme is applied by `ThemeContext` as `<html data-theme>`; `index.css` overrides the same design tokens for light, so no component has theme-specific code. The choice is saved in `localStorage` and a small script in `index.html` applies it before the app loads (no flash). The header button toggles light and dark; Settings also offers "Match my device". Both palettes keep WCAG AA text contrast (see the notes in `index.css`).

**Colour roles** are kept separate so a colour always means one thing:
- **accent** (amber): brand and primary actions only: the logo, the active navigation item, main buttons and focus rings.
- **gain / loss** (green / red): money going up or down: P&L figures and the portfolio chart, whose line and fill turn green or red with the period's result.
- **buy / sell** (blue / red): the trading actions and the BUY / SELL badges, so an action never reads as a profit or loss.
- **info** (blue): neutral data series such as invested value and allocation bars.

Cards are lifted off the page and given a visible border so sections read as separate blocks. The dashboard starts with a hero card (total portfolio value, change versus the previous close, and the Buy and Sell buttons); the chart shows the change over the selected period.

### Notifications
The bell in the header shows an unread badge and a dropdown with your notifications. Today the only kind is **Limit order filled**, created by the order matcher in the same transaction that fills the order (so you never get one without the other, and re-running the matcher never duplicates it). The client refreshes the count on load, every minute and when the window regains focus; "Mark all as read" clears the badge. Amounts in notification text use Indian digit grouping (₹1,00,000.00).

### Search and Watchlist
The header search (desktop) and the search button (mobile, opens a bar under the header) call `GET /api/instruments?search=` after a 250 ms pause and match on symbol or company name. Each result has a **Buy** button (opens the trade dialog with that instrument preselected) and a star that adds or removes it from the watchlist. The Watchlist card on the dashboard lists saved instruments with the latest price and day change, plus Buy and star buttons. State lives in `WatchlistProvider`/`useWatchlist` (`client/src/context/WatchlistContext.jsx`).

### Authentication in the Client
Anonymous visitors see a sign-in / create-account screen; the dashboard renders only after `GET /api/auth/me` succeeds. Form problems are explained in plain language (for example "Your password is too short. Please use at least 8 characters.") by `features/auth/authMessages.js`, which checks the registration form before it is sent and rewrites the server's technical validation messages. Registering signs the user in straight away (the server's register route does not start a session, so the client calls login next). The header shows the signed-in username with initials and a sign-out button. The session lives in the HTTP-only cookie; the client never handles the token.

### Placeholders
None. Every navigation tab and header control (search, notifications, theme toggle, Buy and Sell) is live.

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
- `0006_create_watchlist_items_table`: Creates `watchlist_items` with primary key `(user_id, instrument_id)` (an instrument appears once per user), cascade deletes, and an index for newest-first listing.
- `0007_add_limit_orders`: Adds `order_type` (`MARKET`/`LIMIT`), `status` (`PENDING`/`FILLED`/`CANCELLED`), `limit_price_paise`, `placed_price_date`, `executed_on` and `updated_at` to `orders`. `price_paise` and `total_paise` become nullable (a CHECK keeps filled orders complete). Existing rows become filled market orders with `executed_on` set from their creation date. `down` deletes pending and cancelled orders.
- `0008_create_notifications_table`: Creates `notifications` (`user_id`, `order_id`, `kind` `ORDER_FILLED`, plain-text `title` and `body`, `read_at`) with `UNIQUE (order_id, kind)` so an order notifies at most once, cascade deletes, and indexes for newest-first and unread lookups.

### 6. Seed Market Data
To populate the database with initial instruments and deterministic historical closing prices:
```bash
cd server && npm run seed
```
- Populates exactly 18 Indian large-cap instruments (`instrumentsData`) and generates one close per calendar day from `2025-10-26` (`MARKET_START_DATE`) through today (UTC) via a deterministic Mulberry32 PRNG. Each series is a random walk from that start date, so extending it never changes earlier prices.
- Runs inside a single transaction (`BEGIN` / `COMMIT`, rolling back on error).
- Idempotent: uses `ON CONFLICT ((upper(symbol))) DO NOTHING` for instruments and `ON CONFLICT (instrument_id, trade_date) DO NOTHING` for price history.
- The seed script strictly refuses to run when `NODE_ENV === 'production'`.

### 7. Advance Prices
Prices stop at the day you last seeded. To add the days since then (up to today, UTC):
```bash
cd server && npm run market:advance
```
- Appends only dates after each instrument's latest stored date; existing prices are never changed, so it is safe to run repeatedly (a second run adds 0 rows).
- Deterministic: the new closes are exactly what a fresh `npm run seed` would produce for those dates.
- One transaction; refuses an end date in the future. It has no production guard because it is append-only and a simulated market needs to keep moving. Run it once a day (for example from cron) to keep the market current.
- Orders fill at the latest close, so run it before trading if you want today's price.
- It also fills any pending limit orders whose price has been reached (see Limit Orders).

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Express server liveness check. Returns `{ status, service, timestamp }`. |
| GET | `/api/health/db` | Database connectivity check. Returns `{ status, database, timestamp }` on success, or `503 DB_UNAVAILABLE` on failure or timeout (2 s). |
| POST | `/api/auth/register` | User registration. Validates email, username, and password (8–72 bytes). Returns `201 { user: { id, email, username, createdAt } }`. Does not set cookie. Rate limited (10 req / 15 min). |
| POST | `/api/auth/login` | User authentication via email or username. Returns `200 { user: { id, email, username } }`. Sets `nexfolio_token` HTTP-only cookie. Token never appears in body. Rate limited (10 req / 15 min). |
| POST | `/api/auth/change-password` | Change the signed-in user's password. Requires auth. Body: `{ currentPassword, newPassword }` (new password 8–72 bytes). Signs out every other session (token version bump) and sets a fresh `nexfolio_token` cookie for this one; the token is never in the body. Rate limited together with login and register. Returns `200 { success: true }`; `400 INVALID_CURRENT_PASSWORD` (400, not 401, so the client is not signed out), `400 PASSWORD_UNCHANGED`, `400 VALIDATION_ERROR`. |
| POST | `/api/auth/logout` | User logout. Requires auth. Increments token version in DB to invalidate existing sessions and clears `nexfolio_token` cookie. Returns `204` No Content. |
| GET | `/api/auth/me` | Current user profile. Requires auth via `nexfolio_token` cookie. Returns `200 { user: { id, email, username, createdAt } }`. |
| GET | `/api/instruments` | List instruments with latest and previous close (prices as decimal strings). Requires auth. Query: `search` (max 50 chars, matches symbol or name), `limit` (1–100, default 50), `offset` (default 0). Returns `200 { instruments: [...] }`. Invalid query returns `400 INVALID_QUERY`. |
| GET | `/api/instruments/:symbol` | Single instrument (case-insensitive symbol). Requires auth. Returns `200 { instrument }`, `400 INVALID_SYMBOL`, or `404 INSTRUMENT_NOT_FOUND`. |
| GET | `/api/instruments/:symbol/history` | Daily close prices. Requires auth. Query: `range` = `1M`, `3M`, `6M` or `1Y` (default `1Y`). Returns `200 { symbol, range, history: [{ date, close }] }`, or `400 INVALID_RANGE` / `404 INSTRUMENT_NOT_FOUND`. |
| GET | `/api/wallet` | Signed-in user's simulated cash. Requires auth. Returns `200 { wallet: { cashPaise, cash, currency } }` (`cashPaise` is an integer string, `cash` is rupees with 2 decimals, currency `INR`). New users start with ₹10,00,000. |
| GET | `/api/notifications` | The signed-in user's notifications, newest first, plus `unreadCount`. Requires auth. Query: `limit` (1–50, default 20). Returns `200 { notifications, unreadCount }`. |
| POST | `/api/notifications/read-all` | Mark all of the user's notifications as read. Requires auth. Returns `200 { unreadCount: 0 }`. |
| GET | `/api/watchlist` | The signed-in user's watched instruments, newest first, with latest and previous close, `change` (rupees) and `changePercent` (decimal ratio). Requires auth. Returns `200 { watchlist }`. |
| PUT | `/api/watchlist/:symbol` | Add an instrument (case-insensitive symbol). Requires auth. Safe to repeat: `201` when added, `200` if already watched. Errors: `400 INVALID_SYMBOL`, `404 INSTRUMENT_NOT_FOUND`, `409 WATCHLIST_FULL` (limit 50). |
| DELETE | `/api/watchlist/:symbol` | Remove an instrument. Requires auth. Returns `204`, also when it was not on the list. |
| GET | `/api/portfolio/summary` | Cash, `reservedCash` and `availableCash` (cash set aside for pending limit buys), invested value (latest close), cost basis, total value, unrealized P&L and day P&L (latest close vs the one before). Requires auth. Amounts in paise and rupees; `dayPnlRatio` is a decimal ratio for display. Returns `200 { summary }`. |
| GET | `/api/portfolio/history` | Portfolio value over time. Requires auth. Query: `range` = `1M`, `3M`, `6M` or `1Y` (default `6M`). Returns `200 { history: { rangeLabel, startValue, currentValue, changeAmount, changePercent, startDate, endDate, points: [{ date, value }] } }`; `400 INVALID_RANGE` on a bad range. |
| GET | `/api/portfolio/performance` | Last 12 months: `invested` (holdings value at month end) and `returns` (change in total value). Requires auth. Returns `200 { performance: { asOf, months: [{ month, invested, returns }] } }`. |
| POST | `/api/orders` | Place a simulated order. Requires auth. Body: `{ symbol, side: "BUY"\|"SELL", quantity, orderType?: "MARKET"\|"LIMIT", limitPrice? }` (`quantity` a whole number, 1–1,000,000; `limitPrice` a rupee string with at most 2 decimals, required for `LIMIT`). A market order, or a limit order the latest close already satisfies, fills at once at the latest close (`order.status` `FILLED`). Any other limit order is saved as `PENDING` and reserves cash or shares. Returns `201 { order, wallet }`. Errors: `400 VALIDATION_ERROR`, `404 INSTRUMENT_NOT_FOUND`, `409 NO_PRICE_AVAILABLE`, `409 TOO_MANY_PENDING_ORDERS` (limit 20), `422 INSUFFICIENT_FUNDS`, `422 INSUFFICIENT_HOLDINGS`. |
| DELETE | `/api/orders/:id` | Cancel one of your open (`PENDING`) limit orders, releasing what it reserved. Requires auth. Returns `200 { order }`; `404 ORDER_NOT_FOUND` (also for other users' orders), `409 ORDER_NOT_PENDING`, `400 INVALID_ORDER_ID`. |
| GET | `/api/orders` | The signed-in user's orders, newest first. Requires auth. Query: `limit` (1–100, default 50), `offset`, `status` (`PENDING`, `FILLED` or `CANCELLED`). Returns `200 { orders }` with amounts in paise and rupees; `realizedPnl*` is set on filled sells only, and `price`/`total` are `null` until an order fills. |
| GET | `/api/holdings` | Current positions with quantity, average cost, last price, value and unrealized P&L. Requires auth. Returns `200 { holdings }`. |

### Trading Rules
- Market orders fill instantly at the latest close in `price_history`; limit orders are described under Limit Orders.
- Each order runs in one database transaction that first locks the user's wallet row, so a user's orders apply one at a time. Cash, holdings and the order log always change together, and concurrent orders cannot overspend.
- Cost basis is tracked per position. A sell removes cost pro rata (rounded down) and records realized P&L; selling the whole position uses the exact remaining cost.
- Shares are whole numbers and money is integer paise (BigInt in code); there is no short selling and no margin.

### Limit Orders
- **Placing:** a limit BUY fills at once if the latest close is at or below your limit; a limit SELL if it is at or above. The fill price is the latest close (never worse than your limit). Otherwise the order is saved as `PENDING`.
- **Reservations:** a pending BUY sets aside `limit price × quantity` of cash and a pending SELL sets aside its shares, so cash and shares cannot be promised twice. Market orders and new limit orders can only use what is not reserved. `availableCash` on the summary is cash minus reservations; total portfolio value is unchanged.
- **Filling:** prices only change when `npm run market:advance` adds new days, and that command now ends by running the matcher. For every pending order the matcher finds the first daily close after the one known when the order was placed that satisfies the limit, and fills the order at that close, on that date. You can run it on its own with `cd server && npm run orders:match`. It is safe to repeat and to run while the server is handling orders (each order is matched in its own transaction that locks the wallet first, like the order service).
- **Cancelling:** `DELETE /api/orders/:id`, or the Cancel button on the Open Orders card.
- Orders are good until filled or cancelled (no expiry); at most 20 can be open at once. Portfolio history replays an order on the date it executed.

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

Current status: a working paper-trading simulator. Users register, sign in, receive ₹10,00,000 of simulated cash, buy and sell seeded Indian equities at the latest close, and see live balances, holdings, orders and portfolio history on the dashboard.
- **Implemented**: Express 5 server with health checks, PostgreSQL pooling and migrations (users, instruments, price history, wallets, holdings, orders with limit support, watchlist, notifications), HTTP-only cookie authentication with in-memory rate limiting, instrument and price-history endpoints, atomic market and limit orders with a matching job, holdings, portfolio summary/history/performance endpoints, a per-user watchlist, a React client with sign-in/registration, change password, hash-routed pages (Dashboard, Portfolio, Orders, Watchlist, Settings), a light and dark theme, in-app notifications, dual desktop/mobile layouts, a Buy/Sell dialog (market or limit), an Open Orders card, instrument search, a watchlist card and Recharts visualizations driven by live data.
- **Not Implemented**: Real money trading, brokerage integration, exchange APIs, stop orders, order expiry, partial fills, short selling and margin, email or push notifications (notifications appear in the app only), an automatic daily price job (run `npm run market:advance` yourself or from cron), and client component and end-to-end tests (only the auth message helpers have unit tests, run with `cd client && npm test`).
