import { Body, Controller, Post } from '@nestjs/common';
import { ICkassaPaymentWebhookData } from './types/ckassa-payment-status.type';
import { IPayDigitalWebhookData } from './types/pay-digital/pay-digital-webhook-data.type';
import { PaymentWebhookService } from './services/payment-webhook.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentWebhookService: PaymentWebhookService) {}

  @Post('ckassa-payment-status')
  async ckassaPaymentStatusWebhook(@Body() data: ICkassaPaymentWebhookData) {
    console.log('CKASSA WEBHOOK:', data);
    return await this.paymentWebhookService.ckassaPaymentStatusWebhook(data);
  }

  @Post('pay-digital-payment-status')
  async payDigitalPaymentStatusWebhook(@Body() data: IPayDigitalWebhookData) {
    console.log('PAYDIGITAL WEBHOOK:', data);
    return await this.paymentWebhookService.payDigitalPaymentStatusWebhook(
      data,
    );
  }
}
