export class IntellectMoneyWebhookDto {
  /** Номер магазина */
  // @IsNumber()
  EshopId: number; // INT, required

  /** Номер СКО (3xxxxxxxxx) */
  // @IsString()
  PaymentId: number; // LONG, required

  /** Внутренний номер покупки */
  // @IsString()
  OrderId: string; // STRING, required, max 50

  /** Номер счёта магазина */
  // @IsString()
  EshopAccount: number; // LONG, required

  /** Назначение платежа (описание товара/услуги) */
  ServiceName?: string; // STRING, optional, max 1024

  /** Исходная сумма платежа */
  RecipientOriginalAmount: number; // DECIMAL, required

  /** Сумма платежа */
  RecipientAmount: number; // DECIMAL, required

  /** Сумма возврата */
  RefundAmount?: number; // DECIMAL, optional

  /** Валюта платежа */
  RecipientCurrency: RecipientCurrency; // STRING, required

  /** Статус платежа */
  PaymentStatus: PaymentStatus; // INT, required

  /** Имя покупателя */
  UserName?: string; // STRING, optional, max 255

  /** Email покупателя */
  UserEmail: string; // STRING, required

  /** Дата последнего события (yyyy-MM-dd HH:mm:ss) */
  PaymentData: string; // STRING, required

  /** Способ оплаты */
  PayMethod?: PayMethod; // STRING, optional

  /** Короткий PAN */
  ShortPan?: string; // STRING, optional, max 22

  /** Страна карты (ISO 3166-1 alpha-3) */
  Country?: string; // STRING, optional, max 3

  /** Банк-эмитент */
  Bank?: string; // STRING, optional, max 100

  /** IPv4 адрес пользователя */
  IpAddress?: string; // STRING, optional, max 15

  /** Секретный ключ (если передаётся) */
  SecretKey?: string; // STRING, optional

  /** Название шлюза */
  GatewayName?: string; // STRING, optional, max 50

  /**
   * Статус операции по расписанию (recurring)
   * Передаётся только для операций по расписанию
   */
  RecurringState?: RecurringState; // STRING, conditional

  /**
   * Исходный СКО
   * Передаётся только для операций по расписанию
   */
  SourceInvoiceId?: number; // LONG, conditional

  /** Контрольная подпись */
  Hash: string; // STRING, required
}

/* =========================
      ENUMS / CONSTANTS
   ========================= */

export type RecipientCurrency = 'RUB' | 'RUR' | 'TST' | 'USD' | 'EUR';

export enum PaymentStatus {
  Created = 3, // создан
  Canceled = 4, // отменён
  Paid = 5, // оплачен
  Hold = 6, // захолдирован
  PartiallyPaid = 7, // частично оплачен
  Refunded = 8, // возврат
}

export type PayMethod =
  | 'Acquiring'
  | 'TestAcquiring'
  | 'PremiumCardAcquiring'
  | 'ForeignAcquiring'
  | 'BNPL'
  | 'Sbp'
  | 'MirPay'
  | 'SberPay'
  | 'YandexPay'
  | 'GazpromPay'
  | 'QiwiWallet';

export type RecurringState = 'Activated';
