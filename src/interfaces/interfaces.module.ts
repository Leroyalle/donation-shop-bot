import { Module } from '@nestjs/common';
import { TelegramModule } from './telegram/telegram.module';
import { PaymentInterfaceModule } from './payment/payment.interface.module';

@Module({
  imports: [TelegramModule, PaymentInterfaceModule],
})
export class InterfacesModule {}
