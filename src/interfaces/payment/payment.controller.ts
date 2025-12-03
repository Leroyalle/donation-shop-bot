import { Body, Controller, HttpCode, Post, Res } from '@nestjs/common';
import { PaymentWebhookService } from './services/payment-webhook.service';
import { ICkassaPaymentWebhookData } from 'src/domain/payment/types/ckassa-payment-status.type';
import { IPayDigitalWebhookData } from 'src/domain/payment/types/pay-digital-webhook-data.type';
import { Response } from 'express';
import { CreateSteamPaymentDto } from './dto/create-steam-payment.dto';
import { SteamPaymentService } from './services/steam-payment.service';
import { IntellectMoneyWebhookDto } from './dto/intellect-money-payment-webhook.dto';

@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentWebhookService: PaymentWebhookService,
    private readonly steamPaymentService: SteamPaymentService,
  ) {}

  // @Post('ckassa-payment-status')
  // public async ckassaPaymentStatusWebhook(
  //   @Body() data: ICkassaPaymentWebhookData,
  //   @Res({ passthrough: true }) res: Response,
  // ) {
  //   // console.log('CKASSA WEBHOOK:', data);
  //   return await this.paymentWebhookService.ckassaPaymentStatusWebhook(
  //     data,
  //     res,
  //   );
  // }

  @Post('pay-digital-payment-status')
  public async payDigitalPaymentStatusWebhook(
    @Body() data: IPayDigitalWebhookData,
    @Res({ passthrough: true }) res: Response,
  ) {
    // console.log('PAYDIGITAL WEBHOOK:', data);
    return await this.paymentWebhookService.payDigitalPaymentStatusWebhook(
      data,
      res,
    );
  }

  @HttpCode(200)
  @Post('intellect-money-payment-status')
  public async intellectMoneyPaymentStatusWebhook(
    @Body() data: IntellectMoneyWebhookDto,
  ) {
    console.log('INTELLECT_MONEY_WEBHOOK', data);
    return await this.paymentWebhookService.intellectMoneyPaymentStatusWebhook(
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
