import { Cart } from 'src/cart/entities/cart.entity';
import {
  Column,
  Entity,
  JoinColumn,
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

  @Column({ type: 'bigint', unique: true })
  telegramId: number;

  @OneToOne(() => Cart, (cart) => cart.user, { cascade: true, nullable: true })
  @JoinColumn()
  cart: Cart | null;
}
