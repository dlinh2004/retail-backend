import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('sales-summary')
  getSalesSummary() {
    return this.analyticsService.getSalesSummary();
  }

  @Get('top-products')
  getTopProducts() {
    return this.analyticsService.getTopProducts();
  }

  @Get('recent-sales')
  getRecentSales() {
    return this.analyticsService.getRecentSales();
  }

  // ⭐ API FE đang cần
  @Get('forecast')
  getForecast() {
    return this.analyticsService.getForecast();
  }

  // Compatibility endpoint for frontend dashboard
  @Get('summary')
  getSummary() {
    return this.analyticsService.getSummary();
  }

  @Get('revenue/month')
  getRevenueByMonth(@Query('year') year?: string) {
    const y = year ? parseInt(year, 10) : undefined
    return this.analyticsService.getRevenueByMonth(y)
  }

  @Get('revenue/day')
  getRevenueByDays(@Query('days') days?: string) {
    const n = days ? parseInt(days, 10) : undefined
    return this.analyticsService.getRevenueByDays(n)
  }

  @Get('revenue/year')
  getRevenueByYear(@Query('years') years?: string) {
    const n = years ? parseInt(years, 10) : undefined
    return this.analyticsService.getRevenueByYear(n)
  }
}
