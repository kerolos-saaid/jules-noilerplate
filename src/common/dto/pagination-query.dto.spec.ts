import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { PaginationQueryDto } from "./pagination-query.dto";

describe("PaginationQueryDto", () => {
  // Feature: query-features, Property 13: Type conversion correctness
  // Validates: Requirements 4.4
  describe("Property 13: Type conversion correctness", () => {
    it("should convert string inputs to number types for page and limit", async () => {
      // Generate multiple test cases with random valid values
      const testCases = Array.from({ length: 100 }, () => ({
        page: String(Math.floor(Math.random() * 100) + 1), // Random page 1-100
        limit: String(Math.floor(Math.random() * 100) + 1), // Random limit 1-100
      }));

      for (const testCase of testCases) {
        // Transform plain object with string values to DTO instance
        const dto = plainToInstance(PaginationQueryDto, testCase);

        // Validate the DTO
        const errors = await validate(dto);

        // Assert no validation errors
        expect(errors).toHaveLength(0);

        // Assert types are converted to numbers
        expect(typeof dto.page).toBe("number");
        expect(typeof dto.limit).toBe("number");

        // Assert values are correctly converted
        expect(dto.page).toBe(Number(testCase.page));
        expect(dto.limit).toBe(Number(testCase.limit));
      }
    });

    it("should handle edge cases: minimum and maximum values", async () => {
      const edgeCases = [
        { page: "1", limit: "1" }, // Minimum values
        { page: "1", limit: "100" }, // Maximum limit
        { page: "999999", limit: "50" }, // Large page number
      ];

      for (const testCase of edgeCases) {
        const dto = plainToInstance(PaginationQueryDto, testCase);
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
        expect(typeof dto.page).toBe("number");
        expect(typeof dto.limit).toBe("number");
        expect(dto.page).toBe(Number(testCase.page));
        expect(dto.limit).toBe(Number(testCase.limit));
      }
    });

    it("should reject invalid string inputs that cannot be converted to numbers", async () => {
      const invalidCases = [
        { page: "abc", limit: "10" },
        { page: "10", limit: "xyz" },
        { page: "not-a-number", limit: "also-not-a-number" },
      ];

      for (const testCase of invalidCases) {
        const dto = plainToInstance(PaginationQueryDto, testCase);
        const errors = await validate(dto);

        // Should have validation errors for non-numeric strings
        expect(errors.length).toBeGreaterThan(0);
      }
    });

    it("should apply default values when fields are undefined", async () => {
      const dto = plainToInstance(PaginationQueryDto, {});
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(10);
    });

    it("should reject values outside valid ranges", async () => {
      const invalidRangeCases = [
        { page: "0", limit: "10" }, // page < 1
        { page: "-5", limit: "10" }, // negative page
        { page: "1", limit: "0" }, // limit < 1
        { page: "1", limit: "101" }, // limit > 100
        { page: "1", limit: "-10" }, // negative limit
      ];

      for (const testCase of invalidRangeCases) {
        const dto = plainToInstance(PaginationQueryDto, testCase);
        const errors = await validate(dto);

        // Should have validation errors for out-of-range values
        expect(errors.length).toBeGreaterThan(0);
      }
    });
  });
});
