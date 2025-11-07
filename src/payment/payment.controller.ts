import { Body, Controller, Post } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { ICkassaPaymentWebhookData } from './types/payment-status.type';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('ckassa-payment-status')
  async ckassaPaymentStatusWebhook(@Body() data: ICkassaPaymentWebhookData) {
    console.log('TINKOFF WEBHOOK:', data);
    return await this.paymentService.ckassaPaymentStatusWebhook(data);
  }
}
