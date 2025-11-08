import { Module } from '@nestjs/common';
import { TelegramModule } from './telegram/telegram.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardModule } from './domain/card/card.module';
import { CartModule } from './domain/cart/cart.module';
import { UserModule } from './domain/user/user.module';
import { CartItemModule } from './domain/cart-item/cart-item.module';
import { PaymentModule } from './domain/payment/payment.module';
import { OrderModule } from './domain/order/order.module';
import { HttpClientModule } from './http-client/http-client.module';
import { DomainModule } from './domain/domain.module';

@Module({
  imports: [
    TelegramModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: configService.get<string>('DB_TYPE') as any,
        host: configService.get<string>('DB_HOST'),
        port: parseInt(configService.get<string>('DB_PORT')!, 10),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        ssl: {
          rejectUnauthorized:
            configService.get<string>('DB_SSLMODE') === 'require',
        },
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
      }),
    }),
    // CardModule,
    // CartModule,
    // UserModule,
    // CartItemModule,
    // PaymentModule,
    // OrderModule,
    DomainModule,
    HttpClientModule,
  ],
  providers: [],
})
export class AppModule {}
