import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { CloudWatchLoggerService } from './cloudwatch-logger.service';
import { CloudWatchMetricsService } from './cloudwatch-metrics.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: CloudWatchLoggerService,
    private readonly metrics: CloudWatchMetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, headers } = request;
    const startTime = Date.now();

    const logData = {
      method,
      url,
      body: this.sanitizeBody(body),
      userAgent: headers['user-agent'],
      ip: request.ip,
    };

    this.logger.log({
      type: 'REQUEST',
      ...logData,
    }, 'HTTP');

    return next.handle().pipe(
      tap(async (data) => {
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;
        const latency = Date.now() - startTime;

        this.logger.log({
          type: 'RESPONSE',
          method,
          url,
          statusCode,
          latency: `${latency}ms`,
        }, 'HTTP');

        // Send metrics to CloudWatch
        await this.metrics.recordAPILatency(url, latency);
        await this.metrics.recordAPIRequest(url, method, statusCode);
      }),
      catchError(async (error) => {
        const latency = Date.now() - startTime;
        
        this.logger.error({
          type: 'ERROR',
          method,
          url,
          error: error.message,
          stack: error.stack,
          latency: `${latency}ms`,
        }, error.stack, 'HTTP');

        // Record error metric
        await this.metrics.recordAPIError(url, error.name || 'UnknownError');
        
        throw error;
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;
    
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];
    const sanitized = { ...body };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }
    
    return sanitized;
  }
}
