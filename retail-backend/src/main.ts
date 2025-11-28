import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CloudWatchLoggerService } from './observability/cloudwatch-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Use CloudWatch logger
  const logger = app.get(CloudWatchLoggerService);
  app.useLogger(logger);

  // Allow CORS for development: accept requests from local dev servers
  app.enableCors({
    origin: true,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  
  logger.log(`Application is running on port ${port}`, 'Bootstrap');
}
bootstrap();
