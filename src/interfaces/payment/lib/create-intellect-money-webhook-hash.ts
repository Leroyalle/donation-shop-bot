import { createHash } from 'crypto';

interface WebhookHashParams {
  EshopId: string | number;
  OrderId: string;
  ServiceName?: string;
  EshopAccount: string | number;
  RecipientAmount: string | number;
  RecipientCurrency: string;
  PaymentStatus: string | number;
  UserName?: string;
  UserEmail?: string;
  PaymentData: string; // формат: '2025-12-04 01:38:41'
  SecretKey: string;
}

export const createIntellectMoneyWebhookHash = (
  params: WebhookHashParams,
  algo: 'md5' | 'sha256' = 'md5',
) => {
  const {
    EshopId,
    OrderId,
    ServiceName,
    EshopAccount,
    RecipientAmount,
    RecipientCurrency,
    PaymentStatus,
    UserName,
    UserEmail,
    PaymentData,
    SecretKey,
  } = params;

  const input = [
    EshopId ?? '',
    OrderId ?? '',
    ServiceName ?? '',
    EshopAccount ?? '',
    RecipientAmount ?? '',
    RecipientCurrency ?? '',
    PaymentStatus ?? '',
    UserName ?? '',
    UserEmail ?? '',
    PaymentData ?? '',
    SecretKey ?? '',
  ].join('::');

  return createHash(algo).update(input, 'utf8').digest('hex');
};
