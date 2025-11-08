import { Module } from '@nestjs/common';
import { TelegramCoreUpdate } from './updates/telegram-core.update';
import { NestjsGrammyModule } from '@grammyjs/nestjs';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CardModule } from '../card/card.module';
import { UserModule } from 'src/user/user.module';
import { CartModule } from 'src/cart/cart.module';
import { PaymentModule } from 'src/payment/payment.module';
import { CartItemModule } from 'src/cart-item/cart-item.module';
import { TelegramService } from './services/telegram.service';
import { HttpClientModule } from 'src/http-client/http-client.module';
import { UiBuilderService } from './services/ui-builder.service';
import { TelegramCartService } from './services/telegram-cart.service';
import { AdditionalProductsService } from './services/additional-products.service';
import { CatalogService } from './services/catalog.service';
import { StartUpdate } from './updates/start.update';
import { AdditionalProductsUpdate } from './updates/additional-products.update';
import { CartUpdate } from './updates/cart.update';
import { CatalogUpdate } from './updates/catalog.update';

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
    StartUpdate,
    AdditionalProductsUpdate,
    CartUpdate,
    CatalogUpdate,
    TelegramService,
    UiBuilderService,
    TelegramCartService,
    AdditionalProductsService,
    CatalogService,
  ],
})
export class TelegramModule {}
