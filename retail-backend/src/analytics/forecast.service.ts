import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sale } from '../sales/sale.entity';

@Injectable()
export class ForecastService {
  constructor(
    @InjectRepository(Sale)
    private readonly salesRepo: Repository<Sale>,
  ) {}

  async forecastNext7Days(days = 7) {
    const rows = await this.salesRepo.query(`
      SELECT DATE(sold_at) AS date, SUM(total_price) AS revenue
      FROM sales
      GROUP BY DATE(sold_at)
      ORDER BY date
    `);

    if (rows.length < 2) return { message: 'Không đủ dữ liệu để dự đoán' };

    const X = rows.map((_, idx) => idx);
    const y = rows.map(r => Number(r.revenue));

    const n = X.length;
    const sumX = X.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = X.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = X.reduce((sum, xi) => sum + xi * xi, 0);

    const b = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX ** 2);
    const a = (sumY - b * sumX) / n;

    const forecasts: { day: number; predicted_revenue: number }[] = [];
    for (let i = 1; i <= days; i++) {
      const nextIndex = X.length + i - 1;
      forecasts.push({
        day: i,
        predicted_revenue: Math.round(a + b * nextIndex),
      });
    }

    return { forecasts };
  }
}
