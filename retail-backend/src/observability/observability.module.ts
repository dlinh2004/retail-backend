import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CloudWatchLoggerService } from './cloudwatch-logger.service';
import { CloudWatchMetricsService } from './cloudwatch-metrics.service';
import { LoggingInterceptor } from './logging.interceptor';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    CloudWatchLoggerService,
    CloudWatchMetricsService,
    LoggingInterceptor,
  ],
  exports: [
    CloudWatchLoggerService,
    CloudWatchMetricsService,
    LoggingInterceptor,
  ],
})
export class ObservabilityModule {}
