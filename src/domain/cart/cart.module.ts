import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cart } from './entities/cart.entity';
import { ProductModule } from 'src/domain/product/product.module';
import { CartItemModule } from 'src/domain/cart-item/cart-item.module';

@Module({
  imports: [TypeOrmModule.forFeature([Cart]), ProductModule, CartItemModule],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
