import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentWebhookService } from './services/payment-webhook.service';
import { OrderModule } from 'src/domain/order/order.module';
import { CartModule } from 'src/domain/cart/cart.module';
import { CartItemModule } from 'src/domain/cart-item/cart-item.module';

@Module({
  imports: [OrderModule, CartModule, CartItemModule],
  controllers: [PaymentController],
  providers: [PaymentWebhookService],
})
export class PaymentInterfaceModule {}
