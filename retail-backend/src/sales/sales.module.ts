import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from './sale.entity';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { User } from '../users/user.entity';
import { Product } from '../products/product.entity';
import { SqsProducer } from './sqs.producer';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale, User, Product]), // Thêm Product vào đây
  ],
  providers: [SalesService, SqsProducer],
  controllers: [SalesController],
})
export class SalesModule {}
