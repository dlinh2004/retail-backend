import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from '../products/product.entity';
import { User } from '../users/user.entity';

@Entity()
export class Sale {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Product)
  @JoinColumn()
  product: Product;

  @ManyToOne(() => User)
  @JoinColumn()
  staff: User;

  @Column('int')
  quantity: number;

  @Column('float')
total: number;
}
