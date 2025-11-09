import { Module } from '@nestjs/common';
import { TelegramCoreUpdate } from './updates/telegram-core.update';
import { NestjsGrammyModule } from '@grammyjs/nestjs';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CardModule } from '../../domain/card/card.module';
import { UserModule } from 'src/domain/user/user.module';
import { CartModule } from 'src/domain/cart/cart.module';
import { PaymentModule } from 'src/domain/payment/payment.module';
import { CartItemModule } from 'src/domain/cart-item/cart-item.module';
import { TelegramService } from './services/telegram.service';
import { HttpClientModule } from 'src/infrastructure/http-client/http-client.module';
import { UiBuilderService } from './services/ui-builder.service';
import { TelegramCartService } from './services/telegram-cart.service';
import { AdditionalProductsService } from './services/additional-products.service';
import { CatalogService } from './services/catalog.service';
import { AdditionalProductsUpdate } from './updates/additional-products.update';
import { CartUpdate } from './updates/cart.update';
import { CatalogUpdate } from './updates/catalog.update';
import { SteamUpdate } from './updates/steam.update';
import { TopupUpdate } from './updates/topup.update';
import { PaymentConversationService } from './services/payment-conversation.service';
import { OrderModule } from 'src/domain/order/order.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    NestjsGrammyModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        token: configService.get<string>('TELEGRAM_BOT_TOKEN') as string,
      }),
    }),
    CardModule,
    UserModule,
    OrderModule,
    HttpClientModule,
    CartModule,
    PaymentModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          secretKey: configService.get<string>('SECRET') as string,
          loginKey: configService.get<string>('LOGIN') as string,
        };
      },
    }),
    CartItemModule,
  ],
  providers: [
    TelegramCoreUpdate,
    SteamUpdate,
    AdditionalProductsUpdate,
    CartUpdate,
    PaymentConversationService,
    CatalogUpdate,
    TopupUpdate,
    TelegramService,
    UiBuilderService,
    TelegramCartService,
    AdditionalProductsService,
    CatalogService,
  ],
})
export class TelegramModule {}
