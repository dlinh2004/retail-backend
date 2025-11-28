import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CloudWatchMetricsService } from '../observability/cloudwatch-metrics.service';
import { CloudWatchLoggerService } from '../observability/cloudwatch-logger.service';

@Controller('sales')
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly metricsService: CloudWatchMetricsService,
    private readonly logger: CloudWatchLoggerService,
  ) {}

  @Post()
  async create(
    @Body() body: { productId: number; staffId: number; quantity: number },
  ) {
    this.logger.log(`Creating sale for product ${body.productId}`, 'SalesController');
    
    const result = await this.salesService.create(
      body.productId,
      body.staffId,
      body.quantity,
    );

    // Record business metric
    await this.metricsService.recordBusinessMetric('SaleCreated', 1, {
      ProductId: body.productId.toString(),
      Quantity: body.quantity.toString(),
    });

    return result;
  }

  @Get()
  async findAll() {
    this.logger.log('Fetching all sales', 'SalesController');
    return this.salesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.log(`Fetching sale with id ${id}`, 'SalesController');
    return this.salesService.findOne(+id);
  }
}
