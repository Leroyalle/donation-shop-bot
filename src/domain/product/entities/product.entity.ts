import { CartItem } from 'src/domain/cart-item/entities/cart-item.entity';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Region } from '../types/region.enum';
import { ProductType } from '../types/product-type.enum';
import { BadRequestException } from '@nestjs/common';

@Entity('product')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column()
  price: number;

  @Column({ type: 'enum', enum: Region, nullable: true })
  region?: Region;

  @BeforeInsert()
  @BeforeUpdate()
  validateStarRegion() {
    if (this.type === ProductType.STARS && this.region) {
      throw new BadRequestException('STAR products cannot have region');
    }
  }

  @Column({ type: 'enum', enum: ProductType })
  type: ProductType;

  @Column({ type: 'integer', nullable: true })
  quantity?: number;

  @Column()
  imageUrl: string;

  @OneToMany(() => CartItem, (cartItem) => cartItem.card)
  cartItems: CartItem[];

  @CreateDateColumn()
  createdAt: Date;
}
