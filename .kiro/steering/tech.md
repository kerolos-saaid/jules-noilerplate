---
inclusion: always
---

# Technology Stack & Dependencies

## Core Stack
- **NestJS 11** with TypeScript 5.9
- **PostgreSQL** + TypeORM 0.3 for persistence
- **Redis** (ioredis) for caching and queues
- **Node.js** runtime

## Key Dependencies by Category

**Authentication/Authorization**
- Passport + JWT (with refresh tokens)
- CASL for policy-based authorization
- bcrypt for password hashing

**Validation**
- class-validator + class-transformer for DTOs
- Zod for environment variable schemas (in `src/config/env.schema.ts`)

**Observability**
- nestjs-pino for structured JSON logging
- prom-client for Prometheus metrics (exposed at `/metrics`)
- @nestjs/terminus for health checks (at `/health`)

**Performance/Resilience**
- BullMQ for background jobs
- @nestjs/throttler for rate limiting
- opossum for circuit breaker pattern (use `@WithCircuitBreaker()` decorator)
- compression middleware for gzip

**Additional Libraries**
- nestjs-cls for request-scoped context
- nestjs-i18n for translations
- helmet for security headers
- multer/multer-s3 for file uploads
- @nestjs/schedule for cron jobs
- @nestjs/event-emitter for domain events

## Package Installation Rules

When adding new dependencies:
- Use `npm install <package>` (not yarn or pnpm)
- Add production dependencies with `npm install <package>`
- Add dev dependencies with `npm install -D <package>`
- Prefer official NestJS packages when available (e.g., `@nestjs/terminus` over custom health checks)
- Check package.json for existing similar functionality before adding new packages

## Common npm Scripts

**Development**
- `npm run start:dev` - Start with hot reload (use this for development)
- `npm run start:debug` - Start with debugger attached
- `npm run build` - Compile TypeScript to JavaScript
- `npm run start:prod` - Run production build

**Testing**
- `npm test` - Run unit tests once
- `npm run test:watch` - Run tests in watch mode
- `npm run test:cov` - Generate coverage report
- `npm run test:e2e` - Run end-to-end tests

**Database**
- `npm run migration:generate` - Auto-generate migration from entity changes
- `npm run migration:run` - Apply pending migrations
- `npm run seed` - Populate database with initial data

**Code Quality**
- `npm run lint` - Run ESLint and auto-fix issues
- `npm run format` - Format code with Prettier

**Docker**
- `docker-compose up --build` - Start PostgreSQL, Redis, Prometheus, Grafana
- `docker-compose down` - Stop all services

## Technology-Specific Patterns

**TypeORM**
- Use repository pattern via `@InjectRepository(Entity)`
- Migrations in `src/database/migrations/` with timestamp prefix
- All entities extend `BaseEntity` from `src/core/entity/base.entity.ts`
- Use QueryBuilder for complex queries via `QueryBuilderService`

**Redis/Caching**
- Access via `CacheService` wrapper (not direct ioredis client)
- Cache keys should be namespaced (e.g., `user:${id}`)
- Set appropriate TTLs for cached data

**Validation**
- DTOs use class-validator decorators (`@IsString()`, `@IsEmail()`, etc.)
- Environment variables validated via Zod schema at startup
- Use `@IsAllowedField()` decorator to whitelist query fields

**Logging**
- Use injected logger: `constructor(private readonly logger: Logger) {}`
- Log levels: error, warn, info, debug
- Structured logging automatically includes request ID and context

**Testing**
- Jest for unit and E2E tests
- Mock external dependencies (DB, Redis, APIs) in unit tests
- Use test database for E2E tests
- Co-locate unit tests with source files (`*.spec.ts`)

## Build & Deployment

- TypeScript compiled to JavaScript in `dist/` directory
- Multi-stage Dockerfile for optimized production images
- Environment variables required (see `.example.env`)
- Graceful shutdown handling built-in
