import { CartItem } from 'src/domain/cart-item/entities/cart-item.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Card {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column()
  price: number;

  @Column()
  imageUrl: string;

  @ManyToOne(() => CartItem, (cartItem) => cartItem.card)
  cartItems: CartItem[];

  @CreateDateColumn()
  createdAt: Date;

  // @Column('date')
  // createdAt: Date;
}
