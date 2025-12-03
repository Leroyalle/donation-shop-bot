import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  CKASSA_PAYMENT_URL,
  INTELLECT_MONEY_PAYMENT_URL,
  PAY_DIGITAL_PAYMENT_URL,
} from 'src/shared/constants/api-paths';
@Injectable()
export class HttpClientService {
  private readonly ckassa: AxiosInstance;
  private readonly payDigital: AxiosInstance;
  private readonly intellectMoney: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.ckassa = axios.create({
      baseURL: CKASSA_PAYMENT_URL,
      headers: {
        'Content-Type': 'application/json',
        ApiLoginAuthorization: configService.getOrThrow<string>('LOGIN'),
        ApiAuthorization: configService.getOrThrow<string>('SECRET'),
      },
    });

    this.payDigital = axios.create({
      baseURL: PAY_DIGITAL_PAYMENT_URL.v2,
      headers: {
        Authorization: `Bearer ${this.configService.getOrThrow('PAYDIGITAL_TOPUP')}`,
        'X-Partner-ID':
          this.configService.getOrThrow<string>('PAYDIGITAL_STEAM'),
      },
    });

    this.intellectMoney = axios.create({
      baseURL: INTELLECT_MONEY_PAYMENT_URL,
      headers: {
        Authorization: `Bearer ${this.configService.getOrThrow('INTELLECT_MONEY_TOKEN')}`,
      },
    });
  }

  public get ckassaInstance() {
    return this.ckassa;
  }

  public get payDigitalInstance() {
    return this.payDigital;
  }

  public get intellectMoneyInstance() {
    return this.intellectMoney;
  }
}
