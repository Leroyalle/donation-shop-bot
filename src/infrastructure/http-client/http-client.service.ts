import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  CKASSA_PAYMENT_URL,
  PAY_DIGITAL_PAYMENT_URL,
} from 'src/shared/constants/api-paths';
@Injectable()
export class HttpClientService {
  private readonly ckassa: AxiosInstance;
  private readonly payDigital: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.ckassa = axios.create({
      baseURL: CKASSA_PAYMENT_URL,
      headers: {
        'Content-Type': 'application/json',
        ApiLoginAuthorization: configService.get<string>('LOGIN') as string,
        ApiAuthorization: configService.get<string>('SECRET') as string,
      },
    });

    this.payDigital = axios.create({
      baseURL: PAY_DIGITAL_PAYMENT_URL.v2,
      headers: {
        Authorization: `Bearer ${this.configService.get('PAYDIGITAL_TOKEN')}`,
      },
    });
  }

  public get ckassaInstance() {
    return this.ckassa;
  }

  public get payDigitalInstance() {
    return this.payDigital;
  }
}
