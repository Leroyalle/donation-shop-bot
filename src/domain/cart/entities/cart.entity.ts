import { CartItem } from 'src/domain/cart-item/entities/cart-item.entity';
import { Order } from 'src/domain/order/entities/order.entity';
import { User } from 'src/domain/user/entities/user.entity';
import { Entity, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Cart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.cart)
  user: User;

  @OneToMany(() => CartItem, (cartItem) => cartItem.cart)
  cartItems: CartItem[];

  @OneToMany(() => Order, (order) => order.cart)
  orders: Order[];
}
