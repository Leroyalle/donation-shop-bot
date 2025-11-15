import { Body, Controller, Post, Res } from '@nestjs/common';
import { PaymentWebhookService } from './services/payment-webhook.service';
import { ICkassaPaymentWebhookData } from 'src/domain/payment/types/ckassa-payment-status.type';
import { IPayDigitalWebhookData } from 'src/domain/payment/types/pay-digital-webhook-data.type';
import { Response } from 'express';
import { CreateSteamPaymentDto } from './dto/create-steam-payment.dto';
import { SteamPaymentService } from './services/steam-payment.service';

@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentWebhookService: PaymentWebhookService,
    private readonly steamPaymentService: SteamPaymentService,
  ) {}

  @Post('ckassa-payment-status')
  public async ckassaPaymentStatusWebhook(
    @Body() data: ICkassaPaymentWebhookData,
    @Res() res: Response,
  ) {
    // console.log('CKASSA WEBHOOK:', data);
    return await this.paymentWebhookService.ckassaPaymentStatusWebhook(
      data,
      res,
    );
  }

  @Post('pay-digital-payment-status')
  public async payDigitalPaymentStatusWebhook(
    @Body() data: IPayDigitalWebhookData,
  ) {
    // console.log('PAYDIGITAL WEBHOOK:', data);
    return await this.paymentWebhookService.payDigitalPaymentStatusWebhook(
      data,
    );
  }

  @Post('create-steam-pay')
  public async createSteamPay(
    @Body() input: CreateSteamPaymentDto,
    @Res() res: Response,
  ) {
    return await this.steamPaymentService.handleSteamPay(input, res);
  }
}
