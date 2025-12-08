---
inclusion: always
---

# Project Structure & Architecture

## File Placement Rules

When creating new files, follow this structure:

- `src/config/` - Configuration and environment validation (Zod schemas, TypeORM config)
- `src/core/` - Framework-level shared code (base entities, global interceptors, TypeORM subscribers)
- `src/common/` - Application-level shared code (decorators, DTOs, filters, services used across modules)
- `src/database/migrations/` - TypeORM migration files only
- `src/i18n/{locale}/` - Translation files organized by locale
- `src/modules/{feature}/` - Feature modules (domain-driven organization)

Feature module structure (create these subdirectories as needed):
```
src/modules/{feature}/
├── {feature}.module.ts      # REQUIRED: Module definition
├── {feature}.controller.ts  # HTTP endpoints
├── {feature}.service.ts     # Business logic
├── {feature}.service.spec.ts # Unit tests
├── dto/                     # Request/response DTOs
├── entities/                # TypeORM entities
├── enums/                   # Feature-specific enums
├── interfaces/              # TypeScript interfaces
├── guards/                  # Custom guards
├── decorators/              # Custom decorators
└── README.md                # Feature documentation (optional)
```

## Naming Conventions (STRICT)

- Files: `kebab-case.suffix.ts` (e.g., `user.entity.ts`, `auth.service.ts`, `users-query.dto.ts`)
- Classes: `PascalCase` + suffix (e.g., `UserEntity`, `AuthService`, `CreateUserDto`)
- Interfaces: `PascalCase` (e.g., `PaginatedResponse`, `PolicyHandler`)
- Enums: `PascalCase` (e.g., `Role`, `Action`, `FilterOperator`)
- Constants: `UPPER_SNAKE_CASE`
- Variables/Functions: `camelCase`

File suffix patterns:
- `*.entity.ts` - TypeORM entities
- `*.dto.ts` - Data Transfer Objects
- `*.service.ts` - Services
- `*.controller.ts` - Controllers
- `*.module.ts` - Modules
- `*.guard.ts` - Guards
- `*.decorator.ts` - Decorators
- `*.interceptor.ts` - Interceptors
- `*.filter.ts` - Exception filters
- `*.spec.ts` - Unit tests (co-located with source)
- `*.e2e-spec.ts` - E2E tests (in `test/` directory)

## Entity Pattern (MANDATORY)

All entities MUST extend `BaseEntity` from `src/core/entity/base.entity.ts`:

```typescript
import { BaseEntity } from '@/core/entity/base.entity';
import { Entity, Column } from 'typeorm';

@Entity('table_name')
export class MyEntity extends BaseEntity {
  @Column()
  myField: string;
}
```

BaseEntity provides: `id` (UUID), `createdAt`, `updatedAt`, `deletedAt`, `createdBy`, `updatedBy`

## DTO Pattern

For list/query endpoints, extend `QueryDto` from `src/common/dto/query.dto.ts`:

```typescript
import { QueryDto } from '@/common/dto/query.dto';
import { IsAllowedField } from '@/common/decorators/is-allowed-field.decorator';

export class UsersQueryDto extends QueryDto {
  @IsAllowedField(['email', 'username', 'role'])
  declare filterBy?: string;

  @IsAllowedField(['createdAt', 'email'])
  declare sortBy?: string;
}
```

Use `@IsAllowedField()` to whitelist filterable/sortable fields.

For create/update operations, create separate DTOs with `class-validator` decorators:

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;
}
```

## Service Pattern

Services contain business logic and use dependency injection:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class MyService {
  constructor(
    @InjectRepository(MyEntity)
    private readonly myRepository: Repository<MyEntity>,
  ) {}

  async findAll() {
    return this.myRepository.find();
  }
}
```

For paginated queries, use `QueryBuilderService`:

```typescript
import { QueryBuilderService } from '@/common/services/query-builder.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly queryBuilder: QueryBuilderService,
  ) {}

  async findAll(query: UsersQueryDto) {
    return this.queryBuilder.paginate(this.userRepository, query);
  }
}
```

## Controller Pattern

Controllers handle HTTP routing only, delegate logic to services:

```typescript
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Role } from '@/modules/users/enums/role.enum';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  findAll(@Query() query: UsersQueryDto) {
    return this.usersService.findAll(query);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
}
```

## Module Pattern

Register providers, controllers, and imports:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([MyEntity])],
  controllers: [MyController],
  providers: [MyService],
  exports: [MyService], // Export if used by other modules
})
export class MyModule {}
```

## Authentication & Authorization

Default: All routes require JWT authentication via global `JwtAuthGuard`.

To bypass authentication:
```typescript
import { Public } from '@/modules/auth/decorators/public.decorator';

@Public()
@Get('public-endpoint')
publicRoute() {}
```

Role-based access:
```typescript
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
@Delete(':id')
deleteUser() {}
```

Policy-based access (CASL):
```typescript
import { CheckPolicies } from '@/modules/auth/decorators/check-policies.decorator';
import { PoliciesGuard } from '@/modules/auth/guards/policies.guard';

@UseGuards(JwtAuthGuard, PoliciesGuard)
@CheckPolicies((ability) => ability.can(Action.UPDATE, User))
@Patch(':id')
updateUser() {}
```

Guard execution order: JWT → Roles → Policies → Ownership

## Configuration Access

Never hardcode values. Use `ConfigService`:

```typescript
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MyService {
  constructor(private readonly configService: ConfigService) {}

  getApiKey() {
    return this.configService.get<string>('API_KEY');
  }
}
```

All environment variables are validated via Zod schema in `src/config/env.schema.ts`.

## Import Path Aliases

Use `@/` alias for absolute imports from `src/`:

```typescript
import { BaseEntity } from '@/core/entity/base.entity';
import { QueryDto } from '@/common/dto/query.dto';
import { User } from '@/modules/users/entities/user.entity';
```

## Testing Requirements

- Unit tests: Co-locate `*.spec.ts` files with source files
- E2E tests: Place in `test/` directory as `*.e2e-spec.ts`
- Mock external dependencies (databases, APIs, Redis) in unit tests
- Use real dependencies in E2E tests (via test database)

## Key Architectural Rules

1. Business logic belongs in services, NOT controllers
2. All entities MUST extend `BaseEntity`
3. All routes require authentication unless marked `@Public()`
4. Use `QueryDto` for paginated/filtered list endpoints
5. Use `QueryBuilderService` for dynamic query construction
6. Validate all inputs with DTOs and `class-validator`
7. Use dependency injection for all dependencies
8. Return plain objects/entities from controllers (NestJS serializes automatically)
9. Place feature-specific code in `src/modules/{feature}/`
10. Place shared code in `src/common/` or `src/core/`
