# NestJS Boilerplate Guide

Welcome to the NestJS Boilerplate Guide! This guide is designed to help you understand and use the features of this boilerplate. It's written with junior developers in mind, so it will provide step-by-step instructions and clear code examples.

## Table of Contents

1.  [Authentication and Authorization](#authentication-and-authorization)
    *   [Roles and Permissions](#roles-and-permissions)
    *   [Policies](#policies)
2.  [Event Emitter](#event-emitter)
3.  [Background Jobs with BullMQ](#background-jobs-with-bullmq)
4.  [Caching Strategies](#caching-strategies)
5.  [Query Features](#query-features)
    *   [Pagination](#pagination)
    *   [Sorting](#sorting)
    *   [Filtering](#filtering)
    *   [Combining Features](#combining-features)

---

## Authentication and Authorization

This boilerplate uses a powerful and flexible authentication and authorization system. It's based on JSON Web Tokens (JWTs) and a combination of Role-Based Access Control (RBAC) and Policy-Based Authorization using CASL (an isomorphic authorization library).

### Understanding the System

The authorization system has three main components:

1. **Roles** - Groups that users belong to (e.g., admin, user, moderator)
2. **Actions** - Operations that can be performed (e.g., create, read, update, delete)
3. **Policies** - Rules that determine what actions a user can perform on which resources

### Roles

Roles are defined in `src/modules/users/enums/role.enum.ts` and stored in the database via the `Role` entity.

**Current Roles:**

```typescript
export enum Role {
  USER = 'user',
  ADMIN = 'admin',
}
```

**Adding a New Role:**

1. Add the role to the enum:

```typescript
export enum Role {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator', // New role
}
```

2. Create a database migration to add the role:

```bash
npm run migration:generate -- src/database/migrations/AddModeratorRole
```

3. Update your seeding script (`src/modules/seeding/seeding.service.ts`) to include the new role:

```typescript
const moderatorRole = roleRepository.create({ name: Role.MODERATOR });
await roleRepository.save(moderatorRole);
```

4. Run the migration and seed:

```bash
npm run migration:run
npm run seed
```

**Assigning Roles to Users:**

Users can have multiple roles through the many-to-many relationship:

```typescript
// In your service
const user = await this.userRepository.findOne({
  where: { id: userId },
  relations: ['roles'],
});

const moderatorRole = await this.roleRepository.findOne({
  where: { name: Role.MODERATOR },
});

user.roles.push(moderatorRole);
await this.userRepository.save(user);
```

### Actions

Actions are defined in `src/modules/auth/casl/enums/action.enum.ts`:

```typescript
export enum Action {
  MANAGE = 'manage', // Special action that represents "any" action
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
}
```

**Adding Custom Actions:**

You can add domain-specific actions:

```typescript
export enum Action {
  MANAGE = 'manage',
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  PUBLISH = 'publish',    // New action
  APPROVE = 'approve',    // New action
  MODERATE = 'moderate',  // New action
}
```

### Defining Permissions with CASL

Permissions are defined in `src/modules/auth/casl/casl-ability.factory.ts`. This is where you map roles to their allowed actions.

**Current Implementation:**

```typescript
@Injectable()
export class CaslAbilityFactory {
  createForUser(user: User) {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    // Admins can do anything
    if (user.roles.some((role) => role.name === Role.ADMIN)) {
      can(Action.MANAGE, 'all');
    } else {
      // Non-admins can read everything
      can(Action.READ, 'all');
    }

    // Users can update their own profiles
    can(Action.UPDATE, User, { id: user.id });

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
```

**Adding Permissions for a New Role:**

Let's add permissions for a moderator role:

```typescript
@Injectable()
export class CaslAbilityFactory {
  createForUser(user: User) {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    // Admins can do anything
    if (user.roles.some((role) => role.name === Role.ADMIN)) {
      can(Action.MANAGE, 'all');
    } 
    // Moderators have specific permissions
    else if (user.roles.some((role) => role.name === Role.MODERATOR)) {
      can(Action.READ, 'all');
      can(Action.UPDATE, User); // Can update any user
      can(Action.DELETE, Post); // Can delete posts
      can(Action.MODERATE, Comment); // Can moderate comments
      cannot(Action.DELETE, User); // But cannot delete users
    } 
    // Regular users have limited permissions
    else {
      can(Action.READ, 'all');
      can(Action.CREATE, Post);
      can(Action.CREATE, Comment);
    }

    // All users can update their own profiles
    can(Action.UPDATE, User, { id: user.id });
    can(Action.DELETE, Post, { authorId: user.id });
    can(Action.DELETE, Comment, { authorId: user.id });

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
```

**Permission Patterns:**

```typescript
// Allow action on all resources
can(Action.READ, 'all');

// Allow action on specific entity type
can(Action.CREATE, Post);

// Allow action with conditions (field-level)
can(Action.UPDATE, Post, { authorId: user.id });

// Allow action with multiple conditions
can(Action.UPDATE, Post, { authorId: user.id, status: 'draft' });

// Explicitly deny an action (takes precedence over can)
cannot(Action.DELETE, User);

// Allow action on specific fields only
can(Action.UPDATE, Post, ['title', 'content'], { authorId: user.id });
```

### Policies

Policies are used to enforce authorization rules in your controllers. There are two ways to define policies:

#### 1. Inline Policy (Simple)

Use a callback function directly in the decorator:

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { CheckPolicies } from '../auth/decorators/check-policies.decorator';
import { PoliciesGuard } from '../auth/guards/policies.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Action } from '../auth/casl/enums/action.enum';
import { AppAbility } from '../auth/casl/casl-ability.factory';

@Controller('users')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class UsersController {
  @Get()
  @CheckPolicies((ability: AppAbility) => ability.can(Action.READ, 'all'))
  findAll() {
    // Only users who can read all resources can access this
  }

  @Delete(':id')
  @CheckPolicies((ability: AppAbility) => ability.can(Action.DELETE, User))
  remove(@Param('id') id: string) {
    // Only users who can delete users can access this
  }
}
```

#### 2. Policy Handler Classes (Complex)

For more complex logic, create a policy handler class:

```typescript
// src/modules/posts/policies/update-post.policy.ts
import { Injectable } from '@nestjs/common';
import { AppAbility } from '../../auth/casl/casl-ability.factory';
import { Action } from '../../auth/casl/enums/action.enum';
import { Post } from '../entities/post.entity';

@Injectable()
export class UpdatePostPolicyHandler {
  handle(ability: AppAbility, post: Post): boolean {
    // Check if user can update this specific post
    return ability.can(Action.UPDATE, post);
  }
}
```

Use it in your controller:

```typescript
@Controller('posts')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly updatePostPolicy: UpdatePostPolicyHandler,
  ) {}

  @Put(':id')
  @CheckPolicies((ability: AppAbility) => ability.can(Action.UPDATE, Post))
  async update(
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
    @CurrentUser() user: User,
  ) {
    const post = await this.postsService.findOne(id);
    
    // Additional check with the actual post instance
    const ability = this.caslAbilityFactory.createForUser(user);
    if (!this.updatePostPolicy.handle(ability, post)) {
      throw new ForbiddenException('You cannot update this post');
    }
    
    return this.postsService.update(id, updatePostDto);
  }
}
```

#### 3. Multiple Policy Checks

You can combine multiple policies:

```typescript
@Post()
@CheckPolicies(
  (ability: AppAbility) => ability.can(Action.CREATE, Post),
  (ability: AppAbility) => ability.can(Action.READ, Category),
)
async create(@Body() createPostDto: CreatePostDto) {
  // User must be able to create posts AND read categories
}
```

### Complete Example: Adding a New Feature with Roles and Policies

Let's say you want to add a blog post feature with proper authorization:

**Step 1: Define the entity**

```typescript
// src/modules/posts/entities/post.entity.ts
import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../core/entity/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Post extends BaseEntity {
  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ default: 'draft' })
  status: string; // draft, published, archived

  @ManyToOne(() => User)
  author: User;

  @Column()
  authorId: string;
}
```

**Step 2: Update the CASL ability factory**

```typescript
// Add Post to the Subjects type
type Subjects = InferSubjects<typeof User | typeof Post> | 'all';

// In createForUser method
if (user.roles.some((role) => role.name === Role.ADMIN)) {
  can(Action.MANAGE, 'all');
} else if (user.roles.some((role) => role.name === Role.MODERATOR)) {
  can(Action.READ, 'all');
  can(Action.UPDATE, Post);
  can(Action.DELETE, Post);
} else {
  can(Action.READ, 'all');
  can(Action.CREATE, Post);
  can(Action.UPDATE, Post, { authorId: user.id });
  can(Action.DELETE, Post, { authorId: user.id });
}
```

**Step 3: Protect your controller endpoints**

```typescript
// src/modules/posts/posts.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../auth/guards/policies.guard';
import { CheckPolicies } from '../auth/decorators/check-policies.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Action } from '../auth/casl/enums/action.enum';
import { AppAbility } from '../auth/casl/casl-ability.factory';
import { Post as PostEntity } from './entities/post.entity';
import { User } from '../users/entities/user.entity';

@Controller('posts')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @CheckPolicies((ability: AppAbility) => ability.can(Action.READ, PostEntity))
  findAll() {
    return this.postsService.findAll();
  }

  @Post()
  @CheckPolicies((ability: AppAbility) => ability.can(Action.CREATE, PostEntity))
  create(@Body() createPostDto: CreatePostDto, @CurrentUser() user: User) {
    return this.postsService.create(createPostDto, user);
  }

  @Put(':id')
  @CheckPolicies((ability: AppAbility) => ability.can(Action.UPDATE, PostEntity))
  async update(
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
    @CurrentUser() user: User,
  ) {
    // The guard checks if user CAN update posts in general
    // Here we check if they can update THIS specific post
    const post = await this.postsService.findOne(id);
    
    const ability = this.caslAbilityFactory.createForUser(user);
    if (!ability.can(Action.UPDATE, post)) {
      throw new ForbiddenException('You cannot update this post');
    }
    
    return this.postsService.update(id, updatePostDto);
  }

  @Delete(':id')
  @CheckPolicies((ability: AppAbility) => ability.can(Action.DELETE, PostEntity))
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    const post = await this.postsService.findOne(id);
    
    const ability = this.caslAbilityFactory.createForUser(user);
    if (!ability.can(Action.DELETE, post)) {
      throw new ForbiddenException('You cannot delete this post');
    }
    
    return this.postsService.remove(id);
  }
}
```

### Best Practices

1. **Define roles at the database level** - Store roles in the database so they can be managed dynamically
2. **Keep the ability factory centralized** - All permission logic should be in one place
3. **Use guards at the controller level** - Apply `JwtAuthGuard` and `PoliciesGuard` to protect endpoints
4. **Check general permissions in decorators** - Use `@CheckPolicies` for type-level checks
5. **Check specific instances in methods** - For resource ownership, fetch the resource and check against the actual instance
6. **Use meaningful action names** - Create custom actions that match your domain (e.g., PUBLISH, APPROVE)
7. **Test your policies** - Write unit tests for your ability factory to ensure permissions are correct
8. **Document your permissions** - Keep a clear record of what each role can do

### Testing Policies

```typescript
// src/modules/auth/casl/casl-ability.factory.spec.ts
import { CaslAbilityFactory } from './casl-ability.factory';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../users/enums/role.enum';
import { Action } from './enums/action.enum';
import { Post } from '../../posts/entities/post.entity';

describe('CaslAbilityFactory', () => {
  let factory: CaslAbilityFactory;

  beforeEach(() => {
    factory = new CaslAbilityFactory();
  });

  it('should allow admin to manage all resources', () => {
    const admin = { id: '1', roles: [{ name: Role.ADMIN }] } as User;
    const ability = factory.createForUser(admin);

    expect(ability.can(Action.MANAGE, 'all')).toBe(true);
    expect(ability.can(Action.DELETE, User)).toBe(true);
  });

  it('should allow users to update their own posts', () => {
    const user = { id: '1', roles: [{ name: Role.USER }] } as User;
    const ability = factory.createForUser(user);

    const ownPost = { authorId: '1' } as Post;
    const otherPost = { authorId: '2' } as Post;

    expect(ability.can(Action.UPDATE, ownPost)).toBe(true);
    expect(ability.can(Action.UPDATE, otherPost)).toBe(false);
  });
});
```

---

## Event Emitter

The event emitter is used to decouple different parts of your application. It allows you to fire events and listen for them in other parts of your code.

**Example:**

Here's an example of how to use the `@OnEvent` decorator to listen for an event:

```typescript
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class UserCreatedListener {
  @OnEvent('user.created')
  handleUserCreatedEvent(payload: any) {
    // Handle the event here.
  }
}
```

---

## Background Jobs with BullMQ

BullMQ is used to manage background jobs. It's a powerful and flexible queueing system that's built on top of Redis.

**Example:**

Here's an example of how to create a simple job processor:

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('my-queue')
export class MyQueueProcessor extends WorkerHost {
  async process(job: Job<any, any, string>): Promise<any> {
    // Process the job here.
  }
}
```

---

## Caching Strategies

This boilerplate uses a Redis-based caching module to improve performance. The `CacheService` provides a simple interface for interacting with the cache.

**Example:**

Here's an example of how to use the `CacheService` to cache the results of a database query:

```typescript
import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { CacheService } from '../cache/cache.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class CachedUsersService {
  constructor(
    private readonly usersService: UsersService,
    private readonly cacheService: CacheService,
  ) {}

  async findAll(): Promise<User[]> {
    const cachedUsers = await this.cacheService.get<User[]>('users');
    if (cachedUsers) {
      return cachedUsers;
    }

    const users = await this.usersService.findAll();
    await this.cacheService.set('users', users, 60);
    return users;
  }
}
```


---

## Query Features

This boilerplate provides powerful query capabilities for API endpoints, including pagination, sorting, and filtering. These features help you efficiently retrieve and manage large datasets.

### Pagination

Pagination allows you to retrieve data in manageable chunks rather than loading everything at once. This improves performance and user experience.

**Parameters:**

- `page` (optional): The page number to retrieve (default: 1, minimum: 1)
- `limit` (optional): The number of items per page (default: 10, minimum: 1, maximum: 100)

**Example Request:**

```bash
GET /api/users?page=2&limit=20
```

**Example Response:**

```json
{
  "data": [
    {
      "id": "uuid-here",
      "username": "john_doe",
      "email": "john@example.com",
      "createdAt": "2024-01-15T10:30:00Z"
    }
    // ... more users
  ],
  "metadata": {
    "page": 2,
    "limit": 20,
    "totalCount": 150,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPreviousPage": true
  }
}
```

**Code Example:**

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersQueryDto } from './dto/users-query.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { User } from './entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(@Query() queryDto: UsersQueryDto): Promise<PaginatedResponse<User>> {
    return this.usersService.findAll(queryDto);
  }
}
```

### Sorting

Sorting allows you to order results by one or multiple fields in ascending or descending order.

**Parameters:**

- `sortBy` (optional): The field name to sort by (must be in the allowed fields list)
- `sortOrder` (optional): The sort direction - `ASC` for ascending or `DESC` for descending (default: DESC)

**Example Requests:**

```bash
# Sort by email in ascending order
GET /api/users?sortBy=email&sortOrder=ASC

# Sort by creation date in descending order (most recent first)
GET /api/users?sortBy=createdAt&sortOrder=DESC

# Sort by multiple fields (comma-separated)
GET /api/users?sortBy=role,createdAt&sortOrder=ASC
```

**Code Example:**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UsersQueryDto } from './dto/users-query.dto';
import { QueryBuilderService } from '../../common/services/query-builder.service';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly queryBuilderService: QueryBuilderService,
  ) {}

  async findAll(queryDto: UsersQueryDto): Promise<PaginatedResponse<User>> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');
    
    // Define allowed fields for sorting
    const allowedSortFields = ['username', 'email', 'createdAt', 'updatedAt'];
    
    // Apply sorting
    this.queryBuilderService.applySorting(
      queryBuilder,
      queryDto,
      allowedSortFields,
      'user',
    );
    
    // Apply pagination and execute
    return this.queryBuilderService.paginate(queryBuilder, queryDto);
  }
}
```

### Filtering

Filtering allows you to retrieve only records that match specific criteria. The system supports multiple filter operators for different types of comparisons.

**Filter Operators:**

- `eq` - Equals (exact match)
- `ne` - Not equals
- `gt` - Greater than
- `gte` - Greater than or equal to
- `lt` - Less than
- `lte` - Less than or equal to
- `like` - Pattern matching (case-insensitive)
- `in` - Value is in a list

**Filter Syntax:**

Filters are specified using the format: `filters[fieldName][operator]=value`

**Example Requests:**

```bash
# Find users with a specific email
GET /api/users?filters[email][eq]=john@example.com

# Find users whose username contains "john" (case-insensitive)
GET /api/users?filters[username][like]=john

# Find users created after a specific date
GET /api/users?filters[createdAt][gte]=2024-01-01

# Find users with specific roles
GET /api/users?filters[role][in]=admin,moderator

# Combine multiple filters (AND logic)
GET /api/users?filters[role][eq]=admin&filters[email][like]=@company.com
```

**Code Example:**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UsersQueryDto } from './dto/users-query.dto';
import { QueryBuilderService } from '../../common/services/query-builder.service';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly queryBuilderService: QueryBuilderService,
  ) {}

  async findAll(queryDto: UsersQueryDto): Promise<PaginatedResponse<User>> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');
    
    // Define allowed fields for filtering
    const allowedFilterFields = ['username', 'email', 'role', 'createdAt', 'updatedAt'];
    
    // Apply filters
    if (queryDto.filters) {
      this.queryBuilderService.applyFilters(
        queryBuilder,
        queryDto.filters,
        allowedFilterFields,
        'user',
      );
    }
    
    // Apply pagination and execute
    return this.queryBuilderService.paginate(queryBuilder, queryDto);
  }
}
```

### Combining Features

You can combine pagination, sorting, and filtering in a single request for powerful data retrieval.

**Example Request:**

```bash
# Get page 2 of admin users, sorted by creation date, with 25 results per page
GET /api/users?page=2&limit=25&sortBy=createdAt&sortOrder=DESC&filters[role][eq]=admin

# Get users whose email contains "company.com", sorted by username
GET /api/users?sortBy=username&sortOrder=ASC&filters[email][like]=company.com

# Get recent users (created in last 30 days), paginated
GET /api/users?page=1&limit=50&sortBy=createdAt&sortOrder=DESC&filters[createdAt][gte]=2024-11-01
```

**Complete Service Example:**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UsersQueryDto } from './dto/users-query.dto';
import { QueryBuilderService } from '../../common/services/query-builder.service';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly queryBuilderService: QueryBuilderService,
    private readonly cacheService: CacheService,
  ) {}

  async findAll(queryDto: UsersQueryDto): Promise<PaginatedResponse<User>> {
    // Create cache key from query parameters
    const cacheKey = `users:${JSON.stringify(queryDto)}`;
    
    // Check cache
    const cached = await this.cacheService.get<PaginatedResponse<User>>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Build query
    const queryBuilder = this.userRepository.createQueryBuilder('user');
    
    // Define allowed fields
    const allowedSortFields = ['username', 'email', 'createdAt', 'updatedAt'];
    const allowedFilterFields = ['username', 'email', 'role', 'createdAt', 'updatedAt'];
    
    // Apply filters
    if (queryDto.filters) {
      this.queryBuilderService.applyFilters(
        queryBuilder,
        queryDto.filters,
        allowedFilterFields,
        'user',
      );
    }
    
    // Apply sorting
    this.queryBuilderService.applySorting(
      queryBuilder,
      queryDto,
      allowedSortFields,
      'user',
    );
    
    // Apply pagination and execute
    const result = await this.queryBuilderService.paginate(queryBuilder, queryDto);
    
    // Cache the result
    await this.cacheService.set(cacheKey, result, 300); // 5 minutes TTL
    
    return result;
  }
}
```

**Creating Custom Query DTOs:**

You can extend the base `QueryDto` to add custom validation or additional fields:

```typescript
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { QueryDto } from '../../../common/dto/query.dto';
import { UserRole } from '../enums/role.enum';

export class UsersQueryDto extends QueryDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
```

**Error Handling:**

The query system automatically validates inputs and returns clear error messages:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "sortBy",
      "value": "invalidField",
      "constraints": {
        "isAllowedField": "sortBy must be one of: username, email, createdAt, updatedAt"
      }
    }
  ]
}
```

**Best Practices:**

1. Always define allowed fields lists to prevent querying sensitive or non-indexed fields
2. Use appropriate cache TTLs based on how frequently your data changes
3. Include query parameters in cache keys to avoid serving stale data
4. Set reasonable maximum limits for page size (default is 100)
5. Add database indexes on fields that are frequently used for sorting or filtering
6. Validate custom query parameters in your DTOs using class-validator decorators
