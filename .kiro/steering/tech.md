# Technology Stack

## Core Framework
- **NestJS 11** - Progressive Node.js framework
- **TypeScript 5.9** - Type-safe JavaScript
- **Node.js** - Runtime environment

## Database & ORM
- **PostgreSQL** - Primary database
- **TypeORM 0.3** - ORM with migration support
- **Redis** - Caching and job queue backend

## Authentication & Authorization
- **Passport** - Authentication middleware
- **JWT** - Token-based authentication with refresh tokens
- **CASL** - Policy-based authorization
- **bcrypt** - Password hashing

## Performance & Caching
- **Redis (ioredis)** - Caching layer
- **BullMQ** - Background job processing
- **@nestjs/throttler** - Rate limiting
- **compression** - Gzip compression

## Observability
- **nestjs-pino** - Structured JSON logging
- **@nestjs/terminus** - Health checks
- **prom-client** - Prometheus metrics
- **Swagger** - API documentation (dev only)

## Validation & Configuration
- **Zod** - Schema validation for environment variables
- **class-validator** - DTO validation
- **class-transformer** - Object transformation

## Additional Features
- **nestjs-cls** - Request-scoped context
- **nestjs-i18n** - Internationalization
- **helmet** - Security headers
- **multer / multer-s3** - File uploads
- **opossum** - Circuit breaker pattern (industry standard)
- **@nestjs/schedule** - Cron jobs
- **@nestjs/event-emitter** - Event-driven architecture

## Development Tools
- **Jest** - Testing framework
- **ESLint** - Linting with TypeScript support
- **Prettier** - Code formatting
- **Docker & Docker Compose** - Containerization

## Common Commands

### Development
```bash
npm run start:dev          # Start in watch mode
npm run start:debug        # Start with debugger
npm run build              # Build for production
npm run start:prod         # Run production build
```

### Testing
```bash
npm test                   # Run unit tests
npm run test:watch         # Run tests in watch mode
npm run test:cov           # Run tests with coverage
npm run test:e2e           # Run end-to-end tests
```

### Database
```bash
npm run migration:generate # Generate migration from entities
npm run migration:run      # Run pending migrations
npm run seed               # Seed database with initial data
```

### Code Quality
```bash
npm run lint               # Lint and fix code
npm run format             # Format code with Prettier
```

### Docker
```bash
docker-compose up --build  # Start all services
docker-compose down        # Stop all services
```

## Build System
- **NestJS CLI** - Project scaffolding and build
- **TypeScript Compiler** - Transpilation to JavaScript
- **Multi-stage Dockerfile** - Optimized production builds
