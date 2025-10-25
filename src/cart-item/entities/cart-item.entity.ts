import { Card } from 'src/card/entities/card.entity';
import { Cart } from 'src/cart/entities/cart.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  quantity: number;

  @ManyToOne(() => Card, (card) => card.cartItems)
  card: Card;

  @ManyToOne(() => Cart, (cart) => cart.cartItems)
  cart: Cart;

  @CreateDateColumn()
  createdAt: Date;
}
