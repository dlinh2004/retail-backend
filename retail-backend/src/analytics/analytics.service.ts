import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
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
      totalRevenue: sales.reduce((sum, sale) => sum + Number(sale.total), 0),
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
      .getRawMany<{ productId: number; name: string; sales: string }>();

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

  // Doanh thu theo tháng (return 12 months Jan..Dec for a specific year)
  async getRevenueByMonth(year?: number) {
    const y = year ?? new Date().getFullYear();

    // Build start/end for the year in UTC to avoid timezone shifting
    const start = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));

    const sales = await this.salesRepo.find({
      where: { soldAt: Between(start, end) },
    });

    // aggregate by month (1..12) using UTC month to be consistent
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      revenue: 0,
    }));
    sales.forEach((s) => {
      const dt = new Date(s.soldAt);
      const m = dt.getUTCMonth(); // 0..11
      months[m].revenue += Number(s.total);
    });

    return months;
  }

  // Doanh thu theo năm (last `years` years, including years with zero revenue)
  async getRevenueByYear(years = 5) {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - (years - 1);

    // Fetch sales between startYear-01-01 and currentYear-12-31 and aggregate by year
    const start = new Date(Date.UTC(startYear, 0, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999));

    const sales = await this.salesRepo.find({
      where: { soldAt: Between(start, end) },
    });

    // Prepare years map
    const yearsArr = Array.from({ length: years }, (_, i) => startYear + i);
    const byYear: Map<number, number> = new Map<number, number>(
      yearsArr.map((y): [number, number] => [y, 0]),
    );

    sales.forEach((s) => {
      const y = new Date(s.soldAt).getUTCFullYear();
      if (byYear.has(y)) byYear.set(y, (byYear.get(y) ?? 0) + Number(s.total));
    });

    return yearsArr.map((y) => ({ year: y, revenue: byYear.get(y) ?? 0 }));
  }

  // Doanh thu theo ngày - last `days` days (including zeros for days without sales)
  async getRevenueByDays(days = 7, startDate?: string) {
    const n = Number(days) || 7;

    // Build start/end range (UTC midnight) and fetch actual sales in range.
    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    let startUTCms: number;
    if (startDate) {
      const parts = startDate.split('-').map((p) => Number(p));
      const y = parts[0];
      const m = parts[1];
      const d = parts[2];
      startUTCms = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
    } else {
      const today = new Date();
      // use today's UTC date
      const y = today.getUTCFullYear();
      const m = today.getUTCMonth();
      const d = today.getUTCDate();
      startUTCms = Date.UTC(y, m, d, 0, 0, 0, 0) - (n - 1) * MS_PER_DAY;
    }

    const start = new Date(startUTCms);
    const end = new Date(startUTCms + n * MS_PER_DAY - 1);

    // For debugging: log the computed window
    console.debug(
      'getRevenueByDays window',
      start.toISOString(),
      end.toISOString(),
    );
    // Fetch sales in the date range and aggregate in JS to avoid timezone/date casting issues
    const sales = await this.salesRepo.find({
      where: { soldAt: Between(start, end) },
    });

    // Helper to format date as local ISO-like yyyy-mm-dd (no timezone)
    // format using UTC calendar date (no timezone)
    const formatLocalDate = (dt: Date) => {
      const yyyy = dt.getUTCFullYear();
      const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(dt.getUTCDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    // Create a map day -> revenue
    const sums: Map<string, number> = new Map<string, number>();
    for (let i = 0; i < n; i++) {
      const d = new Date(startUTCms + i * MS_PER_DAY);
      // use local yyyy-mm-dd as key (no timezone) for consistent matching)
      const key = formatLocalDate(d);
      sums.set(key, 0);
    }

    sales.forEach((s) => {
      const key = formatLocalDate(new Date(s.soldAt));
      sums.set(key, (sums.get(key) || 0) + Number(s.total));
    });

    // For debugging: show computed keys

    console.debug(
      'revenueByDays: start=',
      start,
      'end=',
      end,
      'keys=',
      Array.from(sums.keys()),
    );

    // Convert to array of rows in chronological order
    const rows = Array.from(sums.keys())
      .sort()
      .map((k) => ({ day: k, revenue: sums.get(k) || 0 }));

    return rows;
  }

  // New: combined summary used by frontend dashboard
  async getSummary() {
    // Single-query aggregation: total revenue, total products sold, and latest sale id
    const row = await this.salesRepo
      .createQueryBuilder('sale')
      .select('COALESCE(SUM(sale.total), 0)', 'totalRevenue')
      .addSelect('COALESCE(SUM(sale.quantity), 0)', 'totalProductsSold')
      .addSelect('COALESCE(MAX(sale.id), 0)', 'latestSaleId')
      .getRawOne<{
        totalRevenue: string | null;
        totalProductsSold: string | null;
        latestSaleId: string | null;
      }>();

    const totalRevenue = Number(row?.totalRevenue ?? 0);
    const totalProductsSold = Number(row?.totalProductsSold ?? 0);
    const latestSaleId = Number(row?.latestSaleId ?? 0);

    // compute month-over-month and year-over-year aggregates for percent change
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth(); // 0..11

    // current month UTC range
    const startCurrentMs = Date.UTC(y, m, 1, 0, 0, 0, 0);
    const endCurrentMs = Date.UTC(y, m + 1, 0, 23, 59, 59, 999);

    // previous month range
    const prevMonth = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
    prevMonth.setUTCMonth(prevMonth.getUTCMonth() - 1);
    const py = prevMonth.getUTCFullYear();
    const pm = prevMonth.getUTCMonth();
    const startPrevMs = Date.UTC(py, pm, 1, 0, 0, 0, 0);
    const endPrevMs = Date.UTC(py, pm + 1, 0, 23, 59, 59, 999);

    const startCurrent = new Date(startCurrentMs);
    const endCurrent = new Date(endCurrentMs);
    const startPrev = new Date(startPrevMs);
    const endPrev = new Date(endPrevMs);

    // current month aggregates
    const current = await this.salesRepo
      .createQueryBuilder('sale')
      .select('COALESCE(SUM(sale.total), 0)', 'revenue')
      .addSelect('COALESCE(SUM(sale.quantity), 0)', 'products')
      .addSelect('COUNT(*)', 'orders')
      .where('sale.soldAt BETWEEN :start AND :end', {
        start: startCurrent,
        end: endCurrent,
      })
      .getRawOne<{
        revenue: string | null;
        products: string | null;
        orders: string | null;
      }>();

    // previous month aggregates
    const prev = await this.salesRepo
      .createQueryBuilder('sale')
      .select('COALESCE(SUM(sale.total), 0)', 'revenue')
      .addSelect('COALESCE(SUM(sale.quantity), 0)', 'products')
      .addSelect('COUNT(*)', 'orders')
      .where('sale.soldAt BETWEEN :start AND :end', {
        start: startPrev,
        end: endPrev,
      })
      .getRawOne<{
        revenue: string | null;
        products: string | null;
        orders: string | null;
      }>();

    // year over year: this year vs last year
    const startYearThis = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
    const endYearThis = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
    const startYearPrev = new Date(Date.UTC(y - 1, 0, 1, 0, 0, 0, 0));
    const endYearPrev = new Date(Date.UTC(y - 1, 11, 31, 23, 59, 59, 999));

    const yearThis = await this.salesRepo
      .createQueryBuilder('sale')
      .select('COALESCE(SUM(sale.total), 0)', 'revenue')
      .where('sale.soldAt BETWEEN :start AND :end', {
        start: startYearThis,
        end: endYearThis,
      })
      .getRawOne<{ revenue: string | null }>();

    const yearPrev = await this.salesRepo
      .createQueryBuilder('sale')
      .select('COALESCE(SUM(sale.total), 0)', 'revenue')
      .where('sale.soldAt BETWEEN :start AND :end', {
        start: startYearPrev,
        end: endYearPrev,
      })
      .getRawOne<{ revenue: string | null }>();

    const currRevenue = Number(current?.revenue ?? 0);
    const prevRevenue = Number(prev?.revenue ?? 0);
    const currOrders = Number(current?.orders ?? 0);
    const prevOrders = Number(prev?.orders ?? 0);
    const currProducts = Number(current?.products ?? 0);
    const prevProducts = Number(prev?.products ?? 0);
    const thisYearRevenue = Number(yearThis?.revenue ?? 0);
    const lastYearRevenue = Number(yearPrev?.revenue ?? 0);

    const pctChange = (curr: number, prevVal: number) => {
      // If previous period has zero value, return 0 when both zero, otherwise return null
      // so frontend can display "N/A" (avoid misleading 100% when prev==0)
      if (prevVal === 0) return curr === 0 ? 0 : null;
      return ((curr - prevVal) / Math.abs(prevVal)) * 100;
    };

    const revenueChangePct = pctChange(currRevenue, prevRevenue);
    const ordersChangePct = pctChange(currOrders, prevOrders);
    const productsChangePct = pctChange(currProducts, prevProducts);
    const revenueYoYPct = pctChange(thisYearRevenue, lastYearRevenue);

    return {
      totalRevenue,
      totalOrders: latestSaleId,
      totalProductsSold,
      // monthly comparisons
      revenueThisMonth: currRevenue,
      revenuePrevMonth: prevRevenue,
      revenueChangePct,
      ordersThisMonth: currOrders,
      ordersPrevMonth: prevOrders,
      ordersChangePct,
      productsThisMonth: currProducts,
      productsPrevMonth: prevProducts,
      productsChangePct,
      // year over year
      revenueThisYear: thisYearRevenue,
      revenueLastYear: lastYearRevenue,
      revenueYoYPct,
    };
  }
}
