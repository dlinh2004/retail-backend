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
    // perform sale creation and stock decrement in a single DB transaction
    const savedSale = await this.salesRepository.manager.transaction(async (manager) => {
      // lock the product row to avoid concurrent race conditions
      const product = await manager.findOne(Product, {
        where: { id: productId },
        lock: { mode: 'pessimistic_write' },
      });

      const staff = await manager.findOne(User, { where: { id: staffId } });

      if (!product || !staff) {
        throw new HttpException('Product or staff not found', HttpStatus.NOT_FOUND);
      }

      if (product.stock < quantity) {
        throw new HttpException('Insufficient stock', HttpStatus.BAD_REQUEST);
      }

      // decrement stock and persist
      product.stock = product.stock - quantity;
      await manager.save(Product, product);

      // create and save sale record
      const sale = manager.create(Sale, {
        product,
        staff,
        quantity,
        total: quantity * product.price,
      });

      return manager.save(Sale, sale);
    });

    // gửi message lên SQS (outside the DB transaction)
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
