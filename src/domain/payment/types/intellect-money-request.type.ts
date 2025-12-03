export enum RecipientCurrency {
  RUB = 'RUB',
  RUR = 'RUR',
  TST = 'TST',
  USD = 'USD',
  EUR = 'EUR',
}

export enum PaymentPreference {
  BankCard = 'BankCard',
  BNPL = 'BNPL',
  Sbp = 'Sbp',
  MirPay = 'MirPay',
  SberPay = 'SberPay',
  GazpromPay = 'GazpromPay',
}

export enum RecurringType {
  Activate = 'Activate',
}

export interface MerchantReceipt {
  // структура зависит от твоей кассы, сюда вставишь свою
  [key: string]: unknown;
}

export interface SplitInvoiceData {
  // структура зависит от API
  [key: string]: unknown;
}

export interface CreateInvoiceRequest {
  /** REQUIRED, int, max 6 */
  EshopId: number;

  /** REQUIRED, string, max 50 */
  OrderId: string;

  /** OPTIONAL, string, max 1024 */
  ServiceName?: string;

  /** REQUIRED, decimal string: "123.45", max 13 */
  RecipientAmount: string;

  /** REQUIRED, enum */
  RecipientCurrency: RecipientCurrency;

  /** OPTIONAL, max 255 */
  UserName?: string;

  /** REQUIRED, max 100 */
  Email?: string;

  /** OPTIONAL, max 512 */
  SuccessUrl?: string;

  /** OPTIONAL, max 512 */
  BackUrl?: string;

  /** OPTIONAL, max 512 */
  ResultUrl?: string;

  /**

* CONDITION: yyyy-MM-dd HH:mm:ss
* Обязателен, если HoldMode = 1
  */
  ExpireDate?: string;

  /**

* OPTIONAL, BOOLEAN
* 1 = холдирование
* 0 = нет
* null = по настройкам магазина
  */
  HoldMode?: 0 | 1 | null;

  /**

* CONDITION: int 1–119
* Обязателен, если HoldMode = 1
  */
  HoldTime?: number;

  /**

* CONDITION: обязательный при включённой онлайн-кассе
  */
  MerchantReceipt?: MerchantReceipt;

  /**

* OPTIONAL, const list
* Пример: "BankCard,SberPay,MirPay"
  */
  Preference?: PaymentPreference | `${PaymentPreference},${string}`;

  /** OPTIONAL */
  SplitInvoiceData?: SplitInvoiceData;

  /**

* CONDITION: обязательный при рекуррентных платежах
  */
  RecurringType?: RecurringType;

  /**

* CONDITION: обязательный если включена опция "Требовать подпись данных запроса"
  */
  PurchaseHash?: string;

  /** REQUIRED */
  Hash: string;
}
