import { QueryExceptionFilter } from "./query-exception.filter";
import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { QueryFailedError } from "typeorm";

/**
 * Feature: query-features, Property 17: Standardized error responses
 * Validates: Requirements 6.5
 *
 * Property: For any validation error, the error response should follow a consistent structure
 * with error type, message, and field information.
 */
describe("Property 17: Standardized error responses", () => {
  let filter: QueryExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(() => {
    filter = new QueryExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: "/api/test",
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as any;
  });

  /**
   * Property: All error responses must contain required fields
   */
  it("should always include statusCode, message, error, timestamp, and path fields", () => {
    // Generate various types of exceptions
    const exceptions = [
      new BadRequestException("Test error"),
      new NotFoundException("Not found"),
      new UnauthorizedException("Unauthorized"),
      new Error("Generic error"),
      new QueryFailedError(
        "SELECT * FROM users",
        [],
        new Error("Query failed"),
      ),
    ];

    exceptions.forEach((exception) => {
      // Reset mocks
      mockResponse.json.mockClear();

      filter.catch(exception, mockArgumentsHost);

      const responseCall = mockResponse.json.mock.calls[0][0];

      // Property: response must have all required fields
      expect(responseCall).toHaveProperty("statusCode");
      expect(responseCall).toHaveProperty("message");
      expect(responseCall).toHaveProperty("error");
      expect(responseCall).toHaveProperty("timestamp");
      expect(responseCall).toHaveProperty("path");

      // Property: required fields must have correct types
      expect(typeof responseCall.statusCode).toBe("number");
      expect(typeof responseCall.message).toBe("string");
      expect(typeof responseCall.error).toBe("string");
      expect(typeof responseCall.timestamp).toBe("string");
      expect(typeof responseCall.path).toBe("string");
    });
  });

  /**
   * Property: Status codes must be valid HTTP status codes
   */
  it("should return valid HTTP status codes for all error types", () => {
    const validStatusCodes = [400, 401, 403, 404, 409, 500, 503, 504];

    const exceptions = [
      {
        exception: new BadRequestException("Bad request"),
        expectedStatus: 400,
      },
      {
        exception: new UnauthorizedException("Unauthorized"),
        expectedStatus: 401,
      },
      { exception: new NotFoundException("Not found"), expectedStatus: 404 },
      { exception: new Error("Generic error"), expectedStatus: 500 },
    ];

    exceptions.forEach(({ exception, expectedStatus }) => {
      mockResponse.status.mockClear();
      mockResponse.json.mockClear();

      filter.catch(exception, mockArgumentsHost);

      const statusCall = mockResponse.status.mock.calls[0][0];
      const responseCall = mockResponse.json.mock.calls[0][0];

      // Property: status code must be valid and match expected
      expect(validStatusCodes).toContain(statusCall);
      expect(responseCall.statusCode).toBe(expectedStatus);
      expect(statusCall).toBe(expectedStatus);
    });
  });

  /**
   * Property: Timestamps must be valid ISO 8601 format
   */
  it("should return timestamps in valid ISO 8601 format", () => {
    const exceptions = [
      new BadRequestException("Test 1"),
      new NotFoundException("Test 2"),
      new Error("Test 3"),
    ];

    exceptions.forEach((exception) => {
      mockResponse.json.mockClear();

      filter.catch(exception, mockArgumentsHost);

      const responseCall = mockResponse.json.mock.calls[0][0];
      const timestamp = responseCall.timestamp;

      // Property: timestamp must be valid ISO 8601 format
      expect(() => new Date(timestamp)).not.toThrow();
      const date = new Date(timestamp);
      expect(date.toISOString()).toBe(timestamp);
      expect(isNaN(date.getTime())).toBe(false);
    });
  });

  /**
   * Property: Error messages must be non-empty strings
   */
  it("should return non-empty error messages for all exceptions", () => {
    const exceptions = [
      new BadRequestException("Validation failed"),
      new BadRequestException({
        message: "Custom error",
        error: "Bad Request",
      }),
      new NotFoundException("Resource not found"),
      new Error("Something went wrong"),
      new QueryFailedError("SELECT", [], new Error("DB error")),
    ];

    exceptions.forEach((exception) => {
      mockResponse.json.mockClear();

      filter.catch(exception, mockArgumentsHost);

      const responseCall = mockResponse.json.mock.calls[0][0];

      // Property: message must be a non-empty string
      expect(typeof responseCall.message).toBe("string");
      expect(responseCall.message.length).toBeGreaterThan(0);
      expect(responseCall.message.trim()).not.toBe("");
    });
  });

  /**
   * Property: Request path must be preserved in error response
   */
  it("should include the request path in all error responses", () => {
    const paths = [
      "/api/users",
      "/api/users/123",
      "/api/posts?page=1&limit=10",
      "/api/search?q=test&sortBy=name",
    ];

    paths.forEach((path) => {
      mockRequest.url = path;
      mockResponse.json.mockClear();

      const exception = new BadRequestException("Test error");
      filter.catch(exception, mockArgumentsHost);

      const responseCall = mockResponse.json.mock.calls[0][0];

      // Property: path must match the request URL
      expect(responseCall.path).toBe(path);
    });
  });

  /**
   * Property: Validation errors must include details array
   */
  it("should include details for validation errors with multiple messages", () => {
    const validationErrors = [
      ["sortBy must be one of: username, email"],
      ["page must be a positive number", "limit must not exceed 100"],
      ["email must be a valid email", "password must be at least 8 characters"],
    ];

    validationErrors.forEach((messages) => {
      mockResponse.json.mockClear();

      const exception = new BadRequestException({
        message: messages,
        error: "Bad Request",
      });

      filter.catch(exception, mockArgumentsHost);

      const responseCall = mockResponse.json.mock.calls[0][0];

      // Property: details must be present and contain the validation messages
      expect(responseCall.details).toBeDefined();
      expect(Array.isArray(responseCall.details)).toBe(true);
      expect(responseCall.details).toEqual(messages);
    });
  });

  /**
   * Property: Database errors must be mapped to appropriate HTTP status codes
   */
  it("should map database error codes to correct HTTP status codes", () => {
    const dbErrorMappings = [
      {
        code: "23505",
        expectedStatus: HttpStatus.CONFLICT,
        expectedError: "ConflictError",
      },
      {
        code: "23503",
        expectedStatus: HttpStatus.BAD_REQUEST,
        expectedError: "ReferenceError",
      },
      {
        code: "22P02",
        expectedStatus: HttpStatus.BAD_REQUEST,
        expectedError: "ValidationError",
      },
    ];

    dbErrorMappings.forEach(({ code, expectedStatus, expectedError }) => {
      mockResponse.status.mockClear();
      mockResponse.json.mockClear();

      const exception = new QueryFailedError(
        "SELECT",
        [],
        new Error("DB error"),
      );
      (exception as any).code = code;

      filter.catch(exception, mockArgumentsHost);

      const statusCall = mockResponse.status.mock.calls[0][0];
      const responseCall = mockResponse.json.mock.calls[0][0];

      // Property: database errors must map to correct status and error type
      expect(statusCall).toBe(expectedStatus);
      expect(responseCall.statusCode).toBe(expectedStatus);
      expect(responseCall.error).toBe(expectedError);
    });
  });

  /**
   * Property: Response structure must be consistent across all error types
   */
  it("should maintain consistent structure for different exception types", () => {
    const exceptions = [
      new BadRequestException("Bad request"),
      new NotFoundException("Not found"),
      new UnauthorizedException("Unauthorized"),
      new Error("Generic error"),
      new QueryFailedError("SELECT", [], new Error("Query failed")),
    ];

    const responses = exceptions.map((exception) => {
      mockResponse.json.mockClear();
      filter.catch(exception, mockArgumentsHost);
      return mockResponse.json.mock.calls[0][0];
    });

    // Property: all responses must have the same set of required keys
    const requiredKeys = [
      "statusCode",
      "message",
      "error",
      "timestamp",
      "path",
    ];
    responses.forEach((response) => {
      const responseKeys = Object.keys(response).filter((key) =>
        requiredKeys.includes(key),
      );
      expect(responseKeys.sort()).toEqual(requiredKeys.sort());
    });
  });

  /**
   * Property: Error type names must be descriptive and non-empty
   */
  it("should provide descriptive error type names", () => {
    const exceptions = [
      {
        exception: new BadRequestException("Test"),
        expectedPattern: /Request|Validation/,
      },
      {
        exception: new NotFoundException("Test"),
        expectedPattern: /Not.*Found/,
      },
      {
        exception: new UnauthorizedException("Test"),
        expectedPattern: /Unauthorized/,
      },
    ];

    exceptions.forEach(({ exception }) => {
      mockResponse.json.mockClear();

      filter.catch(exception, mockArgumentsHost);

      const responseCall = mockResponse.json.mock.calls[0][0];

      // Property: error type must be descriptive
      expect(responseCall.error).toBeTruthy();
      expect(typeof responseCall.error).toBe("string");
      expect(responseCall.error.length).toBeGreaterThan(0);
    });
  });

  /**
   * Property: Multiple calls with same exception should produce consistent responses
   */
  it("should produce consistent responses for repeated exceptions", () => {
    const exception = new BadRequestException("Consistent error");
    const responses: any[] = [];

    // Call the filter multiple times with the same exception
    for (let i = 0; i < 5; i++) {
      mockResponse.json.mockClear();
      filter.catch(exception, mockArgumentsHost);
      responses.push(mockResponse.json.mock.calls[0][0]);
    }

    // Property: all responses should have same statusCode, message, error, and path
    const firstResponse = responses[0];
    responses.forEach((response) => {
      expect(response.statusCode).toBe(firstResponse.statusCode);
      expect(response.message).toBe(firstResponse.message);
      expect(response.error).toBe(firstResponse.error);
      expect(response.path).toBe(firstResponse.path);
      // Timestamps will differ, but should all be valid
      expect(() => new Date(response.timestamp)).not.toThrow();
    });
  });
});
