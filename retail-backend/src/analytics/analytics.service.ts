// src/analytics/analytics.service.ts
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Product } from '../products/product.entity';
import { Sale } from '../sales/sale.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Product) private productsRepo: Repository<Product>,
    @InjectRepository(Sale) private salesRepo: Repository<Sale>,
  ) {}

  async getSalesSummary() {
    // Ví dụ: tính tổng doanh thu
    const sales = await this.salesRepo.find();
    return sales.reduce((sum, sale) => sum + Number(sale.total), 0);

  }
}
