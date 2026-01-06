import { Module } from '@nestjs/common';
import { TelegramCoreUpdate } from './updates/telegram-core.update';
import { NestjsGrammyModule } from '@grammyjs/nestjs';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ProductModule } from '../../domain/product/product.module';
import { UserModule } from 'src/domain/user/user.module';
import { CartModule } from 'src/domain/cart/cart.module';
import { PaymentModule } from 'src/domain/payment/payment.module';
import { CartItemModule } from 'src/domain/cart-item/cart-item.module';
import { TelegramCoreService } from './services/telegram-core.service';
import { HttpClientModule } from 'src/infrastructure/http-client/http-client.module';
import { UiBuilderService } from './services/ui-builder.service';
import { TelegramCartService } from './services/telegram-cart.service';
import { AdditionalProductsService } from './services/additional-products.service';
import { CatalogService } from './services/catalog.service';
import { AdditionalProductsUpdate } from './updates/additional-products.update';
import { CartUpdate } from './updates/cart.update';
import { CatalogUpdate } from './updates/catalog.update';
import { SteamUpdate } from './updates/steam.update';
import { PaymentConversationService } from './services/payment-conversation/payment-conversation.service';
import { OrderModule } from 'src/domain/order/order.module';
import { SupportUpdate } from './updates/support.update';
import { SupportService } from './services/support.service';
import { KeysUpdate } from './updates/keys.update';
import { KeysPaymentConversationsService } from './services/payment-conversation/keys-payment-conversations.service';
import { ConversationHelpersService } from './services/payment-conversation/conversation-helpers.service';
import { KeysService } from './services/keys.service';
import { GameConversationService } from './services/payment-conversation/game-conversation.service';

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
    ProductModule,
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
    TelegramCoreService,
    UiBuilderService,
    SupportUpdate,
    SupportService,
    TelegramCartService,
    AdditionalProductsService,
    CatalogService,
    KeysUpdate,
    KeysService,
    KeysPaymentConversationsService,
    ConversationHelpersService,
    GameConversationService,
  ],
})
export class TelegramModule {}
