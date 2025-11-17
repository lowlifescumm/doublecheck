# Provably Fair Audit MVP

A minimal, production-ready web application that verifies provably-fair game outcomes for Dice and Crash games. This MVP provides cryptographic verification of game results with a sleek, modern UI and a simple API.

## Features

- ✅ **Dice Game Verification** - Verify dice outcomes (0.00-99.99)
- ✅ **Crash Game Verification** - Verify crash multipliers using inverse mapping
- ✅ **Server Seed Hash Verification** - Cryptographically verify server seed integrity
- ✅ **Expected Result Comparison** - Compare computed results with expected outcomes
- ✅ **Modern React UI** - Sleek, Apple-like interface built with React + Vite
- ✅ **RESTful API** - Simple JSON API for programmatic access
- ✅ **Security** - Rate limiting, input validation, no plaintext seed logging
- ✅ **Comprehensive Tests** - Unit tests with multiple test vectors

## Tech Stack

- **Backend**: Node.js 18+ with TypeScript, Express
- **Frontend**: React 18 with Vite
- **Testing**: Jest with TypeScript support
- **Deployment**: Render Web Service

## Project Structure

```
/
├── server/              # Backend API
│   ├── src/
│   │   ├── api/        # Express routes
│   │   ├── lib/        # Core algorithms
│   │   └── middleware/ # Rate limiting
│   ├── tests/          # Unit tests
│   └── package.json
├── client/             # Frontend React app
│   ├── src/
│   │   ├── components/
│   │   └── App.tsx
│   └── package.json
└── README.md
```

## Local Development

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Backend Setup

```bash
cd server
npm install
npm run build
npm run dev  # Development mode with hot reload
```

The backend will run on `http://localhost:3000`

### Frontend Setup

```bash
cd client
npm install
npm run dev  # Development server with Vite
```

The frontend will run on `http://localhost:5173` (Vite default port)

### Running Tests

```bash
cd server
npm test
```

## API Documentation

### POST /api/verify

Verify a provably-fair game outcome.

**Request Body:**
```json
{
  "game": "dice" | "crash",
  "server_seed": "string",
  "server_seed_hash": "string (optional)",
  "client_seed": "string",
  "nonce": 1,
  "expected_result": 42.37 (optional),
  "expect_strict": false (optional)
}
```

**Response:**
```json
{
  "ok": true,
  "game": "dice",
  "computed_result": 42.37,
  "verdict": "PASS" | "FAIL",
  "details": {
    "used_input": {
      "client_seed": "...",
      "nonce": 1,
      "server_seed_hash": "..."
    },
    "computation_hex": "deadbeef...",
    "notes": "Server seed hash verified successfully"
  }
}
```

### GET /api/status

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Algorithms

### Dice Algorithm

1. Compute `H = SHA256(server_seed + ":" + client_seed + ":" + nonce)`
2. Parse first 8 hex chars as integer: `x = parseInt(H.slice(0, 8), 16)`
3. Result: `(x % 10000) / 100` → yields 0.00-99.99

### Crash Algorithm (Inverse Mapping)

1. Compute `H = SHA256(server_seed + ":" + client_seed + ":" + nonce)`
2. Use first 13 hex chars (52 bits): `x = parseInt(H.slice(0, 13), 16)`
3. Convert to uniform r: `r = x / 2^52`
4. Clamp: `r = Math.min(r, 1 - 1e-12)` to avoid r == 1.0
5. Multiplier: `mult = Math.floor((1 / (1 - r)) * 100) / 100`
6. Apply MAX_MULT cap: `mult = Math.min(mult, MAX_MULT)`

**Bit-width**: 52 bits (first 13 hex characters) - documented in code

## Render Deployment

### Step-by-Step Deployment Instructions

1. **Connect GitHub Repository**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Web Service"
   - Connect your GitHub account if not already connected
   - Select the repository: `lowlifescumm/doublecheck`
   - Choose the branch: `main` (or your deployment branch)

2. **Configure Service Settings**
   - **Name**: `provably-fair-audit` (or your preferred name)
   - **Environment**: `Node`
   - **Region**: Choose closest to your users (Oregon, Frankfurt, Singapore, etc.)
   - **Branch**: `main`

3. **Build & Start Commands**
   - **Build Command**: `cd client && npm ci && npm run build && cd ../server && npm ci && npm run build`
   - **Start Command**: `cd server && npm start`
   - **Root Directory**: Leave empty (or set to repository root)
   
   Note: The build command builds both the frontend (React) and backend (TypeScript) in sequence.

4. **Environment Variables**
   Click "Advanced" → "Add Environment Variable" and add:
   - `NODE_ENV` = `production`
   - `PORT` = `3000` (Render sets this automatically, but good to have)
   - `MAX_MULT` = `10000` (maximum crash multiplier cap)
   - `RATE_LIMIT_PER_MIN` = `60` (API rate limit per IP)

5. **Health Check**
   - **Health Check Path**: `/api/status`
   - Render will automatically ping this endpoint to verify service health

6. **Auto-Deploy**
   - Enable "Auto-Deploy" to automatically deploy on every push to `main`
   - Or disable for manual deployments only

7. **Deploy**
   - Click "Create Web Service"
   - Render will build and deploy your application
   - Wait for the build to complete (usually 2-5 minutes)
   - Your service will be available at `https://your-service-name.onrender.com`

### Alternative: Docker Deployment

If you prefer Docker deployment:

1. Render will automatically detect the `Dockerfile` in the `server/` directory
2. Select "Docker" as the environment type
3. Render will build using the Dockerfile
4. No need to specify build/start commands (handled by Dockerfile)

### Post-Deployment

1. **Verify Health Check**
   - Visit `https://your-service-name.onrender.com/api/status`
   - Should return `{"status":"ok","timestamp":"..."}`

2. **Test API**
   - Use the frontend at your Render URL
   - Or test with curl:
   ```bash
   curl -X POST https://your-service-name.onrender.com/api/verify \
     -H "Content-Type: application/json" \
     -d '{
       "game": "dice",
       "server_seed": "test",
       "client_seed": "test",
       "nonce": 1
     }'
   ```

3. **Monitor Logs**
   - View logs in Render dashboard
   - Check for any errors or warnings
   - Verify rate limiting is working

### Troubleshooting

- **Build Fails**: Check that all dependencies are in `package.json`
- **Service Won't Start**: Verify PORT environment variable is set
- **Health Check Fails**: Ensure `/api/status` endpoint is accessible
- **Rate Limiting Issues**: Adjust `RATE_LIMIT_PER_MIN` if needed

## Security & Privacy

- ✅ **No Plaintext Logging**: Server seeds are never logged in plaintext
- ✅ **Rate Limiting**: IP-based rate limiting (60 req/min default)
- ✅ **Input Validation**: All inputs are validated and sanitized
- ✅ **Hash Verification**: Server seed hashes are cryptographically verified
- ✅ **Request Size Limits**: Request bodies limited to 10KB

## Testing

Run the test suite:

```bash
cd server
npm test
```

The test suite includes:
- 4+ test vectors for Dice algorithm
- 5+ test vectors for Crash algorithm
- Server seed hash verification tests
- Result comparison tests (tolerant and strict)
- Integration tests

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `3000` | Server port |
| `MAX_MULT` | `10000` | Maximum crash multiplier |
| `RATE_LIMIT_PER_MIN` | `60` | API rate limit per IP |

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.

