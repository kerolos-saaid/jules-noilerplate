---
inclusion: always
---

# Product Overview

Enterprise-grade NestJS boilerplate for production-ready, scalable monolithic backend APIs with built-in security, observability, and performance features.

## Core Capabilities

**Authentication & Authorization**
- JWT with refresh token rotation
- RBAC via `@Roles()` decorator and RolesGuard
- Policy-based authorization via CASL and `@CheckPolicies()` decorator
- Ownership validation via OwnershipGuard
- Public routes via `@Public()` decorator

**Data Layer**
- PostgreSQL with TypeORM for persistence
- Redis for caching and rate limiting
- BullMQ for background job processing
- Automated migrations and seeding
- Soft deletes and audit tracking on all entities (via BaseEntity)

**Query System**
- Built-in pagination, sorting, and filtering via QueryDto
- QueryBuilderService for dynamic query construction
- Support for complex filters (eq, ne, gt, lt, like, in, between)
- Use `@IsAllowedField()` decorator to whitelist filterable/sortable fields

**Observability**
- Structured JSON logging via nestjs-pino
- Prometheus metrics exposed at `/metrics`
- Health checks at `/health` (database, Redis, memory, disk)
- Request ID tracking via RequestIdInterceptor
- Audit logging via AuditSubscriber

**Resilience & Performance**
- Circuit breaker pattern via opossum (industry standard)
- Redis-backed caching via CacheService
- Rate limiting via @nestjs/throttler
- Gzip compression
- Graceful shutdown handling

## Development Guidelines

**When Adding New Features**
- Create feature modules in `src/modules/`
- Extend BaseEntity for audit fields (id, timestamps, soft delete, created/updated by)
- Use QueryDto for list endpoints requiring pagination/filtering
- Apply appropriate guards: JwtAuthGuard (default), RolesGuard, PoliciesGuard, OwnershipGuard
- Add health indicators for external dependencies
- Expose relevant metrics via PrometheusService

**Security Defaults**
- All routes require JWT authentication unless marked `@Public()`
- Use bcrypt for password hashing (never plain text)
- Validate all inputs with class-validator DTOs
- Environment variables validated via Zod schema
- Helmet middleware for security headers

**Code Organization**
- Business logic belongs in services, not controllers
- Use dependency injection for all dependencies
- DTOs for validation, entities for persistence
- Keep controllers thin (routing and HTTP concerns only)
- Follow domain-driven module structure

**Testing Expectations**
- Unit tests (*.spec.ts) alongside source files
- E2E tests in `test/` directory
- Mock external dependencies in unit tests
- Aim for high coverage on business logic

**Common Patterns**
- Use CacheService wrapper (not direct Redis) for caching
- Use QueryBuilderService for dynamic queries
- Use nestjs-cls for request-scoped context
- Use event emitters for decoupled domain events
- Use circuit breaker decorator for external service calls
