import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sale } from './sale.entity';
import { Product } from '../products/product.entity';
import { User } from '../users/user.entity';
import { SqsProducer } from './sqs.producer'; // <-- thêm import này

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private salesRepository: Repository<Sale>,

    @InjectRepository(Product)
    private productRepository: Repository<Product>,

    @InjectRepository(User)
    private userRepository: Repository<User>,

    private readonly sqsProducer: SqsProducer, // <-- inject SqsProducer
  ) {}

  async create(productId: number, staffId: number, quantity: number) {
    const product = await this.productRepository.findOneBy({ id: productId });
    const staff = await this.userRepository.findOneBy({ id: staffId });

    if (!product || !staff) {
       throw new HttpException('Product or staff not found', HttpStatus.NOT_FOUND);
    }

    const sale = this.salesRepository.create({
      product,
      staff,
      quantity,
      total: quantity * product.price,
    });

    const savedSale = await this.salesRepository.save(sale);

    // gửi message lên SQS
    await this.sqsProducer.sendSaleEvent({
      event: 'sale.created',
      data: savedSale,
    });

    return savedSale;
  }

  findAll() {
    return this.salesRepository.find({ relations: ['product', 'staff'] });
  }

  findOne(id: number) {
    return this.salesRepository.findOne({
      where: { id },
      relations: ['product', 'staff'],
    });
  }
}
