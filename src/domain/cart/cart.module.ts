import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cart } from './entities/cart.entity';
import { CardModule } from 'src/domain/card/card.module';
import { CartItemModule } from 'src/domain/cart-item/cart-item.module';

@Module({
  imports: [TypeOrmModule.forFeature([Cart]), CardModule, CartItemModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
