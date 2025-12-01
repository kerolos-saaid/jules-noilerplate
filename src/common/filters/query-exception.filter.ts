import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

/**
 * Standardized error response structure
 */
interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  details?: any;
}

/**
 * Global exception filter for handling query-related errors
 * Provides standardized error responses for validation and database errors
 */
@Catch()
export class QueryExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'InternalServerError';
    let details: any = undefined;

    // Handle HTTP exceptions (including validation errors)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        error = responseObj.error || exception.name;
        
        // Include validation details if present
        if (Array.isArray(responseObj.message)) {
          details = responseObj.message;
        }
      } else {
        message = exceptionResponse as string;
        error = exception.name;
      }
    }
    // Handle TypeORM query errors
    else if (exception instanceof QueryFailedError) {
      status = HttpStatus.BAD_REQUEST;
      error = 'QueryError';
      message = 'Database query failed';
      
      // Extract useful information from the query error
      const queryError = exception as any;
      
      // Handle specific database errors
      if (queryError.code === '23505') {
        // Unique constraint violation
        status = HttpStatus.CONFLICT;
        error = 'ConflictError';
        message = 'Resource already exists';
      } else if (queryError.code === '23503') {
        // Foreign key constraint violation
        status = HttpStatus.BAD_REQUEST;
        error = 'ReferenceError';
        message = 'Referenced resource does not exist';
      } else if (queryError.code === '22P02') {
        // Invalid text representation
        status = HttpStatus.BAD_REQUEST;
        error = 'ValidationError';
        message = 'Invalid data format';
      }
      
      // In development, include more details
      if (process.env.NODE_ENV !== 'production') {
        details = {
          code: queryError.code,
          detail: queryError.detail,
          query: queryError.query,
        };
      }
    }
    // Handle generic errors
    else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
      
      // In development, include stack trace
      if (process.env.NODE_ENV !== 'production') {
        details = {
          stack: exception.stack,
        };
      }
    }

    // Build standardized error response
    const errorResponse: ErrorResponse = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Only include details if they exist
    if (details !== undefined) {
      errorResponse.details = details;
    }

    response.status(status).json(errorResponse);
  }
}
