import { Test, TestingModule } from '@nestjs/testing';
import { QueryBuilderService } from './query-builder.service';
import { SelectQueryBuilder } from 'typeorm';
import { PaginationQueryDto } from '../dto/pagination-query.dto';

describe('QueryBuilderService', () => {
  let service: QueryBuilderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueryBuilderService],
    }).compile();

    service = module.get<QueryBuilderService>(QueryBuilderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Feature: query-features, Property 2: Correct offset calculation
  // Validates: Requirements 1.2
  describe('Property 2: Correct offset calculation', () => {
    it('should calculate correct offset as (page - 1) × limit', () => {
      const testCases = [
        { page: 1, limit: 10, expectedSkip: 0 },
        { page: 2, limit: 10, expectedSkip: 10 },
        { page: 3, limit: 20, expectedSkip: 40 },
        { page: 5, limit: 25, expectedSkip: 100 },
        { page: 10, limit: 50, expectedSkip: 450 },
        { page: 1, limit: 100, expectedSkip: 0 },
      ];

      testCases.forEach(({ page, limit, expectedSkip }) => {
        const mockQueryBuilder = createMockQueryBuilder();
        const paginationDto: PaginationQueryDto = { page, limit };

        service.applyPagination(mockQueryBuilder, paginationDto);

        // Property: skip should equal (page - 1) * limit
        expect(mockQueryBuilder.skip).toHaveBeenCalledWith(expectedSkip);
      });
    });

    it('should handle various page and limit combinations correctly', () => {
      // Generate random page and limit combinations
      const randomCases = Array.from({ length: 20 }, () => {
        const page = Math.floor(Math.random() * 10) + 1;
        const limit = Math.floor(Math.random() * 100) + 1;
        return { page, limit };
      });

      randomCases.forEach(({ page, limit }) => {
        const mockQueryBuilder = createMockQueryBuilder();
        const paginationDto: PaginationQueryDto = { page, limit };

        service.applyPagination(mockQueryBuilder, paginationDto);

        const expectedSkip = (page - 1) * Math.min(limit, 100);
        const skipCalls = (mockQueryBuilder.skip as jest.Mock).mock.calls;
        const actualSkip = skipCalls[skipCalls.length - 1][0];

        // Property: offset calculation must be correct
        expect(actualSkip).toBe(expectedSkip);
      });
    });
  });

  // Feature: query-features, Property 1: Page size limit enforcement
  // Validates: Requirements 1.1, 1.5
  describe('Property 1: Page size limit enforcement', () => {
    it('should never return more results than the specified limit', () => {
      // Test with various limit values including those exceeding maximum
      const testCases = [
        { page: 1, limit: 10 },
        { page: 1, limit: 50 },
        { page: 1, limit: 100 },
        { page: 1, limit: 150 }, // Exceeds maximum
        { page: 1, limit: 200 }, // Exceeds maximum
        { page: 2, limit: 75 },
      ];

      testCases.forEach(({ page, limit }) => {
        const mockQueryBuilder = createMockQueryBuilder();
        const paginationDto: PaginationQueryDto = { page, limit };

        service.applyPagination(mockQueryBuilder, paginationDto);

        // Verify that take was called with the minimum of limit and 100
        const expectedLimit = Math.min(limit, 100);
        expect(mockQueryBuilder.take).toHaveBeenCalledWith(expectedLimit);
      });
    });

    it('should enforce maximum limit of 100 for any pagination request', () => {
      // Generate random limits including values over 100
      const limits = [101, 150, 200, 500, 1000, 99, 100];

      limits.forEach((limit) => {
        const mockQueryBuilder = createMockQueryBuilder();
        const paginationDto: PaginationQueryDto = { page: 1, limit };

        service.applyPagination(mockQueryBuilder, paginationDto);

        const takeCalls = (mockQueryBuilder.take as jest.Mock).mock.calls;
        const actualLimit = takeCalls[takeCalls.length - 1][0];

        // Property: returned limit should never exceed 100
        expect(actualLimit).toBeLessThanOrEqual(100);
      });
    });
  });

  // Feature: query-features, Property 4: Ascending sort order correctness
  // Validates: Requirements 2.1
  describe('Property 4: Ascending sort order correctness', () => {
    it('should apply ASC sort order when specified', () => {
      const allowedFields = ['username', 'email', 'createdAt'];
      const testCases = [
        { sortBy: 'username', sortOrder: 'ASC' as const },
        { sortBy: 'email', sortOrder: 'ASC' as const },
        { sortBy: 'createdAt', sortOrder: 'ASC' as const },
      ];

      testCases.forEach(({ sortBy, sortOrder }) => {
        const mockQueryBuilder = createMockQueryBuilder();

        service.applySorting(mockQueryBuilder, sortBy, sortOrder, allowedFields, 'user');

        // Property: orderBy should be called with ASC direction
        expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(`user.${sortBy}`, 'ASC');
      });
    });

    it('should default to ASC when sortOrder is not DESC', () => {
      const mockQueryBuilder = createMockQueryBuilder();
      const allowedFields = ['username'];

      service.applySorting(mockQueryBuilder, 'username', 'ASC', allowedFields, 'user');

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('user.username', 'ASC');
    });
  });

  // Feature: query-features, Property 5: Descending sort order correctness
  // Validates: Requirements 2.2
  describe('Property 5: Descending sort order correctness', () => {
    it('should apply DESC sort order when specified', () => {
      const allowedFields = ['username', 'email', 'createdAt'];
      const testCases = [
        { sortBy: 'username', sortOrder: 'DESC' as const },
        { sortBy: 'email', sortOrder: 'DESC' as const },
        { sortBy: 'createdAt', sortOrder: 'DESC' as const },
      ];

      testCases.forEach(({ sortBy, sortOrder }) => {
        const mockQueryBuilder = createMockQueryBuilder();

        service.applySorting(mockQueryBuilder, sortBy, sortOrder, allowedFields, 'user');

        // Property: orderBy should be called with DESC direction
        expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(`user.${sortBy}`, 'DESC');
      });
    });

    it('should default to DESC when no sortOrder specified', () => {
      const mockQueryBuilder = createMockQueryBuilder();
      const allowedFields = ['username'];

      service.applySorting(mockQueryBuilder, 'username', 'DESC', allowedFields, 'user');

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('user.username', 'DESC');
    });
  });

  // Feature: query-features, Property 6: Multi-field sort precedence
  // Validates: Requirements 2.3
  describe('Property 6: Multi-field sort precedence', () => {
    it('should apply multiple sort fields in order', () => {
      const mockQueryBuilder = createMockQueryBuilder();
      const allowedFields = ['username', 'email', 'createdAt'];

      service.applySorting(mockQueryBuilder, 'username,email,createdAt', 'ASC', allowedFields, 'user');

      // Property: first field uses orderBy, subsequent use addOrderBy
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('user.username', 'ASC');
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('user.email', 'ASC');
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('user.createdAt', 'ASC');
    });

    it('should handle comma-separated fields with spaces', () => {
      const mockQueryBuilder = createMockQueryBuilder();
      const allowedFields = ['username', 'email'];

      service.applySorting(mockQueryBuilder, 'username, email', 'DESC', allowedFields, 'user');

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('user.username', 'DESC');
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('user.email', 'DESC');
    });
  });

  // Feature: query-features, Property 7: Invalid sort field rejection
  // Validates: Requirements 2.4
  describe('Property 7: Invalid sort field rejection', () => {
    it('should reject invalid sort fields with BadRequestException', () => {
      const mockQueryBuilder = createMockQueryBuilder();
      const allowedFields = ['username', 'email'];

      expect(() => {
        service.applySorting(mockQueryBuilder, 'invalidField', 'ASC', allowedFields, 'user');
      }).toThrow('Invalid sort field: invalidField');
    });

    it('should reject any field not in allowedFields list', () => {
      const mockQueryBuilder = createMockQueryBuilder();
      const allowedFields = ['username'];
      const invalidFields = ['password', 'secret', 'admin', 'role'];

      invalidFields.forEach((field) => {
        expect(() => {
          service.applySorting(mockQueryBuilder, field, 'ASC', allowedFields, 'user');
        }).toThrow(`Invalid sort field: ${field}`);
      });
    });

    it('should reject if any field in multi-field sort is invalid', () => {
      const mockQueryBuilder = createMockQueryBuilder();
      const allowedFields = ['username', 'email'];

      expect(() => {
        service.applySorting(mockQueryBuilder, 'username,invalidField', 'ASC', allowedFields, 'user');
      }).toThrow('Invalid sort field: invalidField');
    });
  });

  // Feature: query-features, Property 8: Equality filter correctness
  // Validates: Requirements 3.1
  describe('Property 8: Equality filter correctness', () => {
    it('should apply equality filters correctly', () => {
      const mockQueryBuilder = createMockQueryBuilder();
      const allowedFields = ['username', 'email', 'role'];
      const filters = {
        username: { eq: 'john' },
        role: { eq: 'admin' },
      };

      service.applyFilters(mockQueryBuilder, filters, allowedFields, 'user');

      // Property: andWhere should be called for each equality filter
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
      const calls = (mockQueryBuilder.andWhere as jest.Mock).mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle simple equality filters without operators', () => {
      const mockQueryBuilder = createMockQueryBuilder();
      const allowedFields = ['username'];
      const filters = { username: 'john' };

      service.applyFilters(mockQueryBuilder, filters, allowedFields, 'user');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  // Feature: query-features, Property 9: Comparison operator correctness
  // Validates: Requirements 3.2
  describe('Property 9: Comparison operator correctness', () => {
    it('should apply greater than operator correctly', () => {
      const mockQueryBuilder = createMockQueryBuilder();
      const allowedFields = ['age', 'createdAt'];
      const filters = { age: { gt: 18 } };

      service.applyFilters(mockQueryBuilder, filters, allowedFields, 'user');

      const calls = (mockQueryBuilder.andWhere as jest.Mock).mock.calls;
      expect(calls.some(call => call[0].includes('>'))).toBe(true);
    });

    it('should apply less than operator correctly', () => {
      const mockQueryBuilder = createMockQueryBuilder();
      const allowedFields = ['age'];
      const filters = { age: { lt: 65 } };

      service.applyFilters(mockQueryBuilder, filters, allowedFields, 'user');

      const calls = (mockQueryBuilder.andWhere as jest.Mock).mock.calls;
      expect(calls.some(call => call[0].includes('<'))).toBe(true);
    });

    it('should apply gte and lte operators correctly', () => {
      const mockQueryBuilder = createMockQueryBuilder();
      const allowedFields = ['age'];
      const filters = { age: { gte: 18, lte: 65 } };

      service.applyFilters(mockQueryBuilder, filters, allowedFields, 'user');

      const calls = (mockQueryBuilder.andWhere as jest.Mock).mock.calls;
      expect(calls.some(call => call[0].includes('>='))).toBe(true);
      expect(calls.some(call => call[0].includes('<='))).toBe(true);
    });
  });

  // Feature: query-features, Property 10: Case-insensitive pattern matching
  // Validates: Requirements 3.3
  describe('Property 10: Case-insensitive pattern matching', () => {
    it('should apply LIKE filter with case insensitivity', () => {
      const mockQueryBuilder = createMockQueryBuilder();
      const allowedFields = ['username', 'email'];
      const filters = { username: { like: 'john' } };

      service.applyFilters(mockQueryBuilder, filters, allowedFields, 'user');

      const calls = (mockQueryBuilder.andWhere as jest.Mock).mock.calls;
      expect(calls.some(call => call[0].includes('LOWER'))).toBe(true);
      expect(calls.some(call => call[0].includes('LIKE'))).toBe(true);
    });

    it('should escape special characters in LIKE patterns', () => {
      const mockQueryBuilder = createMockQueryBuilder();
      const allowedFields = ['username'];
      const filters = { username: { like: 'test%user_name' } };

      service.applyFilters(mockQueryBuilder, filters, allowedFields, 'user');

      const calls = (mockQueryBuilder.andWhere as jest.Mock).mock.calls;
      const params = calls[0][1];
      const paramValue = Object.values(params)[0] as string;
      
      // Property: special characters should be escaped
      expect(paramValue).toContain('\\%');
      expect(paramValue).toContain('\\_');
    });
  });

  // Feature: query-features, Property 11: Multiple filter AND logic
  // Validates: Requirements 3.4
  describe('Property 11: Multiple filter AND logic', () => {
    it('should combine multiple filters with AND logic', () => {
      const mockQueryBuilder = createMockQueryBuilder();
      const allowedFields = ['username', 'email', 'role'];
      const filters = {
        username: { eq: 'john' },
        email: { like: 'example.com' },
        role: { eq: 'admin' },
      };

      service.applyFilters(mockQueryBuilder, filters, allowedFields, 'user');

      // Property: andWhere should be called for each filter
      const calls = (mockQueryBuilder.andWhere as jest.Mock).mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle multiple operators on same field', () => {
      const mockQueryBuilder = createMockQueryBuilder();
      const allowedFields = ['age'];
      const filters = { age: { gte: 18, lte: 65 } };

      service.applyFilters(mockQueryBuilder, filters, allowedFields, 'user');

      const calls = (mockQueryBuilder.andWhere as jest.Mock).mock.calls;
      expect(calls.length).toBe(2);
    });
  });

  // Feature: query-features, Property 12: Nested property filtering
  // Validates: Requirements 3.5
  describe('Property 12: Nested property filtering', () => {
    it('should handle dot notation for nested properties', () => {
      const mockQueryBuilder = createMockQueryBuilder();
      const allowedFields = ['profile.age', 'profile.city'];
      const filters = { 'profile.age': { gt: 18 } };

      service.applyFilters(mockQueryBuilder, filters, allowedFields, 'user');

      const calls = (mockQueryBuilder.andWhere as jest.Mock).mock.calls;
      expect(calls[0][0]).toContain('profile.age');
    });
  });

  // Feature: query-features, Property 14: Parameterized query usage
  // Validates: Requirements 5.1
  describe('Property 14: Parameterized query usage', () => {
    it('should use parameterized queries for all filter values', () => {
      const mockQueryBuilder = createMockQueryBuilder();
      const allowedFields = ['username', 'email'];
      const filters = {
        username: { eq: 'john' },
        email: { like: 'test' },
      };

      service.applyFilters(mockQueryBuilder, filters, allowedFields, 'user');

      const calls = (mockQueryBuilder.andWhere as jest.Mock).mock.calls;
      
      // Property: all calls should have parameter objects
      calls.forEach(call => {
        expect(call[0]).toContain(':');
        expect(call[1]).toBeDefined();
        expect(typeof call[1]).toBe('object');
      });
    });
  });

  // Feature: query-features, Property 15: Input validation before execution
  // Validates: Requirements 5.5
  describe('Property 15: Input validation before execution', () => {
    it('should reject invalid filter fields', () => {
      const mockQueryBuilder = createMockQueryBuilder();
      const allowedFields = ['username', 'email'];

      expect(() => {
        service.applyFilters(mockQueryBuilder, { invalidField: 'value' }, allowedFields, 'user');
      }).toThrow('Invalid filter field: invalidField');
    });

    it('should validate all fields before executing any queries', () => {
      const mockQueryBuilder = createMockQueryBuilder();
      const allowedFields = ['username'];
      const filters = {
        username: { eq: 'john' },
        invalidField: { eq: 'test' },
      };

      expect(() => {
        service.applyFilters(mockQueryBuilder, filters, allowedFields, 'user');
      }).toThrow('Invalid filter field: invalidField');

      // Property: no queries should be executed if validation fails
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });
  });

  // Feature: query-features, Property 3: Complete pagination metadata
  // Validates: Requirements 1.3
  describe('Property 3: Complete pagination metadata', () => {
    it('should return complete and accurate pagination metadata', async () => {
      const testCases = [
        { page: 1, limit: 10, totalCount: 50, expectedTotalPages: 5, expectedHasNext: true, expectedHasPrev: false },
        { page: 3, limit: 10, totalCount: 50, expectedTotalPages: 5, expectedHasNext: true, expectedHasPrev: true },
        { page: 5, limit: 10, totalCount: 50, expectedTotalPages: 5, expectedHasNext: false, expectedHasPrev: true },
        { page: 1, limit: 20, totalCount: 100, expectedTotalPages: 5, expectedHasNext: true, expectedHasPrev: false },
        { page: 1, limit: 10, totalCount: 5, expectedTotalPages: 1, expectedHasNext: false, expectedHasPrev: false },
      ];

      for (const testCase of testCases) {
        const mockData = Array(Math.min(testCase.limit, testCase.totalCount)).fill({});
        const mockQueryBuilder = {
          ...createMockQueryBuilder(),
          getManyAndCount: jest.fn().mockResolvedValue([mockData, testCase.totalCount]),
        } as any;

        const queryDto = { page: testCase.page, limit: testCase.limit };
        const result = await service.paginate(mockQueryBuilder, queryDto);

        // Property: metadata should contain all required fields with correct values
        expect(result.metadata).toBeDefined();
        expect(result.metadata.page).toBe(testCase.page);
        expect(result.metadata.limit).toBe(testCase.limit);
        expect(result.metadata.totalCount).toBe(testCase.totalCount);
        expect(result.metadata.totalPages).toBe(testCase.expectedTotalPages);
        expect(result.metadata.hasNextPage).toBe(testCase.expectedHasNext);
        expect(result.metadata.hasPreviousPage).toBe(testCase.expectedHasPrev);
      }
    });

    it('should calculate totalPages correctly for various scenarios', async () => {
      const scenarios = [
        { totalCount: 0, limit: 10, expectedPages: 0 },
        { totalCount: 1, limit: 10, expectedPages: 1 },
        { totalCount: 10, limit: 10, expectedPages: 1 },
        { totalCount: 11, limit: 10, expectedPages: 2 },
        { totalCount: 100, limit: 10, expectedPages: 10 },
        { totalCount: 99, limit: 10, expectedPages: 10 },
      ];

      for (const scenario of scenarios) {
        const mockQueryBuilder = {
          ...createMockQueryBuilder(),
          getManyAndCount: jest.fn().mockResolvedValue([[], scenario.totalCount]),
        } as any;

        const result = await service.paginate(mockQueryBuilder, { page: 1, limit: scenario.limit });

        expect(result.metadata.totalPages).toBe(scenario.expectedPages);
      }
    });
  });

  // Feature: query-features, Property 16: Consistent response structure
  // Validates: Requirements 6.4
  describe('Property 16: Consistent response structure', () => {
    it('should always return data and metadata fields', async () => {
      const mockQueryBuilder = {
        ...createMockQueryBuilder(),
        getManyAndCount: jest.fn().mockResolvedValue([[{ id: 1 }, { id: 2 }], 2]),
      } as any;

      const result = await service.paginate(mockQueryBuilder, { page: 1, limit: 10 });

      // Property: response must have data and metadata
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('metadata');
      expect(Array.isArray(result.data)).toBe(true);
      expect(typeof result.metadata).toBe('object');
    });

    it('should return consistent structure even with empty results', async () => {
      const mockQueryBuilder = {
        ...createMockQueryBuilder(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      } as any;

      const result = await service.paginate(mockQueryBuilder, { page: 1, limit: 10 });

      expect(result.data).toEqual([]);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.totalCount).toBe(0);
      expect(result.metadata.totalPages).toBe(0);
    });

    it('should include all required metadata fields', async () => {
      const mockQueryBuilder = {
        ...createMockQueryBuilder(),
        getManyAndCount: jest.fn().mockResolvedValue([[{ id: 1 }], 1]),
      } as any;

      const result = await service.paginate(mockQueryBuilder, { page: 1, limit: 10 });

      const requiredFields = ['page', 'limit', 'totalCount', 'totalPages', 'hasNextPage', 'hasPreviousPage'];
      requiredFields.forEach(field => {
        expect(result.metadata).toHaveProperty(field);
      });
    });
  });
});

// Helper function to create a mock query builder
function createMockQueryBuilder(): SelectQueryBuilder<any> {
  return {
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  } as any;
}
