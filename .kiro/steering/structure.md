# Project Structure

## Directory Organization

```
src/
├── config/              # Configuration files
│   ├── env.schema.ts    # Zod schema for environment validation
│   └── typeorm.config.ts # TypeORM configuration
├── core/                # Core/shared components
│   ├── entity/          # Base entities (BaseEntity with audit fields)
│   ├── interceptors/    # Global interceptors (metrics, request-id)
│   └── subscribers/     # TypeORM subscribers (audit logging)
├── common/              # Common utilities and shared code
│   ├── decorators/      # Custom decorators
│   ├── dto/             # Shared DTOs (QueryDto, PaginationQueryDto)
│   ├── enums/           # Shared enums (FilterOperator)
│   ├── filters/         # Exception filters (QueryExceptionFilter)
│   ├── interfaces/      # Shared interfaces (PaginatedResponse)
│   └── services/        # Shared services (QueryBuilderService)
├── database/
│   └── migrations/      # TypeORM migrations
├── i18n/                # Internationalization files
│   └── en/              # English translations
├── modules/             # Feature modules (domain-driven)
│   ├── auth/            # Authentication & authorization
│   │   ├── casl/        # CASL ability factory and enums
│   │   ├── decorators/  # Auth decorators (@Public, @Roles, @CheckPolicies)
│   │   ├── dto/         # Auth DTOs
│   │   ├── guards/      # Auth guards (JWT, roles, policies, ownership)
│   │   ├── interfaces/  # Auth interfaces
│   │   └── strategies/  # Passport strategies (JWT, local, refresh)
│   ├── cache/           # Redis caching service
│   ├── file-upload/     # File upload handling
│   ├── health/          # Health check endpoints
│   │   └── indicators/  # Custom health indicators (Redis)
│   ├── prometheus/      # Prometheus metrics
│   ├── seeding/         # Database seeding
│   └── users/           # User management
│       ├── dto/         # User DTOs
│       ├── entities/    # User and Role entities
│       └── enums/       # User enums (Role)
├── app.module.ts        # Root module
├── app.controller.ts    # Root controller
├── app.service.ts       # Root service
├── main.ts              # Application entry point
└── seed.ts              # Seeding script entry point
```

## Architectural Patterns

### Module Structure
Each feature module follows a consistent structure:
- `*.module.ts` - Module definition with imports/providers
- `*.controller.ts` - HTTP endpoints and route handlers
- `*.service.ts` - Business logic
- `dto/` - Data Transfer Objects for validation
- `entities/` - TypeORM entities
- `enums/` - Module-specific enumerations
- `interfaces/` - TypeScript interfaces

### Naming Conventions
- **Files**: kebab-case (e.g., `user.entity.ts`, `auth.service.ts`)
- **Classes**: PascalCase (e.g., `UserEntity`, `AuthService`)
- **Interfaces**: PascalCase with descriptive names (e.g., `PaginatedResponse`)
- **Enums**: PascalCase (e.g., `Role`, `Action`)
- **Constants**: UPPER_SNAKE_CASE
- **Variables/Functions**: camelCase

### Entity Conventions
- All entities extend `BaseEntity` which provides:
  - `id` (UUID primary key)
  - `createdAt` / `updatedAt` timestamps
  - `deletedAt` for soft deletes
  - `createdBy` / `updatedBy` for audit tracking
- Use decorators from TypeORM (`@Entity`, `@Column`, `@ManyToOne`, etc.)
- Define relationships explicitly with proper cascade options

### DTO Conventions
- Use `class-validator` decorators for validation
- Extend base DTOs when applicable (e.g., `QueryDto` for pagination/filtering)
- Separate DTOs for create, update, and query operations
- Use `@ApiProperty()` decorators for Swagger documentation

### Service Layer
- Services contain business logic, not controllers
- Use dependency injection for all dependencies
- Services should be testable in isolation
- Use TypeORM repositories for database access

### Controller Layer
- Controllers handle HTTP concerns only (routing, request/response)
- Apply guards at controller or method level (`@UseGuards()`)
- Use DTOs for request validation
- Return plain objects or entities (NestJS handles serialization)

### Guards & Decorators
- `@Public()` - Bypass JWT authentication
- `@Roles()` - Require specific roles
- `@CheckPolicies()` - Enforce CASL policies
- Guards execute in order: JWT → Roles → Policies → Ownership

### Configuration
- All environment variables validated via Zod schema in `config/env.schema.ts`
- Access config via `ConfigService` injection
- Never hardcode sensitive values

### Testing
- Unit tests: `*.spec.ts` files alongside source
- E2E tests: `test/` directory
- Use Jest for all testing
- Mock external dependencies in unit tests

## Key Design Principles

1. **Modular Architecture** - Features organized as self-contained modules
2. **Dependency Injection** - Use NestJS DI container for all dependencies
3. **Type Safety** - Leverage TypeScript for compile-time safety
4. **Validation** - Validate all inputs (environment, DTOs, queries)
5. **Security First** - Authentication/authorization on all non-public routes
6. **Observability** - Structured logging, metrics, and health checks
7. **Separation of Concerns** - Controllers, services, and repositories have distinct responsibilities
8. **Domain-Driven Design** - Modules organized around business domains
