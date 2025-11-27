import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { Product } from "./product.entity"

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
  ) {}

  create(name: string, price: number, stock: number) {
    const product = this.productsRepository.create({ name, price, stock })
    return this.productsRepository.save(product)
  }

  async update(id: number, name: string, price: number, stock: number) {
    await this.productsRepository.update(id, { name, price, stock })
    return this.productsRepository.findOneBy({ id })
  }

  async delete(id: number) {
    await this.productsRepository.delete(id)
    return { message: "Product deleted successfully" }
  }

  findAll() {
    return this.productsRepository.find()
  }

  findOne(id: number) {
    return this.productsRepository.findOneBy({ id })
  }
}
