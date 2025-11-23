import { Controller, Get, Query } from '@nestjs/common';
import { ForecastService } from './forecast.service';

@Controller('analytics')
export class ForecastController {
  constructor(private readonly forecastService: ForecastService) {}

  @Get('forecast')
  async forecast() {
    return this.forecastService.forecastNext7Days(7);
  }

  @Get('predict')
  async predict(@Query('days') days: string) {
    const numDays = days ? parseInt(days, 10) : 7;
    return this.forecastService.forecastNext7Days(numDays);
  }
}
