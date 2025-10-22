import { Cart } from 'src/cart/entities/cart.entity';
import { User } from 'src/user/entities/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  paymentId: string;

  @ManyToOne(() => User, (user) => user.orders)
  user: User;

  @Column()
  amount: number;

  @Column('jsonb')
  items: string;

  @OneToOne(() => Cart, (cart) => cart.order)
  @JoinColumn()
  cart: Cart;

  @Column()
  status: 'NEW' | 'CONFIRMED' | 'REJECTED';
}
