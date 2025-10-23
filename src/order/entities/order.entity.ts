import { Cart } from 'src/cart/entities/cart.entity';
import { User } from 'src/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
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

  @Column('jsonb')
  items: string;

  @OneToOne(() => Cart, (cart) => cart.order)
  @JoinColumn()
  cart: Cart;

  @Column()
  status: 'NEW' | 'CONFIRMED' | 'REJECTED';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
