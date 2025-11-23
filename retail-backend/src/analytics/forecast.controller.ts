import { Controller, Get } from '@nestjs/common';
import { ForecastService } from './forecast.service';

@Controller('analytics')
export class ForecastController {
  constructor(private readonly forecastService: ForecastService) {}

  @Get('forecast')
  async forecast() {
    return this.forecastService.forecastNext7Days();
  }
}
