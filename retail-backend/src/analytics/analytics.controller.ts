import { Controller, Get } from '@nestjs/common';
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
}
