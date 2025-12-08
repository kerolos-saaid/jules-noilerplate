import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./entities/user.entity";
import { CacheService } from "../cache/cache.service";
import { QueryBuilderService } from "../../common/services/query-builder.service";
import { UsersQueryDto } from "./dto/users-query.dto";
import { PaginatedResponse } from "../../common/interfaces/paginated-response.interface";

@Injectable()
export class UsersService {
  private readonly allowedSortFields = [
    "username",
    "email",
    "createdAt",
    "updatedAt",
  ];
  private readonly allowedFilterFields = ["username", "email", "role"];

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cacheService: CacheService,
    private readonly queryBuilderService: QueryBuilderService,
  ) {}

  /**
   * This method returns all users with pagination, sorting, and filtering.
   *
   * @remarks
   * This method is cached for 60 seconds. The cache key includes query parameters
   * to ensure correct cache hits. If the cache key is present in the cache,
   * the cached value is returned. Otherwise, the users are fetched from the database
   * and stored in the cache.
   *
   * The query builder is used to fetch the users and their roles in a single query,
   * which prevents the N+1 problem.
   */
  async findAll(
    queryDto: UsersQueryDto = {},
  ): Promise<PaginatedResponse<User>> {
    // Generate cache key that includes query parameters
    const cacheKey = this.generateCacheKey(queryDto);
    const cachedResult =
      await this.cacheService.get<PaginatedResponse<User>>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // Create base query builder
    let queryBuilder = this.userRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.roles", "roles");

    // Apply filters
    queryBuilder = this.queryBuilderService.applyFilters(
      queryBuilder,
      queryDto.filters,
      this.allowedFilterFields,
      "user",
    );

    // Apply sorting
    queryBuilder = this.queryBuilderService.applySorting(
      queryBuilder,
      queryDto.sortBy,
      queryDto.sortOrder,
      this.allowedSortFields,
      "user",
    );

    // Apply pagination
    queryBuilder = this.queryBuilderService.applyPagination(
      queryBuilder,
      queryDto,
    );

    // Execute query and get paginated response
    const result = await this.queryBuilderService.paginate(
      queryBuilder,
      queryDto,
    );

    // Cache the result
    await this.cacheService.set(cacheKey, result, 60);
    return result;
  }

  /**
   * Generate a cache key based on query parameters
   */
  private generateCacheKey(queryDto: UsersQueryDto): string {
    const parts = ["users"];

    if (queryDto.page) parts.push(`page:${queryDto.page}`);
    if (queryDto.limit) parts.push(`limit:${queryDto.limit}`);
    if (queryDto.sortBy) parts.push(`sortBy:${queryDto.sortBy}`);
    if (queryDto.sortOrder) parts.push(`sortOrder:${queryDto.sortOrder}`);
    if (queryDto.filters) {
      const filterStr = JSON.stringify(queryDto.filters);
      parts.push(`filters:${filterStr}`);
    }

    return parts.join(":");
  }

  async findOne(username: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder("user")
      .where("user.username = :username", { username })
      .leftJoinAndSelect("user.roles", "roles")
      .getOne();
  }

  async findByUsernameOrEmail(
    username: string,
    email: string,
  ): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder("user")
      .where("user.username = :username OR user.email = :email", {
        username,
        email,
      })
      .getOne();
  }

  /**
   * This method returns a single user by id.
   *
   * @remarks
   * This method is cached for 60 seconds. If the `user:{id}` key is present in the cache,
   * the cached value is returned. Otherwise, the user is fetched from the database
   * and stored in the cache.
   *
   * The query builder is used to fetch the user and their roles in a single query,
   * which prevents the N+1 problem.
   */
  async findById(id: string): Promise<User | null> {
    const cachedUser = await this.cacheService.get<User>(`user:${id}`);
    if (cachedUser) {
      return cachedUser;
    }

    const user = await this.userRepository
      .createQueryBuilder("user")
      .where("user.id = :id", { id })
      .leftJoinAndSelect("user.roles", "roles")
      .getOne();

    if (user) {
      await this.cacheService.set(`user:${id}`, user, 60);
    }

    return user;
  }

  /**
   * This method creates a new user.
   *
   * @remarks
   * This method deletes all cached user queries to ensure that the
   * cached list of users is up-to-date.
   */
  async create(user: Partial<User>): Promise<User> {
    const newUser = this.userRepository.create(user);
    const savedUser = await this.userRepository.save(newUser);
    // Invalidate all user-related cache keys (both 'users' and 'users:*')
    await this.cacheService.delPattern("users*");
    return savedUser;
  }
}
