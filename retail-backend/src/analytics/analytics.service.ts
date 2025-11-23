import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Product } from '../products/product.entity';
import { Sale } from '../sales/sale.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
    @InjectRepository(Sale)
    private readonly salesRepo: Repository<Sale>,
  ) {}

  async getSalesSummary() {
    const sales = await this.salesRepo.find();
    return sales.reduce((sum, sale) => sum + Number(sale.total), 0);
  }

  async getTopProducts() {
    const products = await this.productsRepo.find();
    return products.slice(0, 5);
  }

 async getRecentSales() {
  return this.salesRepo.find({
  order: { soldAt: 'DESC' },
  take: 5,
});
}
}
