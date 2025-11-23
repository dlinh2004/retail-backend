import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { User } from './users/user.entity';
import { Product } from './products/product.entity';
import { Sale } from './sales/sale.entity';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { SalesModule } from './sales/sales.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthModule } from './auth/auth.module'; // <-- thêm AuthModule

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: '123456',
      database: 'retaildb',
      entities: [User, Product, Sale],
      synchronize: true,
    }),

    UsersModule,
    ProductsModule,
    SalesModule,
    AnalyticsModule,
    AuthModule, // <-- thêm vào đây
  ],
})
export class AppModule {}
