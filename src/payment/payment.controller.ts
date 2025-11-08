import { Body, Controller, Post } from '@nestjs/common';
import { PaymentService } from './services/payment.service';
import { ICkassaPaymentWebhookData } from './types/ckassa-payment-status.type';
import { IPayDigitalWebhookData } from './types/pay-digital/pay-digital-webhook-data.type';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('ckassa-payment-status')
  async ckassaPaymentStatusWebhook(@Body() data: ICkassaPaymentWebhookData) {
    console.log('CKASSA WEBHOOK:', data);
    return await this.paymentService.ckassaPaymentStatusWebhook(data);
  }

  @Post('pay-digital-payment-status')
  async payDigitalPaymentStatusWebhook(@Body() data: IPayDigitalWebhookData) {
    console.log('PAYDIGITAL WEBHOOK:', data);
    return await this.paymentService.payDigitalPaymentStatusWebhook(data);
  }
}
