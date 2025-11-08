import { Module } from '@nestjs/common';
import { CartModule } from './cart/cart.module';
import { OrderModule } from './order/order.module';
import { PaymentModule } from './payment/payment.module';
import { UserModule } from './user/user.module';
import { CartItemModule } from './cart-item/cart-item.module';
import { CardModule } from './card/card.module';

@Module({
  imports: [
    CartModule,
    OrderModule,
    PaymentModule,
    UserModule,
    CartItemModule,
    CardModule,
  ],
  exports: [
    CartModule,
    OrderModule,
    PaymentModule,
    UserModule,
    CartItemModule,
    CardModule,
  ],
})
export class DomainModule {}
