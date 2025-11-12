import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateSteamPaymentDto } from '../dto/create-steam-payment.dto';
import { Response } from 'express';
import { HttpClientService } from 'src/infrastructure/http-client/http-client.service';
import { PAY_DIGITAL_PAYMENT_ENDPOINTS } from 'src/shared/constants/api-paths';
import { TSteamCheckResult } from 'src/shared/types/steam/steam-check-result.type';
import { UserService } from 'src/domain/user/user.service';
import { OrderService } from 'src/domain/order/order.service';
import { UserSource } from 'src/shared/types/user/user-sourse.enum';
import { ISteamPayRequest } from 'src/shared/types/steam/steam-pay-request.type';
import { increasePriceByPercent } from 'src/shared/lib/increase-price-by-percent.lib';
import { TSteamPayResult } from 'src/shared/types/steam/steam-pay-result.type';

@Injectable()
export class SteamPaymentService {
  constructor(
    private readonly httpClientService: HttpClientService,
    private readonly userService: UserService,
    private readonly orderService: OrderService,
  ) {}

  public async handleSteamPay(dto: CreateSteamPaymentDto, res: Response) {
    try {
      const { data: checkResult } =
        await this.httpClientService.payDigitalInstance.post<TSteamCheckResult>(
          PAY_DIGITAL_PAYMENT_ENDPOINTS.steamCheck,
          { steamUsername: dto.nickname },
        );

      if (checkResult.status === 'error') {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'steam_error',
          message: `❌ Произошла ошибка. ${checkResult.message}`,
        });
      }

      let user = await this.userService.findUserByUsername(dto.tgUserName);
      if (!user) {
        user = await this.userService.create({
          cart: null,
          name: dto.name,
          username: dto.tgUserName,
          source: UserSource.WEB,
          orders: [],
        });
      }

      const order = await this.orderService.create({
        amount: dto.amount,
        cart: null,
        user,
        type: 'STEAM',
        status: 'NEW',
        email: dto.email,
        paymentId: checkResult.transactionId,
        items: '',
      });

      const payData: ISteamPayRequest = {
        transactionId: checkResult.transactionId,
        netAmount: dto.amount,
        amount: increasePriceByPercent(dto.amount),
        currency: 'RUB',
        directSuccess: false,
        orderId: order.id,
        steamUsername: dto.nickname,
      };

      const { data: payResult } =
        await this.httpClientService.payDigitalInstance.post<TSteamPayResult>(
          PAY_DIGITAL_PAYMENT_ENDPOINTS.steamPay,
          payData,
        );

      if (payResult?.status === 'error') {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'steam_error',
          message: `❌ Произошла ошибка. ${payResult.message}`,
        });
      }

      await this.orderService.update(order.id, {
        paymentId: payResult.sbpTransactionUuid,
      });

      return res.status(HttpStatus.OK).json({ success: true, data: payResult });
    } catch {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'internal_error',
        message: 'Не удалось выполнить запрос к PayDigital',
      });
    }
  }
}
