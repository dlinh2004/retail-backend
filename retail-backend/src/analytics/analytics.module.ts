import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { ProductsModule } from '../products/products.module';
import { SalesModule } from '../sales/sales.module';
import { User } from '../users/user.entity';
import { Product } from '../products/product.entity';
import { Sale } from '../sales/sale.entity';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { SqsConsumer } from './sqs.consumer';
import { ForecastService } from './forecast.service';
import { ForecastController } from './forecast.controller';
import { AnalyticsResult } from './analytics-result.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Product, Sale, AnalyticsResult]),
    UsersModule,
    ProductsModule,
    SalesModule,
  ],
  providers: [AnalyticsService, SqsConsumer, ForecastService],
  controllers: [AnalyticsController, ForecastController],
  exports: [AnalyticsService, ForecastService], // export ForecastService để controller nhận được
})
export class AnalyticsModule {}
