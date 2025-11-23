// src/analytics/analytics.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ForecastService } from './forecast.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly forecastService: ForecastService) {}

  @Get('summary')
  async getSummary() {
    return this.forecastService.forecastNext7Days();
  }
}
