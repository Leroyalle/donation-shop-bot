import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentWebhookService } from './services/payment-webhook.service';

@Module({
  controllers: [PaymentController],
  providers: [PaymentWebhookService],
})
export class PaymentInterfaceModule {}
