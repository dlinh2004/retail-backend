import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  // Chỉ admin mới tạo sản phẩm
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  create(@Body() body: { name: string; price: number; stock: number }) {
    return this.productsService.create(body.name, body.price, body.stock);
  }

  // Ai cũng có thể xem danh sách sản phẩm
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.productsService.findAll();
  }

  // Ai cũng có thể xem chi tiết sản phẩm
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(+id);
  }
}
