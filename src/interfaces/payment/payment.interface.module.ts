import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentWebhookService } from './services/payment-webhook.service';
import { OrderModule } from 'src/domain/order/order.module';
import { CartModule } from 'src/domain/cart/cart.module';
import { CartItemModule } from 'src/domain/cart-item/cart-item.module';
import { PaymentNotificationsService } from './services/payment-notification.service';
import { SteamPaymentService } from './services/steam-payment.service';
import { UserModule } from 'src/domain/user/user.module';
import { HttpClientModule } from 'src/infrastructure/http-client/http-client.module';

@Module({
  imports: [
    OrderModule,
    CartModule,
    CartItemModule,
    UserModule,
    HttpClientModule,
  ],
  controllers: [PaymentController],
  providers: [
    PaymentWebhookService,
    PaymentNotificationsService,
    SteamPaymentService,
  ],
})
export class PaymentInterfaceModule {}
