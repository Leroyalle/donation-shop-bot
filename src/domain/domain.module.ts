import { Module } from '@nestjs/common';
import { CartModule } from './cart/cart.module';
import { OrderModule } from './order/order.module';
import { PaymentModule } from './payment/payment.module';
import { UserModule } from './user/user.module';
import { CartItemModule } from './cart-item/cart-item.module';
import { ProductModule } from './product/product.module';

@Module({
  imports: [
    CartModule,
    OrderModule,
    PaymentModule,
    UserModule,
    CartItemModule,
    ProductModule,
  ],
  exports: [
    CartModule,
    OrderModule,
    PaymentModule,
    UserModule,
    CartItemModule,
    ProductModule,
  ],
})
export class DomainModule {}
