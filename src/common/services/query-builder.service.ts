import { Injectable, BadRequestException } from "@nestjs/common";
import { SelectQueryBuilder, ObjectLiteral } from "typeorm";
import { PaginationQueryDto } from "../dto/pagination-query.dto";
import { QueryDto } from "../dto/query.dto";
import { PaginatedResponse } from "../interfaces/paginated-response.interface";
import { FilterOperator } from "../enums/filter-operator.enum";

@Injectable()
export class QueryBuilderService {
  /**
   * Apply pagination to a query builder
   * @param queryBuilder - TypeORM SelectQueryBuilder
   * @param paginationDto - Pagination parameters
   * @returns Modified query builder with pagination applied
   */
  applyPagination<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    paginationDto: PaginationQueryDto,
  ): SelectQueryBuilder<T> {
    const page = paginationDto.page || 1;
    const limit = Math.min(paginationDto.limit || 10, 100);
    const skip = (page - 1) * limit;

    return queryBuilder.skip(skip).take(limit);
  }

  /**
   * Apply sorting to a query builder
   * @param queryBuilder - TypeORM SelectQueryBuilder
   * @param sortBy - Field(s) to sort by (comma-separated for multiple)
   * @param sortOrder - Sort direction (ASC or DESC)
   * @param allowedFields - List of fields that can be sorted
   * @param alias - Entity alias used in the query
   * @returns Modified query builder with sorting applied
   */
  applySorting<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    sortBy: string | undefined,
    sortOrder: "ASC" | "DESC" = "DESC",
    allowedFields: string[],
    alias: string,
  ): SelectQueryBuilder<T> {
    // Default to 'id' DESC if no sort specified
    if (!sortBy) {
      return queryBuilder.orderBy(`${alias}.id`, "DESC");
    }

    // Support multiple sort fields (comma-separated)
    const sortFields = sortBy.split(",").map((field) => field.trim());

    // Validate all sort fields are in allowedFields list
    for (const field of sortFields) {
      if (!allowedFields.includes(field)) {
        throw new BadRequestException(
          `Invalid sort field: ${field}. Allowed fields: ${allowedFields.join(", ")}`,
        );
      }
    }

    // Apply sorting - first field uses orderBy, subsequent fields use addOrderBy
    sortFields.forEach((field, index) => {
      if (index === 0) {
        queryBuilder.orderBy(`${alias}.${field}`, sortOrder);
      } else {
        queryBuilder.addOrderBy(`${alias}.${field}`, sortOrder);
      }
    });

    return queryBuilder;
  }

  /**
   * Apply filters to a query builder
   * @param queryBuilder - TypeORM SelectQueryBuilder
   * @param filters - Filter object with field names and operators
   * @param allowedFields - List of fields that can be filtered
   * @param alias - Entity alias used in the query
   * @returns Modified query builder with filters applied
   */
  applyFilters<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    filters: Record<string, any> | undefined,
    allowedFields: string[],
    alias: string,
  ): SelectQueryBuilder<T> {
    if (!filters || Object.keys(filters).length === 0) {
      return queryBuilder;
    }

    // Validate all filter fields upfront before processing any
    Object.keys(filters).forEach((field) => {
      if (!allowedFields.includes(field)) {
        throw new BadRequestException(
          `Invalid filter field: ${field}. Allowed fields: ${allowedFields.join(", ")}`,
        );
      }
    });

    Object.entries(filters).forEach(([field, filterValue]) => {
      // Handle nested property filters using dot notation
      const fieldPath = field.includes(".") ? field : `${alias}.${field}`;

      // If filterValue is an object with operators
      if (
        typeof filterValue === "object" &&
        filterValue !== null &&
        !Array.isArray(filterValue)
      ) {
        Object.entries(filterValue).forEach(([operator, value]) => {
          this.applyFilterOperator(
            queryBuilder,
            fieldPath,
            operator,
            value,
            field,
          );
        });
      } else {
        // Simple equality filter
        const paramName = this.generateParamName(field);
        queryBuilder.andWhere(`${fieldPath} = :${paramName}`, {
          [paramName]: filterValue,
        });
      }
    });

    return queryBuilder;
  }

  /**
   * Apply a specific filter operator
   * @param queryBuilder - TypeORM SelectQueryBuilder
   * @param fieldPath - Full field path (with alias)
   * @param operator - Filter operator
   * @param value - Filter value
   * @param field - Original field name for parameter naming
   */
  private applyFilterOperator<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    fieldPath: string,
    operator: string,
    value: any,
    field: string,
  ): void {
    const paramName = this.generateParamName(field, operator);

    switch (operator) {
      case FilterOperator.EQUALS as string:
        queryBuilder.andWhere(`${fieldPath} = :${paramName}`, {
          [paramName]: value,
        });
        break;
      case FilterOperator.NOT_EQUALS as string:
        queryBuilder.andWhere(`${fieldPath} != :${paramName}`, {
          [paramName]: value,
        });
        break;
      case FilterOperator.GREATER_THAN as string:
        queryBuilder.andWhere(`${fieldPath} > :${paramName}`, {
          [paramName]: value,
        });
        break;
      case FilterOperator.GREATER_THAN_OR_EQUAL as string:
        queryBuilder.andWhere(`${fieldPath} >= :${paramName}`, {
          [paramName]: value,
        });
        break;
      case FilterOperator.LESS_THAN as string:
        queryBuilder.andWhere(`${fieldPath} < :${paramName}`, {
          [paramName]: value,
        });
        break;
      case FilterOperator.LESS_THAN_OR_EQUAL as string:
        queryBuilder.andWhere(`${fieldPath} <= :${paramName}`, {
          [paramName]: value,
        });
        break;
      case FilterOperator.LIKE as string:
        // Escape special characters in LIKE patterns
        // eslint-disable-next-line no-case-declarations
        const escapedValue = this.escapeLikePattern(value as string);
        queryBuilder.andWhere(`LOWER(${fieldPath}) LIKE LOWER(:${paramName})`, {
          [paramName]: `%${escapedValue}%`,
        });
        break;
      case FilterOperator.IN as string:
        if (Array.isArray(value)) {
          queryBuilder.andWhere(`${fieldPath} IN (:...${paramName})`, {
            [paramName]: value,
          });
        }
        break;
      default:
        throw new BadRequestException(
          `Unsupported filter operator: ${operator}`,
        );
    }
  }

  /**
   * Generate a unique parameter name for query binding
   * @param field - Field name
   * @param operator - Optional operator suffix
   * @returns Unique parameter name
   */
  private generateParamName(field: string, operator?: string): string {
    const sanitizedField = field.replace(/\./g, "_");
    const timestamp = Date.now();
    return operator
      ? `${sanitizedField}_${operator}_${timestamp}`
      : `${sanitizedField}_${timestamp}`;
  }

  /**
   * Escape special characters in LIKE patterns
   * @param pattern - Pattern string
   * @returns Escaped pattern
   */
  private escapeLikePattern(pattern: string): string {
    if (typeof pattern !== "string") {
      return pattern;
    }
    // Escape backslash first, then special SQL LIKE characters: % and _
    return pattern.replace(/\\/g, "\\\\").replace(/[%_]/g, "\\$&");
  }

  /**
   * Execute paginated query and return results with metadata
   * @param queryBuilder - TypeORM SelectQueryBuilder
   * @param queryDto - Query parameters (pagination, sorting, filters)
   * @returns Paginated response with data and metadata
   */
  async paginate<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    queryDto: QueryDto,
  ): Promise<PaginatedResponse<T>> {
    const page = queryDto.page || 1;
    const limit = Math.min(queryDto.limit || 10, 100);

    // Execute query to get both data and total count
    const [data, totalCount] = await queryBuilder.getManyAndCount();

    // Calculate metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      data,
      metadata: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    };
  }
}
