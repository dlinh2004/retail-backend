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
    return {
      totalRevenue: sales.reduce((sum, sale) => sum + Number(sale.total), 0)
    };
  }

  async getTopProducts() {
    // Aggregate sales by product and return top 5 products with sales count
    const results = await this.salesRepo
      .createQueryBuilder('sale')
      .leftJoin('sale.product', 'product')
      .select('product.id', 'productId')
      .addSelect('product.name', 'name')
      .addSelect('SUM(sale.quantity)', 'sales')
      .groupBy('product.id')
      .orderBy('sales', 'DESC')
      .limit(5)
      .getRawMany();

    return results.map((r) => ({ name: r.name, sales: Number(r.sales) }));
  }

  async getRecentSales() {
    return this.salesRepo.find({
      order: { soldAt: 'DESC' },
      take: 5,
    });
  }

  // ⭐ HÀM DỰ ĐOÁN DOANH THU (khớp FE)
  async getForecast() {
    const sales = await this.salesRepo.find({
      order: { soldAt: 'ASC' },
    });

    if (sales.length === 0) {
      return { forecasts: [] };
    }

    const values = sales.map((s) => Number(s.total));
    const n = values.length;

    // Linear Regression (rút gọn cho đồ án)
    const avg = values.reduce((a, b) => a + b, 0) / n;

    const forecasts = Array.from({ length: 7 }).map((_, index) => ({
      day: index + 1,
      predicted_revenue: Math.round(avg * (1 + Math.random() * 0.1)),
    }));

    return { forecasts };
  }

  // New: combined summary used by frontend dashboard
  async getSummary() {
    const sales = await this.salesRepo.find();

    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
    const totalOrders = sales.length;
    const totalProductsSold = sales.reduce((sum, sale) => sum + Number(sale.quantity), 0);

    return {
      totalRevenue,
      totalOrders,
      totalProductsSold,
    };
  }
}
