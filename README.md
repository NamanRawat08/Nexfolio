# Nexfolio

Nexfolio is a full-stack stock trading simulation platform designed for learning, testing, and paper trading strategies using simulated or sample market data. The platform involves no real money and has no brokerage integrations, providing a risk-free environment for simulated portfolio management and market observation.

## Tech Stack

- **Frontend**: React (JavaScript), Vite
- **Backend**: Node.js, Express (ES Modules)
- **Database**: PostgreSQL (planned; not yet integrated)
- **Tooling**: Concurrently, dotenv, helmet, cors, morgan

## Prerequisites

- **Node.js**: v20+ (developed on v24.19.0)
- **npm**: v10+ (developed on 11.17.0)
- **Git**: v2+

## Project Structure

```
nexfolio/
  client/                 # Vite React application
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

Phase 1 (Project Foundation) is currently implemented. The repository contains the modular Express backend structure, health check endpoint (`/api/health`), centralized error handling, environment validation, and the Vite React frontend with proxy configuration and health status monitoring. Authentication, database connectivity, real-time market data, and trading simulation features have not been implemented yet.
# Nexfolio
