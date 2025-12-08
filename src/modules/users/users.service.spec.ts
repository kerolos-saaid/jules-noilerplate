import { Test, TestingModule } from "@nestjs/testing";
import { UsersService } from "./users.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { User } from "./entities/user.entity";
import { CacheService } from "../cache/cache.service";
import { QueryBuilderService } from "../../common/services/query-builder.service";
import { Repository, SelectQueryBuilder } from "typeorm";
import { UsersQueryDto } from "./dto/users-query.dto";

describe("UsersService", () => {
  let service: UsersService;
  let repository: Repository<User>;
  let cacheService: CacheService;
  let queryBuilderService: QueryBuilderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: QueryBuilderService,
          useValue: {
            applyPagination: jest.fn(),
            applySorting: jest.fn(),
            applyFilters: jest.fn(),
            paginate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
    cacheService = module.get<CacheService>(CacheService);
    queryBuilderService = module.get<QueryBuilderService>(QueryBuilderService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // Feature: query-features, Property 18: Combined features correctness
  // Validates: Requirements 7.4
  describe("Property 18: Combined features correctness", () => {
    it("should apply pagination, sorting, and filtering together correctly", async () => {
      const queryDto: UsersQueryDto = {
        page: 2,
        limit: 10,
        sortBy: "email",
        sortOrder: "ASC",
        filters: {
          role: { eq: "admin" },
          username: { like: "john" },
        },
      };

      const mockQueryBuilder = createMockQueryBuilder();
      jest
        .spyOn(repository, "createQueryBuilder")
        .mockReturnValue(mockQueryBuilder as any);
      jest.spyOn(cacheService, "get").mockResolvedValue(null);

      const mockResult = {
        data: [
          { id: "1", username: "john1", email: "john1@example.com" },
          { id: "2", username: "john2", email: "john2@example.com" },
        ],
        metadata: {
          page: 2,
          limit: 10,
          totalCount: 25,
          totalPages: 3,
          hasNextPage: true,
          hasPreviousPage: true,
        },
      };

      jest
        .spyOn(queryBuilderService, "applyFilters")
        .mockReturnValue(mockQueryBuilder as any);
      jest
        .spyOn(queryBuilderService, "applySorting")
        .mockReturnValue(mockQueryBuilder as any);
      jest
        .spyOn(queryBuilderService, "applyPagination")
        .mockReturnValue(mockQueryBuilder as any);
      jest
        .spyOn(queryBuilderService, "paginate")
        .mockResolvedValue(mockResult as any);

      const result = await service.findAll(queryDto);

      // Property: All three features should be applied in correct order
      expect(queryBuilderService.applyFilters).toHaveBeenCalledWith(
        mockQueryBuilder,
        queryDto.filters,
        service["allowedFilterFields"],
        "user",
      );
      expect(queryBuilderService.applySorting).toHaveBeenCalledWith(
        mockQueryBuilder,
        queryDto.sortBy,
        queryDto.sortOrder,
        service["allowedSortFields"],
        "user",
      );
      expect(queryBuilderService.applyPagination).toHaveBeenCalledWith(
        mockQueryBuilder,
        queryDto,
      );
      expect(queryBuilderService.paginate).toHaveBeenCalledWith(
        mockQueryBuilder,
        queryDto,
      );

      // Property: Result should satisfy all constraints
      expect(result.data).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.page).toBe(2);
      expect(result.metadata.limit).toBe(10);
    });

    it("should handle various combinations of query parameters", async () => {
      const testCases = [
        // Only pagination
        { page: 1, limit: 20 },
        // Pagination + sorting
        { page: 3, limit: 15, sortBy: "createdAt", sortOrder: "DESC" as const },
        // Pagination + filtering
        { page: 1, limit: 10, filters: { username: { like: "test" } } },
        // All three features
        {
          page: 2,
          limit: 25,
          sortBy: "username",
          sortOrder: "ASC" as const,
          filters: { email: { like: "example.com" } },
        },
        // Multiple filters with sorting
        {
          page: 1,
          limit: 50,
          sortBy: "updatedAt",
          sortOrder: "DESC" as const,
          filters: {
            username: { like: "admin" },
            role: { eq: "admin" },
          },
        },
      ];

      for (const queryDto of testCases) {
        const mockQueryBuilder = createMockQueryBuilder();
        jest
          .spyOn(repository, "createQueryBuilder")
          .mockReturnValue(mockQueryBuilder as any);
        jest.spyOn(cacheService, "get").mockResolvedValue(null);

        const mockResult = {
          data: [],
          metadata: {
            page: queryDto.page || 1,
            limit: queryDto.limit || 10,
            totalCount: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        };

        jest
          .spyOn(queryBuilderService, "applyFilters")
          .mockReturnValue(mockQueryBuilder as any);
        jest
          .spyOn(queryBuilderService, "applySorting")
          .mockReturnValue(mockQueryBuilder as any);
        jest
          .spyOn(queryBuilderService, "applyPagination")
          .mockReturnValue(mockQueryBuilder as any);
        jest
          .spyOn(queryBuilderService, "paginate")
          .mockResolvedValue(mockResult as any);

        const result = await service.findAll(queryDto);

        // Property: All specified features should be applied
        expect(queryBuilderService.applyFilters).toHaveBeenCalled();
        expect(queryBuilderService.applySorting).toHaveBeenCalled();
        expect(queryBuilderService.applyPagination).toHaveBeenCalled();
        expect(queryBuilderService.paginate).toHaveBeenCalled();

        // Property: Result structure should be consistent
        expect(result).toHaveProperty("data");
        expect(result).toHaveProperty("metadata");
        expect(Array.isArray(result.data)).toBe(true);
      }
    });

    it("should respect allowed fields for sorting and filtering", async () => {
      const queryDto: UsersQueryDto = {
        page: 1,
        limit: 10,
        sortBy: "email",
        filters: { username: { eq: "test" } },
      };

      const mockQueryBuilder = createMockQueryBuilder();
      jest
        .spyOn(repository, "createQueryBuilder")
        .mockReturnValue(mockQueryBuilder as any);
      jest.spyOn(cacheService, "get").mockResolvedValue(null);

      const mockResult = {
        data: [],
        metadata: {
          page: 1,
          limit: 10,
          totalCount: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      jest
        .spyOn(queryBuilderService, "applyFilters")
        .mockReturnValue(mockQueryBuilder as any);
      jest
        .spyOn(queryBuilderService, "applySorting")
        .mockReturnValue(mockQueryBuilder as any);
      jest
        .spyOn(queryBuilderService, "applyPagination")
        .mockReturnValue(mockQueryBuilder as any);
      jest
        .spyOn(queryBuilderService, "paginate")
        .mockResolvedValue(mockResult as any);

      await service.findAll(queryDto);

      // Property: Only allowed fields should be passed to query builder service
      expect(queryBuilderService.applySorting).toHaveBeenCalledWith(
        mockQueryBuilder,
        "email",
        undefined,
        ["username", "email", "createdAt", "updatedAt"],
        "user",
      );
      expect(queryBuilderService.applyFilters).toHaveBeenCalledWith(
        mockQueryBuilder,
        { username: { eq: "test" } },
        ["username", "email", "role"],
        "user",
      );
    });

    it("should generate correct cache keys for different query combinations", async () => {
      const testCases = [
        {
          queryDto: { page: 1, limit: 10 },
          expectedCacheKey: "users:page:1:limit:10",
        },
        {
          queryDto: {
            page: 2,
            limit: 20,
            sortBy: "email",
            sortOrder: "ASC" as const,
          },
          expectedCacheKey: "users:page:2:limit:20:sortBy:email:sortOrder:ASC",
        },
        {
          queryDto: {
            page: 1,
            limit: 10,
            filters: { username: { eq: "test" } },
          },
          expectedCacheKey:
            'users:page:1:limit:10:filters:{"username":{"eq":"test"}}',
        },
      ];

      for (const { queryDto, expectedCacheKey } of testCases) {
        const mockQueryBuilder = createMockQueryBuilder();
        jest
          .spyOn(repository, "createQueryBuilder")
          .mockReturnValue(mockQueryBuilder as any);
        jest.spyOn(cacheService, "get").mockResolvedValue(null);

        const mockResult = {
          data: [],
          metadata: {
            page: queryDto.page || 1,
            limit: queryDto.limit || 10,
            totalCount: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        };

        jest
          .spyOn(queryBuilderService, "applyFilters")
          .mockReturnValue(mockQueryBuilder as any);
        jest
          .spyOn(queryBuilderService, "applySorting")
          .mockReturnValue(mockQueryBuilder as any);
        jest
          .spyOn(queryBuilderService, "applyPagination")
          .mockReturnValue(mockQueryBuilder as any);
        jest
          .spyOn(queryBuilderService, "paginate")
          .mockResolvedValue(mockResult as any);

        await service.findAll(queryDto);

        // Property: Cache key should include all query parameters
        expect(cacheService.get).toHaveBeenCalledWith(expectedCacheKey);
        expect(cacheService.set).toHaveBeenCalledWith(
          expectedCacheKey,
          mockResult,
          60,
        );
      }
    });

    it("should return cached results when available", async () => {
      const queryDto: UsersQueryDto = {
        page: 1,
        limit: 10,
        sortBy: "email",
      };

      const cachedResult = {
        data: [{ id: "1", username: "cached", email: "cached@example.com" }],
        metadata: {
          page: 1,
          limit: 10,
          totalCount: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      jest.spyOn(cacheService, "get").mockResolvedValue(cachedResult);
      jest.spyOn(repository, "createQueryBuilder");

      const result = await service.findAll(queryDto);

      // Property: When cache hit occurs, query builder should not be used
      expect(result).toEqual(cachedResult);
      expect(repository.createQueryBuilder).not.toHaveBeenCalled();
    });
  });
});

// Helper function to create a mock query builder
function createMockQueryBuilder(): SelectQueryBuilder<User> {
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  } as any;
}
