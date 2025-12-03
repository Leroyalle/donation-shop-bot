import { createHash } from 'crypto';

interface CreateHashParams {
  EshopId: string | number;
  OrderId: string;
  ServiceName?: string;
  RecipientAmount: string;
  RecipientCurrency: string;
  UserName?: string;
  Email?: string;
  SuccessUrl?: string;
  BackUrl?: string;
  ResultUrl?: string;
  ExpireDate?: string;
  HoldMode?: string | number | null;
  Preference?: string;
  SignSecretKey: string;
}
export const createIntellectMoneyHash = (
  params: CreateHashParams,
  algo: 'sha256' | 'md5',
) => {
  const {
    EshopId,
    OrderId,
    ServiceName,
    RecipientAmount,
    RecipientCurrency,
    UserName,
    Email,
    SuccessUrl,
    BackUrl,
    ResultUrl,
    ExpireDate,
    HoldMode,
    Preference,
    SignSecretKey,
  } = params;

  const input = [
    EshopId, // 1
    OrderId, // 2
    ServiceName ?? '', // 3
    RecipientAmount, // 4
    RecipientCurrency, // 5
    UserName ?? '', // 6
    Email ?? '', // 7
    SuccessUrl ?? '', // 8
    '', // 9 failUrl (был пропущен)
    BackUrl ?? '', // 10
    ResultUrl ?? '', // 11
    ExpireDate ?? '', // 12
    HoldMode ?? '', // 13
    Preference ?? '', // 14
    SignSecretKey, // 15
  ].join('::');

  console.log('Length:', input.split('::').length);

  return createHash(algo).update(input, 'utf8').digest('hex');
};
