import { DynamicModule, Module } from '@nestjs/common';
import { PaymentService } from './services/payment.service';
import { PaymentController } from './payment.controller';
import { PAYMENT_CONFIG, TypeAsyncOptions } from './types/payment-config.type';
import { UserModule } from 'src/domain/user/user.module';
import { OrderModule } from 'src/domain/order/order.module';
import { CartItemModule } from 'src/domain/cart-item/cart-item.module';
import { CartModule } from 'src/domain/cart/cart.module';
import { HttpClientModule } from 'src/infrastructure/http-client/http-client.module';
import { PaymentConversationService } from './services/payment-conversation.service';
import { PaymentWebhookService } from './services/payment-webhook.service';

@Module({})
export class PaymentModule {
  static registerAsync(options: TypeAsyncOptions): DynamicModule {
    return {
      module: PaymentModule,
      imports: [
        UserModule,
        OrderModule,
        CartItemModule,
        CartModule,
        OrderModule,
        HttpClientModule,
      ],
      providers: [
        {
          useFactory: options.useFactory,
          provide: PAYMENT_CONFIG,
          inject: options.inject,
        },
        PaymentService,
        PaymentConversationService,
        PaymentWebhookService,
      ],
      controllers: [PaymentController],
      exports: [
        PaymentService,
        PaymentConversationService,
        PaymentWebhookService,
      ],
    };
  }
}
