import { Module } from '@nestjs/common';
import { TelegramUpdate } from './telegram.update';
import { NestjsGrammyModule } from '@grammyjs/nestjs';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CardModule } from '../card/card.module';
import { UserModule } from 'src/user/user.module';
import { CartModule } from 'src/cart/cart.module';
import { PaymentModule } from 'src/payment/payment.module';
import { CartItemModule } from 'src/cart-item/cart-item.module';
import { TelegramService } from './telegram.service';
import { MemorySessionStorage, session } from 'grammy';
import { HttpClientModule } from 'src/http-client/http-client.module';
import { conversations, createConversation } from '@grammyjs/conversations';
import { buyTopupConversation } from './lib/conversations/buy-topup.conversation';
import { steamPayConversation } from './lib/conversations/steam-pay.conversation';

@Module({
  imports: [
    ConfigModule.forRoot(),
    NestjsGrammyModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        token: configService.get<string>('TELEGRAM_BOT_TOKEN') as string,
        middlewares: [
          // session({
          //   initial: () => ({}),
          //   storage: new MemorySessionStorage(),
          // }),
          // conversations(),
          // createConversation(buyTopupConversation, 'buy-topup'),
          // createConversation(steamPayConversation, 'steam-pay'),
        ],
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
  providers: [TelegramUpdate, TelegramService],
})
export class TelegramModule {}
