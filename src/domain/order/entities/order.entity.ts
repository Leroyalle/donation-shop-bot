import { Cart } from 'src/domain/cart/entities/cart.entity';
import { User } from 'src/domain/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderType } from '../types/order-type.type';

@Entity()
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  paymentId: string | null;

  @ManyToOne(() => User, (user) => user.orders)
  user: User;

  @Column()
  amount: number;

  // TODO: поставить класс валидатор
  @Column({ nullable: true, type: 'varchar' })
  email: string | null;

  @Column({ nullable: true })
  tgUsername?: string;

  @Column({ nullable: true })
  steamName?: string;

  @Column('jsonb')
  items: string;

  @ManyToOne(() => Cart, (cart) => cart.orders, { nullable: true })
  @JoinColumn()
  cart: Cart | null;

  @Column()
  status: 'NEW' | 'CONFIRMED' | 'REJECTED';

  @Column({ default: 'CARD' })
  type: OrderType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
