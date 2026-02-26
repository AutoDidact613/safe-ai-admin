# Project Monorepo (Client + Server)

Monorepo containing:
- **client/**: React + Vite + TypeScript
- **server/**: Node.js + Express + TypeScript

## Repository Structure

```
/
├─ client/
├─ server/
└─ .github/
   └─ workflows/
```

## Prerequisites
- Node.js **18+** (recommended 20)
- npm (or your chosen package manager)

## Setup

### 1) Install dependencies

**Client**
```bash
cd client
npm install
```

**Server**
```bash
cd ../server
npm install
```

## Run locally

### Client (Vite dev server)
```bash
cd client
npm run dev
```

### Server (Express)
```bash
cd server
npm start
```

> Note: If you want the client to call the server locally, set the API base URL in the client env file (see below).

## Environment Variables

Create env files locally (not committed).  
We keep an example file in the repo:

- `client/.env.example`
- `server/.env.example`

### Suggested env keys

**client**
- `VITE_API_URL=http://localhost:3000`

**server**
- `PORT=3000`

## Workflow (Team)

### Branching
- `main` is protected (no direct pushes)
- Work is done on `feature/<name>` branches

### Pull Requests
- Every change goes through a PR
- CI must pass before merge
- Resolve conflicts in your feature branch before opening/merging PR

## CI (planned / required)
CI runs on Pull Requests and should include:
- install dependencies
- build client + server
- run tests (when added)

## Contributing
1. Create a feature branch from `main`
2. Commit changes with clear messages
3. Open a Pull Request
4. Address review comments and CI failures
5. Merge after approval

## License
Add a license file if needed.


 cd '/var/www/ai613/console'