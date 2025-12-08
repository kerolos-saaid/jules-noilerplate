import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { ClsService } from "nestjs-cls";

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  constructor(private readonly cls: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();
    const requestId = this.cls.getId();
    response.header("X-Request-Id", requestId);
    return next.handle();
  }
}
