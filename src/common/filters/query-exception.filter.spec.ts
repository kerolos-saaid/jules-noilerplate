import { QueryExceptionFilter } from "./query-exception.filter";
import { ArgumentsHost, BadRequestException, HttpStatus } from "@nestjs/common";
import { QueryFailedError } from "typeorm";

describe("QueryExceptionFilter", () => {
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
      url: "/api/users",
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  describe("HTTP Exceptions", () => {
    it("should handle BadRequestException with validation errors", () => {
      const exception = new BadRequestException({
        message: ["sortBy must be one of: username, email"],
        error: "Bad Request",
      });

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          error: "Bad Request",
          path: "/api/users",
          timestamp: expect.any(String),
          details: ["sortBy must be one of: username, email"],
        }),
      );
    });

    it("should handle BadRequestException with string message", () => {
      const exception = new BadRequestException("Invalid query parameter");

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: "Invalid query parameter",
          error: "Bad Request",
          path: "/api/users",
        }),
      );
    });
  });

  describe("Database Errors", () => {
    it("should handle QueryFailedError with unique constraint violation", () => {
      const exception = new QueryFailedError(
        "SELECT * FROM users",
        [],
        new Error("duplicate key value"),
      );

      (exception as any).code = "23505";

      (exception as any).detail =
        "Key (email)=(test@example.com) already exists.";

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.CONFLICT,
          error: "ConflictError",
          message: "Resource already exists",
        }),
      );
    });

    it("should handle QueryFailedError with foreign key constraint violation", () => {
      const exception = new QueryFailedError(
        "INSERT INTO posts",
        [],
        new Error("foreign key constraint"),
      );

      (exception as any).code = "23503";

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          error: "ReferenceError",
          message: "Referenced resource does not exist",
        }),
      );
    });

    it("should handle QueryFailedError with invalid data format", () => {
      const exception = new QueryFailedError(
        "SELECT * FROM users",
        [],
        new Error("invalid input syntax"),
      );

      (exception as any).code = "22P02";

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          error: "ValidationError",
          message: "Invalid data format",
        }),
      );
    });

    it("should handle generic QueryFailedError", () => {
      const exception = new QueryFailedError(
        "SELECT * FROM users",
        [],
        new Error("query failed"),
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          error: "QueryError",
          message: "Database query failed",
        }),
      );
    });
  });

  describe("Generic Errors", () => {
    it("should handle generic Error", () => {
      const exception = new Error("Something went wrong");

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: "Something went wrong",
          error: "Error",
        }),
      );
    });

    it("should handle unknown exception type", () => {
      const exception = "string error";

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: "Internal server error",
          error: "InternalServerError",
        }),
      );
    });
  });

  describe("Response Structure", () => {
    it("should always include required fields in error response", () => {
      const exception = new BadRequestException("Test error");

      filter.catch(exception, mockArgumentsHost);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const responseCall = mockResponse.json.mock.calls[0][0];
      expect(responseCall).toHaveProperty("statusCode");
      expect(responseCall).toHaveProperty("message");
      expect(responseCall).toHaveProperty("error");
      expect(responseCall).toHaveProperty("timestamp");
      expect(responseCall).toHaveProperty("path");
    });

    it("should include timestamp in ISO format", () => {
      const exception = new BadRequestException("Test error");

      filter.catch(exception, mockArgumentsHost);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const responseCall = mockResponse.json.mock.calls[0][0];
      expect(() => new Date(responseCall.timestamp)).not.toThrow();
    });

    it("should include request path", () => {
      const exception = new BadRequestException("Test error");

      filter.catch(exception, mockArgumentsHost);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const responseCall = mockResponse.json.mock.calls[0][0];
      expect(responseCall.path).toBe("/api/users");
    });
  });
});
