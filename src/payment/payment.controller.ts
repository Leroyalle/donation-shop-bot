import { Body, Controller, Post } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentWebhookData } from './types/payment-status.type';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('payment-status')
  async paymentStatusWebhook(@Body() data: PaymentWebhookData) {
    console.log('TINKOFF WEBHOOK:', data);
    return await this.paymentService.paymentStatusWebhook(data);
  }
}
