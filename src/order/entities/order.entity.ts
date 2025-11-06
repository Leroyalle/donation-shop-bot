import { Cart } from 'src/cart/entities/cart.entity';
import { User } from 'src/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

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

  @Column('jsonb')
  items: string;

  @ManyToOne(() => Cart, (cart) => cart.orders, { nullable: true })
  @JoinColumn()
  cart: Cart | null;

  @Column()
  status: 'NEW' | 'CONFIRMED' | 'REJECTED';

  @Column({ default: 'CARD' })
  type: 'TOPUP' | 'STEAM' | 'CARD';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
