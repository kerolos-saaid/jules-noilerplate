import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { Request, Response } from "express";
import { PrometheusService } from "../../modules/prometheus/prometheus.service";

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly prometheusService: PrometheusService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.recordMetrics(request, response, startTime);
        },
        error: () => {
          this.recordMetrics(request, response, startTime);
        },
      }),
    );
  }

  private recordMetrics(
    request: Request,
    response: Response,
    startTime: number,
  ) {
    const duration = (Date.now() - startTime) / 1000;
    const route = (request.route?.path || request.url) as string;
    const method = request.method;
    const statusCode = response.statusCode;

    this.prometheusService.httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode,
    });

    this.prometheusService.httpRequestDuration.observe(
      {
        method,
        route,
        status_code: statusCode,
      },
      duration,
    );
  }
}
