import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
@Injectable()
export class HttpClientService {
  private readonly ckassa: AxiosInstance;
  private readonly payDigital: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.ckassa = axios.create({
      baseURL: this.configService.get('CKASSA_URL'),
      headers: {
        'Content-Type': 'application/json',
        ApiLoginAuthorization: configService.get<string>('LOGIN') as string,
        ApiAuthorization: configService.get<string>('SECRET') as string,
      },
    });

    this.payDigital = axios.create({
      baseURL: this.configService.get('PAYDIGITAL_URL'),
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
