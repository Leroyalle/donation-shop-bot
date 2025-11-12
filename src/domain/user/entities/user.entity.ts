import { Cart } from 'src/domain/cart/entities/cart.entity';
import { Order } from 'src/domain/order/entities/order.entity';
import { UserSource } from 'src/shared/types/user/user-sourse.enum';
import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  username?: string;

  @Column({ type: 'bigint', unique: true, nullable: true })
  telegramId?: number;

  @OneToOne(() => Cart, (cart) => cart.user, { cascade: true, nullable: true })
  @JoinColumn()
  cart: Cart | null;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @Column({
    type: 'enum',
    enum: UserSource,
    default: UserSource.WEB,
  })
  source: UserSource;
}
