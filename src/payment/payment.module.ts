import { DynamicModule, Module } from '@nestjs/common';
import { PaymentService } from './services/payment.service';
import { PaymentController } from './payment.controller';
import { PAYMENT_CONFIG, TypeAsyncOptions } from './types/payment-config.type';
import { UserModule } from 'src/user/user.module';
import { OrderModule } from 'src/order/order.module';
import { CartItemModule } from 'src/cart-item/cart-item.module';
import { CartModule } from 'src/cart/cart.module';
import { HttpClientModule } from 'src/http-client/http-client.module';
import { PaymentConversationService } from './services/payment-conversation.service';

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
      ],
      controllers: [PaymentController],
      exports: [PaymentService, PaymentConversationService],
    };
  }
}
