# Server

Backend server for SafeAI-613 project.

## Development

### Prerequisites
- Node.js 20+
- npm

### Installation
```bash
npm install
```

### Running the Server
```bash
# Development mode with hot reload
npm run dev

# Production build and run
npm run prod
```

## Testing

### Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests
- Place test files in `__tests__` directories or name them `*.test.ts` or `*.spec.ts`
- Tests are run using Jest with TypeScript support
- Example test location: `src/utils/__tests__/validation.test.ts`

## Code Quality

### Linting
```bash
# Run ESLint
npm run lint
```

### Type Checking
```bash
# Run TypeScript type checking
npm run typecheck
```

### Build
```bash
# Compile TypeScript to JavaScript
npm run build
```

## CI/CD

GitHub Actions automatically runs the following checks on pull requests and pushes to main:
- ESLint
- TypeScript type checking
- Jest tests
- Build verification

See `.github/workflows/quality.yml` for the full CI configuration.
