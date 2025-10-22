import { FactoryProvider, ModuleMetadata } from '@nestjs/common';

export type PaymentConfig = {
  loginKey: string;
  secretKey: string;
};

export type TypeAsyncOptions = Pick<ModuleMetadata, 'imports'> &
  Pick<FactoryProvider<PaymentConfig>, 'useFactory' | 'inject'>;

export const PAYMENT_CONFIG = Symbol('PAYMENT_CONFIG');
